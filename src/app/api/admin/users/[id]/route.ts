import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getUserById, updateUserStatus, setUserPermission } from "@/lib/userDb";
import { sendApprovalEmail, sendRejectionEmail, sendAccessGrantedEmail } from "@/lib/email";
import { ALL_REPORTS } from "@/lib/userDb";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) return NextResponse.json({ error: "Invalid user ID." }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const { action, reportId, grant } = body;

  const user = await getUserById(userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Approve / Reject user
  if (action === "approve") {
    await updateUserStatus(userId, "approved");
    // Grant all reports by default on approval
    for (const r of ALL_REPORTS) {
      await setUserPermission(userId, r.id, true);
    }
    await sendApprovalEmail(user.email, user.name);
    return NextResponse.json({ message: "User approved and notified." });
  }

  if (action === "reject") {
    await updateUserStatus(userId, "rejected");
    await sendRejectionEmail(user.email, user.name);
    return NextResponse.json({ message: "User rejected and notified." });
  }

  // Toggle report permission
  if (action === "permission" && reportId !== undefined) {
    await setUserPermission(userId, reportId, grant);
    if (grant) {
      const report = ALL_REPORTS.find((r) => r.id === reportId);
      await sendAccessGrantedEmail(user.email, user.name, report?.name ?? reportId);
    }
    return NextResponse.json({ message: "Permission updated." });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}
