import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getUserPermissions, ALL_REPORTS } from "@/lib/userDb";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin has access to everything
  if (session.user.isAdmin) {
    return NextResponse.json({ permissions: ALL_REPORTS.map((r) => r.id) });
  }

  if (!session.user.dbUserId) {
    return NextResponse.json({ permissions: [] });
  }

  const permissions = await getUserPermissions(session.user.dbUserId);
  return NextResponse.json({ permissions });
}
