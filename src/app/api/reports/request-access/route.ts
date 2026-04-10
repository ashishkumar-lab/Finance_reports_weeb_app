import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createAccessRequest, getUserById, ALL_REPORTS } from "@/lib/userDb";
import { sendReportAccessRequestEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId } = await req.json().catch(() => ({}));
  if (!reportId) return NextResponse.json({ error: "reportId is required." }, { status: 400 });

  const report = ALL_REPORTS.find((r) => r.id === reportId);
  if (!report) return NextResponse.json({ error: "Invalid report." }, { status: 400 });

  if (!session.user.dbUserId) {
    return NextResponse.json({ error: "User not found." }, { status: 400 });
  }

  const user = await getUserById(session.user.dbUserId);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  await createAccessRequest(user.id, reportId);
  await sendReportAccessRequestEmail(user.email, user.name, report.name);

  return NextResponse.json({ message: "Access request sent. Admin will review shortly." });
}
