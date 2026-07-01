import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { code } = await req.json();

  if (!process.env.ACCESS_CODE) {
    return NextResponse.json(
      { error: "Server misconfigured: ACCESS_CODE not set." },
      { status: 500 }
    );
  }

  if (code !== process.env.ACCESS_CODE) {
    return NextResponse.json({ error: "Wrong access code." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, code, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  return res;
}
