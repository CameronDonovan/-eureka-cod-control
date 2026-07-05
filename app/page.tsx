"use client";

import { useEffect, useRef, useState } from "react";

type LogLine = { time: string; text: string; tone: "ok" | "err" | "info" };

const MAPS: { label: string; value: string }[] = [
  // --- MW2 (2009) core maps ---
  { label: "Terminal", value: "mp_terminal" },
  { label: "Highrise", value: "mp_highrise" },
  { label: "Favela", value: "mp_favela" },
  { label: "Rust", value: "mp_rust" },
  { label: "Nuketown", value: "mp_nuked" },
  { label: "Quarry", value: "mp_quarry" },
  { label: "Afghan", value: "mp_afghan" },
  { label: "Derail", value: "mp_derail" },
  { label: "Estate", value: "mp_estate" },
  { label: "Invasion", value: "mp_invasion" },
  { label: "Karachi", value: "mp_checkpoint" },
  { label: "Rundown", value: "mp_rundown" },
  { label: "Scrapyard", value: "mp_boneyard" },
  { label: "Skidrow", value: "mp_nightshift" },
  { label: "Sub Base", value: "mp_subbase" },
  { label: "Underpass", value: "mp_underpass" },
  { label: "Wasteland", value: "mp_brecourt" },

  // --- MW2 Stimulus/Resurgence DLC ---
  { label: "Salvage", value: "mp_complex" },
  { label: "Crash", value: "mp_crash" },
  { label: "Overgrown", value: "mp_overgrown" },
  { label: "Bailout", value: "mp_compact" },
  { label: "Storm", value: "mp_storm" },
  { label: "Fuel", value: "mp_fuel2" },
  { label: "Strike", value: "mp_strike" },
  { label: "Trailer Park", value: "mp_trailerpark" },
  { label: "Vacant", value: "mp_vacant" },

  // --- Uncertain / possibly modded variants (verify against your server) ---
  { label: "Abandon (unconfirmed)", value: "mp_abandon" },
  { label: "Bog (variant, unconfirmed)", value: "mp_bog_sh" },
  { label: "Wet Work (variant, unconfirmed)", value: "mp_cargoship_sh" },
  { label: "Shipment (Long)", value: "mp_shipment_long" },
  { label: "Rust (Long)", value: "mp_rust_long" },
  { label: "Storm (Spring, unconfirmed)", value: "mp_storm_spring" },
  { label: "Favela (Tropical, unconfirmed)", value: "mp_fav_tropical" },
  { label: "Estate (Tropical, unconfirmed)", value: "mp_estate_tropical" },
  { label: "Crash (Tropical, unconfirmed)", value: "mp_crash_tropical" },
  { label: "Bloc (variant, unconfirmed)", value: "mp_bloc_sh" },

  // --- CoD4: Modern Warfare (1) maps ---
  { label: "Crossfire", value: "mp_cross_fire" },
  { label: "Bloc", value: "mp_bloc" },
  { label: "Wet Work", value: "mp_cargoship" },
  { label: "Killhouse", value: "mp_killhouse" },
  { label: "Shipment", value: "mp_shipment" },
  { label: "Firing Range", value: "mp_firingrange" },
  { label: "Backlot", value: "mp_backlot" },
  { label: "Broadcast", value: "mp_broadcast" },
  { label: "District", value: "mp_citystreets" },
  { label: "Ambush", value: "mp_convoy" },
  { label: "Countdown", value: "mp_countdown" },
  { label: "Winter Crash", value: "mp_crash_snow" },
  { label: "Downpour", value: "mp_farm" },
  { label: "Pipeline", value: "mp_pipeline" },
  { label: "Showdown", value: "mp_showdown" },

  // --- World at War map (used cross-game in some mods) ---
  { label: "Carentan", value: "mp_carentan" },

  // --- MW3 maps ---
  { label: "Dome", value: "mp_dome" },
  { label: "Hardhat", value: "mp_hardhat" },
  { label: "Resistance", value: "mp_paris" },
  { label: "Seatown", value: "mp_seatown" },
  { label: "Bakaara", value: "mp_bravo" },
  { label: "Underground", value: "mp_underground" },
  { label: "Downturn", value: "mp_plaza2" },
  { label: "Village", value: "mp_village" },
  { label: "Mission", value: "mp_alpha" },
];

const GAMETYPES = [
  { label: "Team Deathmatch", value: "war" },
  { label: "Free-for-All", value: "dm" },
  { label: "Domination", value: "dom" },
  { label: "Headquarters", value: "koth" },
  { label: "Search & Destroy", value: "sd" },
  { label: "Sabotage", value: "sab" },
  { label: "Capture the Flag", value: "ctf" },
];

