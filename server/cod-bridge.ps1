# cod-bridge.ps1
# Runs on the Windows Server box. Listens locally, gets exposed to the
# internet only via the Cloudflare Tunnel (cloudflared), never directly.
#
# Install as a service with NSSM so it survives reboots:
#   nssm install CodBridge "C:\Program Files\PowerShell\7\pwsh.exe" "-File C:\GameServers\rcon-bridge\cod-bridge.ps1"

$Port = 9100
$RconHost = "127.0.0.1"
$RconPort = 28960
$RconPassword = "Eureka1!"   # match server.cfg
$SharedSecret = "PDdsHlJn3ZVfi/jQjvuESY9QEDQ4qGUuV9CMyn7cxKw="      # must match BRIDGE_SHARED_SECRET on Vercel

function Send-Rcon {
    param(
        [string]$HostAddress = $RconHost,
        [int]$Port = $RconPort,
        [string]$Password = $RconPassword,
        [string]$Command
    )
    $client = New-Object System.Net.Sockets.UdpClient
    $prefix = [byte[]](0xFF, 0xFF, 0xFF, 0xFF)
    $body = [System.Text.Encoding]::ASCII.GetBytes("rcon $Password $Command")
    $packet = $prefix + $body
    $client.Send($packet, $packet.Length, $HostAddress, $Port) | Out-Null
    Start-Sleep -Milliseconds 250
    $result = $null
    if ($client.Available -gt 0) {
        $remoteEP = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any, 0)
        $response = $client.Receive([ref]$remoteEP)
        $result = [System.Text.Encoding]::ASCII.GetString($response)
    }
    $client.Close()
    return $result
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Bridge listening on port $Port..."

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    try {
        # Auth check
        $secretHeader = $request.Headers["X-Bridge-Secret"]
        if ($secretHeader -ne $SharedSecret) {
            $response.StatusCode = 401
            $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"unauthorized"}')
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        $path = $request.Url.LocalPath
        $body = $null
        if ($request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream)
            $raw = $reader.ReadToEnd()
            if ($raw) { $body = $raw | ConvertFrom-Json }
        }

        $result = $null

        switch ($path) {
            "/api/map" {
                $mapName = $body.map
                Send-Rcon -Command "map $mapName" | Out-Null
                $result = @{ ok = $true; map = $mapName }
            }
            "/api/settings" {
                $dvar = $body.dvar
                $value = $body.value
                Send-Rcon -Command "set $dvar `"$value`"" | Out-Null
                $result = @{ ok = $true; dvar = $dvar; value = $value }
            }
            "/api/status" {
                $status = Send-Rcon -Command "status"
                $result = @{
                    online  = [bool]$status
                    raw     = $status
                    map     = "see raw"
                    players = "see raw"
                }
            }
            default {
                $response.StatusCode = 404
                $result = @{ error = "not found" }
            }
        }

        $json = $result | ConvertTo-Json -Compress
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    catch {
        $response.StatusCode = 500
        $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"internal error"}')
        $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
    }
    finally {
        $response.Close()
    }
}
