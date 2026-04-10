import { NextResponse } from "next/server";

// Debug endpoint removed for security — never expose env vars publicly
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
