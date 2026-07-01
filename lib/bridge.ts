// lib/bridge.ts
// Server-only helper. Never imported into client components.
// Talks to the PowerShell API on your Windows Server box via the
// Cloudflare Tunnel hostname you configured (e.g. cod-api.eureka-technologies.co.uk).

const BRIDGE_URL = process.env.CONTROL_API_URL; // e.g. https://cod-api.eureka-technologies.co.uk
const BRIDGE_SECRET = process.env.BRIDGE_SHARED_SECRET;

export async function callBridge(path: string, body?: Record<string, unknown>) {
  if (!BRIDGE_URL || !BRIDGE_SECRET) {
    throw new Error(
      "Server misconfigured: CONTROL_API_URL or BRIDGE_SHARED_SECRET is missing."
    );
  }

  const res = await fetch(`${BRIDGE_URL}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Bridge-Secret": BRIDGE_SECRET,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bridge returned ${res.status}: ${text}`);
  }

  return res.json();
}
