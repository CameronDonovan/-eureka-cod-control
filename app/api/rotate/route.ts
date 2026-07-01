import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { callBridge } from "@/lib/bridge";

export async function POST() {
  if (!isAuthed()) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const result = await callBridge("/api/rotate", {});
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bridge call failed." },
      { status: 502 }
    );
  }
}
