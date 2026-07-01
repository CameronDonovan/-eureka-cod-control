import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { callBridge } from "@/lib/bridge";

export async function GET() {
  if (!isAuthed()) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const result = await callBridge("/api/status");
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { online: false, error: err instanceof Error ? err.message : "unreachable" },
      { status: 200 }
    );
  }
}
