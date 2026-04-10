import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getAllUsers, getUserPermissions, ALL_REPORTS } from "@/lib/userDb";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await getAllUsers();
  const usersWithPermissions = await Promise.all(
    users.map(async (u) => ({
      ...u,
      permissions: await getUserPermissions(u.id),
    }))
  );

  return NextResponse.json({ users: usersWithPermissions, reports: ALL_REPORTS });
}
