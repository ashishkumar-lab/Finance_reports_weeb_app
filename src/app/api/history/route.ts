import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getDownloadLogs } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = 30;

  // Admins see all logs; regular users only see their own
  const filterByEmail = session.user.isAdmin ? undefined : (session.user.email ?? undefined);

  const { logs, total } = await getDownloadLogs(page, limit, filterByEmail);
  return NextResponse.json({ logs, total, page, limit });
}
