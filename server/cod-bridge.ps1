# cod-bridge.ps1
# Runs on the Windows Server box. Listens locally, gets exposed to the
# internet only via the Cloudflare Tunnel (cloudflared), never directly.
#
# Install as a service with NSSM so it survives reboots:
#   nssm install CodBridge "C:\Program Files\PowerShell\7\pwsh.exe" "-File C:\GameServers\rcon-bridge\cod-bridge.ps1"

$Port = 9100
$RconHost = "127.0.0.1"
$RconPort = 28960
$RconPassword = "your-strong-rcon-password"   # match server.cfg
$SharedSecret = "your-shared-secret-here"      # must match BRIDGE_SHARED_SECRET on Vercel


function Send-Rcon {
    param(
        [string]$HostAddress = $RconHost,
        [int]$Port = $RconPort,
        [string]$Password = $RconPassword,
        [string]$Command,
        [int]$WaitMs = 800
    )
    $client = New-Object System.Net.Sockets.UdpClient
    $client.Client.ReceiveTimeout = $WaitMs
    $prefix = [byte[]](0xFF, 0xFF, 0xFF, 0xFF)
    $body = [System.Text.Encoding]::ASCII.GetBytes("rcon $Password $Command")
    $packet = $prefix + $body
    $client.Send($packet, $packet.Length, $HostAddress, $Port) | Out-Null

    $result = $null
    try {
        $remoteEP = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any, 0)
        $response = $client.Receive([ref]$remoteEP)
        $result = [System.Text.Encoding]::ASCII.GetString($response)
    } catch {
        # timed out waiting for a reply - leave $result as $null
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
                Send-Rcon -Command "map $mapName" -WaitMs 300 | Out-Null
                $result = @{ ok = $true; map = $mapName }
            }
            "/api/rotate" {
                Send-Rcon -Command "map_rotate" -WaitMs 300 | Out-Null
                $result = @{ ok = $true }
            }
            "/api/settings" {
                $dvar = $body.dvar
                $value = $body.value
                Send-Rcon -Command "set $dvar `"$value`"" -WaitMs 300 | Out-Null
                $result = @{ ok = $true; dvar = $dvar; value = $value }
            }
            "/api/status" {
                $status = Send-Rcon -Command "status" -WaitMs 800
                $mapName = "unknown"
                $playerCount = 0
                if ($status) {
                    if ($status -match "map:\s*(\S+)") {
                        $mapName = $matches[1]
                    }
                    # Count player lines: lines that start with a numeric client slot
                    $playerLines = ($status -split "`n") | Where-Object { $_ -match "^\s*\d+\s+\d+\s+\d+\s+" }
                    $playerCount = $playerLines.Count
                }
                $result = @{
                    online  = [bool]$status
                    raw     = $status
                    map     = $mapName
                    players = $playerCount
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
