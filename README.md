# Eureka Home Server — Control Panel

A small website for you and your friends to change the map and match
settings on your IW4x CoD MW2 server, deployed on Vercel.

## How it fits together

```
[Browser] → [Vercel: this Next.js app] → [Cloudflare Tunnel] → [cod-bridge.ps1 on your Windows Server] → [RCON] → [IW4x server]
```

The website never talks to RCON directly — it calls your own API routes,
which call the PowerShell bridge on your server over HTTPS via Cloudflare
Tunnel. The RCON password and shared secret only ever live on the server
and in Vercel's environment variables, never in the browser.

## 1. Set up the server-side bridge

1. Copy `server/cod-bridge.ps1` to `C:\GameServers\rcon-bridge\` on your
   Windows Server box.
2. Edit the top of the script:
   - `$RconPassword` — must match `rcon_password` in your `server.cfg`
   - `$SharedSecret` — make up a long random string, you'll reuse this in Vercel
3. Install `cloudflared` on the server, then:
   ```
   cloudflared tunnel login
   cloudflared tunnel create cod-bridge
   ```
4. Point a subdomain at it, e.g. `cod-api.eureka-technologies.co.uk`,
   routing to `http://localhost:9100`.
5. Install both as Windows services with NSSM so they survive reboots:
   ```
   nssm install CodBridge "C:\Program Files\PowerShell\7\pwsh.exe" "-File C:\GameServers\rcon-bridge\cod-bridge.ps1"
   nssm install CloudflaredTunnel "C:\Program Files\cloudflared\cloudflared.exe" "tunnel run cod-bridge"
   ```

## 2. Deploy the website to Vercel

1. Push this folder to a GitHub repo.
2. Go to vercel.com → New Project → import the repo.
3. Under Environment Variables, add (copy from `.env.example`):
   - `CONTROL_API_URL`
   - `BRIDGE_SHARED_SECRET` (same value as in `cod-bridge.ps1`)
   - `ACCESS_CODE` (the passphrase you and your friends will type in)
4. Deploy.

Or from the command line:
```
npm install -g vercel
vercel deploy
```

## 3. Using it

Visit your Vercel URL, enter the access code, and you'll see:
- A map grid — click any map to load it immediately
- A settings panel — change gametype, score limit, time limit
- A live console log at the bottom echoing every command sent, like RCON output

## Local development

```
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

## Notes

- Give the access code only to friends you trust with server control —
  anyone with it can change maps and settings.
- If you ever want to rotate the access code, just change `ACCESS_CODE`
  in Vercel and redeploy; everyone's existing session cookie stops working.
