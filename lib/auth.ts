// lib/auth.ts
import { cookies } from "next/headers";

const COOKIE_NAME = "eureka_cod_session";

export function isAuthed(): boolean {
  const store = cookies();
  return store.get(COOKIE_NAME)?.value === process.env.ACCESS_CODE;
}

export const SESSION_COOKIE = COOKIE_NAME;
