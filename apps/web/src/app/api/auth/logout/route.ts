import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  await clearSessionCookie();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return NextResponse.redirect(appUrl);
}