export default function ControlPanel() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [loginError, setLoginError] = useState("");

  const [online, setOnline] = useState<boolean | null>(null);
  const [currentMap, setCurrentMap] = useState<string>("—");
  const [players, setPlayers] = useState<string>("—");

  const [pendingMap, setPendingMap] = useState<string | null>(null);
  const [gametype, setGametype] = useState("war");
  const [scoreLimit, setScoreLimit] = useState("7500");
  const [timeLimit, setTimeLimit] = useState("10");
  const [botCount, setBotCount] = useState("6");
  const [botsEnabled, setBotsEnabled] = useState(true);

  const [log, setLog] = useState<LogLine[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  function pushLog(text: string, tone: LogLine["tone"] = "info") {
    setLog((prev) => [
      ...prev.slice(-49),
      { time: new Date().toLocaleTimeString(), text, tone },
    ]);
  }

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  async function checkStatus() {
    try {
      const res = await fetch("/api/status");
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      const data = await res.json();
      setOnline(Boolean(data.online));
      setCurrentMap(data.map ?? "—");
      setPlayers(data.players ?? "—");
    } catch {
      setOnline(false);
    }
  }

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      setAuthed(true);
      pushLog("Session started.", "ok");
      checkStatus();
    } else {
      const data = await res.json().catch(() => ({}));
      setLoginError(data.error ?? "Wrong access code.");
    }
  }

  async function handleMapChange(map: string, label: string) {
    setPendingMap(map);
    pushLog(`> map ${map}`, "info");
    try {
      const res = await fetch("/api/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ map }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "failed");
      pushLog(`Loading ${label}...`, "ok");
      setTimeout(checkStatus, 4000);
    } catch (err) {
      pushLog(
        `Map change failed: ${err instanceof Error ? err.message : "unknown error"}`,
        "err"
      );
    } finally {
      setPendingMap(null);
    }
  }

  async function pushSetting(dvar: string, value: string, label: string) {
    pushLog(`> set ${dvar} "${value}"`, "info");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dvar, value }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "failed");
      pushLog(`${label} updated.`, "ok");
    } catch (err) {
      pushLog(
        `Setting failed: ${err instanceof Error ? err.message : "unknown error"}`,
        "err"
      );
    }
  }

  // Some dvars (score limit, time limit) are only read when a match starts,
  // so we set the value then trigger a fast_restart to apply it right away
  // without booting everyone to a different map.
  async function pushSettingAndRestart(
    dvar: string,
    value: string,
    label: string
  ) {
    pushLog(`> set ${dvar} "${value}"`, "info");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dvar, value }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "failed");
      pushLog(`${label} updated. Restarting round to apply...`, "ok");

      const restartRes = await fetch("/api/fastrestart", { method: "POST" });
      if (!restartRes.ok)
        throw new Error((await restartRes.json()).error ?? "restart failed");
      pushLog("Round restarted.", "ok");
      setTimeout(checkStatus, 3000);
    } catch (err) {
      pushLog(
        `${label} update failed: ${
          err instanceof Error ? err.message : "unknown error"
        }`,
        "err"
      );
    }
  }

  async function handleEndMatch() {
    pushLog("> map_rotate", "info");
    try {
      const res = await fetch("/api/rotate", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "failed");
      pushLog("Match ended — moving to next map.", "ok");
      setTimeout(checkStatus, 4000);
    } catch (err) {
      pushLog(
        `End match failed: ${err instanceof Error ? err.message : "unknown error"}`,
        "err"
      );
    }
  }

  // ---------- Not signed in ----------
  if (authed === false) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-panel border border-panelborder rounded-md p-8"
        >
          <p className="font-display uppercase tracking-widest text-amber text-sm mb-1">
            Eureka Home Server
          </p>
          <h1 className="font-display text-2xl font-semibold mb-6">
            Access code
          </h1>
          <input
            type="password"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full bg-base border border-panelborder rounded px-3 py-2 mb-3 text-ink focus-visible:outline-amber"
            placeholder="Enter access code"
          />
          {loginError && (
            <p className="text-danger text-sm mb-3">{loginError}</p>
          )}
          <button
            type="submit"
            className="w-full bg-amber text-base font-semibold rounded px-3 py-2 hover:bg-amber-bright transition-colors"
          >
            Connect
          </button>
        </form>
      </main>
    );
  }

  if (authed === null) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Checking session…</p>
      </main>
    );
  }

  // ---------- Signed in ----------
  return (
    <main className="min-h-screen px-4 py-8 md:px-10 md:py-10 max-w-6xl mx-auto">
      {/* Status bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 mb-10 border-b border-panelborder pb-6">
        <div>
          <p className="font-display uppercase tracking-widest text-amber text-xs mb-1">
            Eureka Technologies · Homelab
          </p>
          <h1 className="font-display text-3xl font-semibold">
            Eureka Home Server
          </h1>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                online ? "bg-online pulse" : "bg-danger"
              }`}
            />
            <span className="text-muted">
              {online === null ? "checking…" : online ? "online" : "offline"}
            </span>
          </div>
          <div className="text-muted">
            map: <span className="text-ink">{currentMap}</span>
          </div>
          <div className="text-muted">
            players: <span className="text-ink">{players}</span>
          </div>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Map select */}
        <section className="md:col-span-2">
          <h2 className="font-display uppercase tracking-widest text-xs text-muted mb-3">
            Map rotation — select to load now
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {MAPS.map((m) => (
              <button
                key={m.value}
                onClick={() => handleMapChange(m.value, m.label)}
                disabled={pendingMap !== null}
                className={`border rounded-md px-3 py-4 text-left transition-colors ${
                  currentMap === m.value
                    ? "border-amber bg-amber/10"
                    : "border-panelborder bg-panel hover:border-amber/60"
                } ${pendingMap === m.value ? "opacity-60" : ""}`}
              >
                <div className="font-display font-medium">{m.label}</div>
                <div className="text-xs text-muted">{m.value}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Settings */}
        <section>
          <h2 className="font-display uppercase tracking-widest text-xs text-muted mb-3">
            Match settings
          </h2>
          <div className="bg-panel border border-panelborder rounded-md p-5 space-y-5">
            <div>
              <label className="text-xs text-muted block mb-1">
                Gametype
              </label>
              <select
                value={gametype}
                onChange={(e) => setGametype(e.target.value)}
                className="w-full bg-base border border-panelborder rounded px-2 py-2 text-sm"
              >
                {GAMETYPES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  pushSetting("g_gametype", gametype, "Gametype")
                }
                className="mt-2 w-full text-sm bg-panelborder hover:bg-amber hover:text-base rounded px-3 py-1.5 transition-colors"
              >
                Apply gametype
              </button>
            </div>

            <div>
              <label className="text-xs text-muted block mb-1">
                Score limit
              </label>
              <div className="flex gap-2">
                <input
                  value={scoreLimit}
                  onChange={(e) => setScoreLimit(e.target.value)}
                  className="w-full bg-base border border-panelborder rounded px-2 py-2 text-sm"
                />
                <button
                  onClick={() =>
                    pushSettingAndRestart(
                      `scr_${gametype}_scorelimit`,
                      scoreLimit,
                      "Score limit"
                    )
                  }
                  className="text-sm bg-panelborder hover:bg-amber hover:text-base rounded px-3 transition-colors"
                >
                  Set
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted block mb-1">
                Time limit (minutes)
              </label>
              <div className="flex gap-2">
                <input
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  className="w-full bg-base border border-panelborder rounded px-2 py-2 text-sm"
                />
                <button
                  onClick={() =>
                    pushSettingAndRestart(
                      `scr_${gametype}_timelimit`,
                      timeLimit,
                      "Time limit"
                    )
                  }
                  className="text-sm bg-panelborder hover:bg-amber hover:text-base rounded px-3 transition-colors"
                >
                  Set
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted block mb-1">
                Bots
              </label>
              <p className="text-xs text-muted mb-2 leading-relaxed">
                Requires the Bot Warfare mod installed once on the server
                (fs_game &quot;mods/bots&quot; + restart). After that, bot
                count can be changed live from here.
              </p>
              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  min={0}
                  max={18}
                  value={botCount}
                  onChange={(e) => setBotCount(e.target.value)}
                  className="w-full bg-base border border-panelborder rounded px-2 py-2 text-sm"
                />
                <button
                  onClick={() =>
                    pushSetting("bots_manage_fill", botCount, "Bot count")
                  }
                  className="text-sm bg-panelborder hover:bg-amber hover:text-base rounded px-3 transition-colors whitespace-nowrap"
                >
                  Set fill
                </button>
              </div>
              <button
                onClick={() => {
                  const next = !botsEnabled;
                  setBotsEnabled(next);
                  pushSetting(
                    "bots_manage_fill_kick",
                    next ? "1" : "0",
                    "Bots fill-kick"
                  );
                }}
                className={`w-full text-sm rounded px-3 py-1.5 transition-colors border ${
                  botsEnabled
                    ? "border-online text-online"
                    : "border-panelborder text-muted"
                }`}
              >
                Fill-kick: {botsEnabled ? "On" : "Off"}
              </button>
            </div>

            <button
              onClick={handleEndMatch}
              className="w-full text-sm bg-danger/20 border border-danger text-danger hover:bg-danger hover:text-ink rounded px-3 py-1.5 transition-colors"
            >
              End match now
            </button>

            <button
              onClick={checkStatus}
              className="w-full text-sm border border-panelborder hover:border-amber rounded px-3 py-1.5 transition-colors"
            >
              Refresh status
            </button>
          </div>
        </section>
      </div>

      {/* Console log — signature element */}
      <section className="mt-10">
        <h2 className="font-display uppercase tracking-widest text-xs text-muted mb-3">
          Console
        </h2>
        <div className="bg-black/60 border border-panelborder rounded-md p-4 h-48 overflow-y-auto text-xs leading-relaxed">
          {log.length === 0 && (
            <p className="text-muted">
              Waiting for commands. Actions taken here will echo below.
            </p>
          )}
          {log.map((l, i) => (
            <div
              key={i}
              className={
                l.tone === "err"
                  ? "text-danger"
                  : l.tone === "ok"
                  ? "text-online"
                  : "text-muted"
              }
            >
              <span className="text-panelborder">[{l.time}]</span> {l.text}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </section>
    </main>
  );
}
