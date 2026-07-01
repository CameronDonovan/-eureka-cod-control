import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { callBridge } from "@/lib/bridge";

export async function POST(req: NextRequest) {
  if (!isAuthed()) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json();
  if (!body.dvar || body.value === undefined) {
    return NextResponse.json(
      { error: "Missing dvar or value." },
      { status: 400 }
    );
  }

  try {
    const result = await callBridge("/api/settings", body);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bridge call failed." },
      { status: 502 }
    );
  }
}
