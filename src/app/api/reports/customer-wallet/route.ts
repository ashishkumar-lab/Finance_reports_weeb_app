import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { driveuQueryLong, logDownload } from "@/lib/db";
import { hasReportPermission } from "@/lib/userDb";
import { generateExcel } from "@/lib/excel";

const CUSTOMER_WALLET_QUERY = `
SELECT
    up.mobile,
    u.first_name,
    c.name AS city,
    bc.name AS booking_city,
    CASE ab.is_b2b
        WHEN 1 THEN 'B2B'
        WHEN 0 THEN 'B2C'
        ELSE ''
    END AS Category,
    wallet_wallettxnlog.reference_id,
    IF(wallet_wallettxnlog.txn_type = 'Debit', wallet_wallettxnlog.amount, 0) AS Debit,
    IF(wallet_wallettxnlog.txn_type = 'Credit', wallet_wallettxnlog.amount, 0) AS Credit,
    wcb.amount AS Closing_Balance,
    wallet_wallettxnlog.txn_desc,
    wallet_wallettxnlog.comments,
    wallet_wallettxnlog.created_at,
    wallet_wallettxnlog.component_type,

    CASE
        WHEN wallet_wallettxnlog.component_type = 'promotional' AND wallet_wallettxnlog.txn_type = 'Debit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.comments LIKE '%Credits expired%'
            THEN 'Credits expired'
        WHEN wallet_wallettxnlog.component_type = 'promotional' AND wallet_wallettxnlog.txn_type = 'Debit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.comments LIKE '%Fare Adjustment%'
            THEN 'Fare Adjustment'
        WHEN wallet_wallettxnlog.component_type = 'promotional' AND wallet_wallettxnlog.txn_type = 'Debit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Wallet Refund%'
            THEN 'Wallet Refund'
        WHEN wallet_wallettxnlog.component_type = 'promotional' AND wallet_wallettxnlog.txn_type = 'Debit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Promo Balance Expired%'
            THEN 'Credit Expiry'
        WHEN wallet_wallettxnlog.component_type = 'promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0
            THEN 'Promotional Credit'
        WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Debit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.comments LIKE '%Fare Adjustment%'
            THEN 'Fare Adjustment'
        WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Debit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%DU Money Expired%'
            THEN 'DU Money Expired'
        WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Debit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%No Longer Using Driveu%'
            THEN 'No Longer Using Driveu'
        WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Debit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Traffic Violation%'
            THEN 'Traffic Violation'
        WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Debit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Wallet Refund%'
            THEN 'Wallet Refund'
        WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Debit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Write off%'
            THEN 'Write off'
        WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Accident Compensation%'
            THEN 'Accident Compensation'
        WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Booking Payment Adjustment%'
            THEN 'Booking Payment Adjustment'
        WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Cancellation Charge Reversal%'
            THEN 'Cancellation Charge Reversal'
        WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Car missused by Driver%'
            THEN 'Car missused by Driver'
        WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%DU Money Restored%'
            THEN 'DU Money Restored'
        WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Dual payment reversed%'
            THEN 'Dual payment reversed'
        WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Fare Adjustment%'
            THEN 'Fare Adjustment'
        WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Item Lost/Thefts%'
            THEN 'Item Lost/Thefts'
        WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Night Charges Waiver%'
            THEN 'Night Charges Waiver'
        WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%No Longer Using DriveU%'
            THEN 'No Longer Using DriveU'
        WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Overcharge by driver%'
            THEN 'Overcharge by driver'
        WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Traffic violation%'
            THEN 'Traffic violation'
        WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Trip time related%'
            THEN 'Trip time related'
        WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Wallet Recharge%'
            THEN 'Wallet Recharge'
        WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Write-off%'
            THEN 'Write-off'
        ELSE 'Others'
    END AS vertical

FROM userprofile_profile up

JOIN auth_user u
    ON u.id = up.user_id

JOIN wallet_wallet w
    ON w.object_id = u.id
    AND w.content_type_id = 4

JOIN wallet_wallettxnlog
    ON wallet_wallettxnlog.wallet_id = w.id
    AND wallet_wallettxnlog.defaulted = 0

LEFT OUTER JOIN app_booking ab
    ON ab.booking_id = wallet_wallettxnlog.reference_id

LEFT OUTER JOIN tariff_city c
    ON c.id = up.city_id

LEFT OUTER JOIN tariff_city bc
    ON bc.id = ab.city_id

LEFT OUTER JOIN wallet_wallettxnclosingbalance wcb
    ON wcb.txn_log_id = wallet_wallettxnlog.id

WHERE DATE(wallet_wallettxnlog.created_at) >= ?
AND DATE(wallet_wallettxnlog.created_at) <= ?

HAVING CONCAT(Category, wallet_wallettxnlog.component_type) != 'B2Bpromotional'

ORDER BY wallet_wallettxnlog.created_at
`;

const COLUMNS = [
  { header: "Mobile",           key: "mobile",          width: 16 },
  { header: "First Name",       key: "first_name",      width: 20 },
  { header: "City",             key: "city",            width: 16 },
  { header: "Booking City",     key: "booking_city",    width: 16 },
  { header: "Category",         key: "Category",        width: 12 },
  { header: "Reference ID",     key: "reference_id",    width: 24 },
  { header: "Debit",            key: "Debit",           width: 12 },
  { header: "Credit",           key: "Credit",          width: 12 },
  { header: "Closing Balance",  key: "Closing_Balance", width: 18 },
  { header: "Txn Description",  key: "txn_desc",        width: 32 },
  { header: "Comments",         key: "comments",        width: 30 },
  { header: "Created At",       key: "created_at",      width: 22 },
  { header: "Component Type",   key: "component_type",  width: 18 },
  { header: "Vertical",         key: "vertical",        width: 28 },
];

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.isAdmin) {
    if (!session.user.dbUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const allowed = await hasReportPermission(session.user.dbUserId, "customer-wallet");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate and endDate are required." }, { status: 400 });
  }
  if (!DATE_REGEX.test(startDate) || !DATE_REGEX.test(endDate)) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
  }

  try {
    const rows = await driveuQueryLong<Record<string, unknown>>(
      CUSTOMER_WALLET_QUERY,
      [startDate, endDate]
    );

    if (rows.length > 1048575) {
      return NextResponse.json(
        { error: `Too many records (${rows.length.toLocaleString()}). Exceeds Excel's maximum row limit of 1,048,575.` },
        { status: 400 }
      );
    }

    const buffer = await generateExcel("Customer Wallet", COLUMNS, rows);
    await logDownload("Customer Wallet Report", startDate, endDate, session.user?.email ?? "unknown");

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="customer_wallet_${startDate}_${endDate}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("[Customer Wallet] Error:", err);
    await logDownload("Customer Wallet Report", startDate!, endDate!, session.user?.email ?? "unknown", "error");
    return NextResponse.json(
      { error: "Failed to generate report. Check server logs." },
      { status: 500 }
    );
  }
}
