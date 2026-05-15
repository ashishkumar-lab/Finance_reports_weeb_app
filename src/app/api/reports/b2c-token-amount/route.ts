import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { driveuQueryLong, logDownload } from "@/lib/db";
import { hasReportPermission } from "@/lib/userDb";
import { generateExcel } from "@/lib/excel";

const B2C_TOKEN_AMOUNT_QUERY = `
SELECT
    abt.id,
    abt.booking_id          AS token_booking_id,
    ab.booking_id           AS booking_ref,
    abt.amount,
    abt.refund_amount,
    abt.cancellation_fee_deducted,
    abt.created_at,
    CASE
        WHEN ab.status = 5 THEN 'Done'
        ELSE 'Not_Done'
    END AS booking_status,
    CASE
        WHEN ab.status = 5 THEN abt.amount
        ELSE 0
    END AS Adjusted_to_invoice,
    (
        abt.amount
        - abt.refund_amount
        - abt.cancellation_fee_deducted
        - CASE WHEN ab.status = 5 THEN abt.amount ELSE 0 END
    ) AS Balance_Amount
FROM app_bookingtokenamount AS abt
LEFT JOIN app_booking AS ab
    ON ab.id = abt.booking_id
WHERE DATE(abt.created_at) BETWEEN ? AND ?
ORDER BY abt.created_at
`;

const COLUMNS = [
  { header: "ID",                         key: "id",                        width: 12 },
  { header: "Token Booking ID",           key: "token_booking_id",          width: 18 },
  { header: "Booking Ref",                key: "booking_ref",               width: 24 },
  { header: "Amount",                     key: "amount",                    width: 14 },
  { header: "Refund Amount",              key: "refund_amount",             width: 16 },
  { header: "Cancellation Fee Deducted",  key: "cancellation_fee_deducted", width: 26 },
  { header: "Created At",                 key: "created_at",                width: 22 },
  { header: "Booking Status",             key: "booking_status",            width: 16 },
  { header: "Adjusted to Invoice",        key: "Adjusted_to_invoice",       width: 20 },
  { header: "Balance Amount",             key: "Balance_Amount",            width: 16 },
];

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.user.isAdmin) {
    if (!session.user.dbUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    try {
      const allowed = await hasReportPermission(session.user.dbUserId, "b2c-token-amount");
      if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } catch {
      return NextResponse.json({ error: "Failed to verify permissions." }, { status: 500 });
    }
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate   = searchParams.get("endDate");

  if (!startDate || !endDate)
    return NextResponse.json({ error: "startDate and endDate are required." }, { status: 400 });
  if (!DATE_REGEX.test(startDate) || !DATE_REGEX.test(endDate))
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });

  try {
    const rows = await driveuQueryLong<Record<string, unknown>>(B2C_TOKEN_AMOUNT_QUERY, [startDate, endDate]);

    if (searchParams.get("format") === "json") {
      return NextResponse.json({ rows, total: rows.length });
    }

    if (rows.length > 1048575) {
      return NextResponse.json(
        { error: `Too many records (${rows.length.toLocaleString()}). Exceeds Excel's maximum row limit of 1,048,575.` },
        { status: 400 }
      );
    }

    const buffer = await generateExcel("B2C Token Amount", COLUMNS, rows);
    await logDownload("B2C Token Amount Report", startDate, endDate, session.user?.email ?? "unknown");

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="b2c_token_amount_${startDate}_${endDate}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("[B2C Token Amount] Error:", err);
    await logDownload("B2C Token Amount Report", startDate!, endDate!, session.user?.email ?? "unknown", "error");
    return NextResponse.json({ error: "Failed to generate report. Check server logs." }, { status: 500 });
  }
}
