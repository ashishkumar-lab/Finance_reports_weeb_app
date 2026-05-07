import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { driveuQueryLong, logDownload } from "@/lib/db";
import { hasReportPermission } from "@/lib/userDb";
import { generateExcel } from "@/lib/excel";

const DRIVER_WALLET_QUERY = `
SELECT
    d.id AS DriverId,
    d.first_name AS DriverName,
    st.name AS service_type,
    c.name AS City,
    CONCAT("'", wallet_wallettxnlog.reference_id) AS convert_reference_id,
    wallet_wallettxnlog.reference_id,
    IF(wallet_wallettxnlog.txn_type = 'DEBIT', wallet_wallettxnlog.amount, '') AS Debit,
    IF(wallet_wallettxnlog.txn_type = 'CREDIT', wallet_wallettxnlog.amount, '') AS Credit,
    wcb.amount AS Closing_Balance,
    IF(org.id, org.name, IF(can_org.id, can_org.name, '')) AS ClientName,

    CASE
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Cancellation Charges' THEN 'Cancellation Charges'
        WHEN wallet_wallettxnlog.txn_desc LIKE 'Fuel%' THEN 'Fuel/Toll Charges'
        WHEN wallet_wallettxnlog.txn_desc LIKE 'Over Time%' THEN 'Over Time Charges'
        WHEN wallet_wallettxnlog.txn_desc LIKE 'Penalty Refund%' THEN 'Penalty Refund'
        WHEN wallet_wallettxnlog.txn_desc LIKE 'Referral%' THEN 'Referral Bonus'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Surge%' THEN 'Weekend Transportation Cost'
        WHEN wallet_wallettxnlog.txn_desc = 'unpaid-earnings' OR wallet_wallettxnlog.txn_desc = 'Unpaid Earnings' THEN 'Unpaid Earnings'
        WHEN wallet_wallettxnlog.txn_desc = 'pd-subscription-excess-collected' THEN 'Refunded PD Subscription'
        WHEN (wallet_wallettxnlog.txn_desc = 'PD Subscription GST' OR wallet_wallettxnlog.txn_desc = 'pd-subscription-gst') AND txn_type = 'Debit' THEN 'Collected PD Subscription GST'
        WHEN (wallet_wallettxnlog.txn_desc = 'PD Subscription' OR wallet_wallettxnlog.txn_desc = 'pd-subscription') AND txn_type = 'Debit' THEN 'Collected PD Subscription'
        WHEN (wallet_wallettxnlog.txn_desc = 'PD Subscription GST' OR wallet_wallettxnlog.txn_desc = 'pd-subscription-gst') AND txn_type = 'Credit' THEN 'Refunded PD Subscription GST'
        WHEN (wallet_wallettxnlog.txn_desc = 'PD Subscription' OR wallet_wallettxnlog.txn_desc = 'pd-subscription') AND txn_type = 'Credit' THEN 'Refunded PD Subscription'
        ELSE wallet_wallettxnlog.txn_desc
    END AS Description,

    CASE
        WHEN wallet_wallettxnlog.txn_desc LIKE '%incentive%' THEN 'Incentive'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%ONB_Refund%' THEN 'Incentive'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Charges - Accident deposit%' THEN 'Accident Deposit'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Refund - Accident deposit%' THEN 'Accident Deposit'
        WHEN wallet_wallettxnlog.txn_desc LIKE 'Refund - %' THEN 'Penalty-Refund'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Cancellation Charges%' THEN 'Cancellation Charges'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%cancellation-charges%' THEN 'Cancellation Charges'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Shirt%' THEN 'Shirt'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%marketing-promotional%' THEN 'Marketing Promotional Recharge'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Promotional%' THEN 'Promotional'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Earnings%' THEN 'Earnings'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Recharge%' THEN 'Recharge'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Payout%' THEN 'Payout'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%fnf%' THEN 'Payout'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Penalty%' THEN 'Penalty'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Fine%' THEN 'Penalty'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Fuel%' THEN 'Fuel/Toll Charges'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Toll%' THEN 'Fuel/Toll Charges'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%You Collected Cash%' THEN 'You Collected Cash'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%you-collected-cash%' THEN 'You Collected Cash'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%PD Subscription%' THEN 'PD Subscription'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%pd-subscription%' THEN 'PD Subscription'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%background-verification-cost' THEN 'Background Verification'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%background verification cost' THEN 'Background Verification'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Token amount refunded%' THEN 'Booking''s Token Amount Refund'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Refund%' THEN 'Refund'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Token%' THEN 'Booking''s Token Amount'
        ELSE 'Others'
    END AS Vertical,

    CASE
        WHEN wallet_wallettxnlog.txn_desc LIKE '%ONB_Refund%' THEN 'Onboarding Incentive'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Daily Incentive%Morning%' THEN 'Daily Morning Incentive'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Daily Incentive%Evening%' THEN 'Daily Evening Incentive'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Daily Incentive%Shop%' THEN 'Daily Shop Incentive'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Daily Incentive%' THEN 'Daily Incentive'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Per Trip Incentive: fulfilment%' THEN 'FT Incentive'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Per Trip Incentive:%Morning%' THEN 'Morning Commute Auto'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Per Trip Incentive:%Shop%' THEN 'Shop Commute Auto'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Per Trip Incentive:%Evening%' THEN 'Evening Commute Auto'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%b2b-incentive%' THEN 'b2b-incentive'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Ladder Incentive%' THEN 'Ladder Incentive'
        WHEN wallet_wallettxnlog.txn_desc LIKE '%Dry Run Incentive:%' THEN 'Dry Run'
        ELSE 'No Incentive'
    END AS Incentive,

    wallet_wallettxnlog.comments,
    DATE_FORMAT(wallet_wallettxnlog.created_at, '%Y-%m-%d %H:%i:%s') AS Transaction_Date,

    CASE
        WHEN b.is_b2b = 0 THEN 'B2C'
        WHEN b.is_b2b = 1 THEN 'B2B'
        ELSE CASE
            WHEN bc.is_b2b = 0 THEN 'B2C'
            WHEN bc.is_b2b = 1 THEN 'B2B'
            ELSE CASE
                WHEN bt.is_b2b = 0 THEN 'B2C'
                WHEN bt.is_b2b = 1 THEN 'B2B'
                ELSE CASE
                    WHEN bw.is_b2b = 0 THEN 'B2C'
                    WHEN bw.is_b2b = 1 THEN 'B2B'
                    ELSE CASE
                        WHEN bcc.is_b2b = 0 THEN 'B2C'
                        WHEN bcc.is_b2b = 1 THEN 'B2B'
                        ELSE CASE
                            WHEN br.is_b2b = 0 THEN 'B2C'
                            WHEN br.is_b2b = 1 THEN 'B2B'
                            ELSE CASE
                                WHEN bm.is_b2b = 0 THEN 'B2C'
                                WHEN bm.is_b2b = 1 THEN 'B2B'
                                ELSE CASE
                                    WHEN wallet_wallettxnlog.reference_id LIKE '%WASH%' THEN 'CAR WASH'
                                    ELSE ''
                                END
                            END
                        END
                    END
                END
            END
        END
    END AS Category

FROM wallet_wallettxnlog

JOIN wallet_wallet w
    ON w.id = wallet_wallettxnlog.wallet_id
    AND w.content_type_id = 10

JOIN driver_driver d
    ON d.id = w.object_id

JOIN driveu.driver_operator op
    ON op.id = d.operator_id

JOIN driveu.tariff_city c
    ON c.id = op.city_id

LEFT OUTER JOIN driveu.app_booking b
    ON b.booking_id = wallet_wallettxnlog.reference_id

LEFT JOIN wallet_wallettxnclosingbalance wcb
    ON wcb.txn_log_id = wallet_wallettxnlog.id

LEFT OUTER JOIN app_booking bc
    ON bc.booking_id = LEFT(wallet_wallettxnlog.comments, 8)

LEFT OUTER JOIN app_booking bm
    ON bm.booking_id = MID(wallet_wallettxnlog.reference_id, 4, 8)
    AND wallet_wallettxnlog.reference_id LIKE 'CC%'

LEFT OUTER JOIN app_booking bt
    ON bt.booking_id = MID(wallet_wallettxnlog.reference_id, 6, 8)
    AND wallet_wallettxnlog.reference_id LIKE 'TOLL-%'

LEFT OUTER JOIN app_booking bw
    ON bw.booking_id = MID(wallet_wallettxnlog.reference_id, 8, 8)
    AND wallet_wallettxnlog.reference_id LIKE 'WAIT-T-%'

LEFT OUTER JOIN app_booking bcc
    ON bcc.booking_id = MID(wallet_wallettxnlog.reference_id, 8, 8)
    AND wallet_wallettxnlog.reference_id LIKE 'CANCHG-%'

LEFT OUTER JOIN app_booking br
    ON br.booking_id = MID(wallet_wallettxnlog.reference_id, 8, 8)
    AND wallet_wallettxnlog.reference_id LIKE 'RAPIDO%'

LEFT OUTER JOIN affiliate_organisation org
    ON org.id = b.organisation_id

LEFT OUTER JOIN affiliate_organisation can_org
    ON can_org.id = bc.organisation_id

LEFT OUTER JOIN app_bookingsummary
    ON app_bookingsummary.booking_id = b.id

LEFT OUTER JOIN tariff_cityservicebookingtype csbt
    ON csbt.id = app_bookingsummary.city_service_booking_id

LEFT OUTER JOIN tariff_cityservicetype cst
    ON cst.id = csbt.city_service_id

LEFT OUTER JOIN tariff_servicetype st
    ON st.id = cst.service_type_id

WHERE wallet_wallettxnlog.defaulted = 0
AND d.id IS NOT NULL
AND d.service_type != 20
AND DATE(wallet_wallettxnlog.created_at) >= ?
AND DATE(wallet_wallettxnlog.created_at) <= ?

ORDER BY wallet_wallettxnlog.created_at
`;

const COLUMNS = [
  { header: "Driver ID",            key: "DriverId",              width: 14 },
  { header: "Driver Name",          key: "DriverName",            width: 22 },
  { header: "Service Type",         key: "service_type",          width: 18 },
  { header: "City",                 key: "City",                  width: 16 },
  { header: "Ref ID (Formatted)",   key: "convert_reference_id",  width: 24 },
  { header: "Reference ID",         key: "reference_id",          width: 24 },
  { header: "Debit",                key: "Debit",                 width: 14 },
  { header: "Credit",               key: "Credit",                width: 14 },
  { header: "Closing Balance",      key: "Closing_Balance",       width: 18 },
  { header: "Client Name",          key: "ClientName",            width: 24 },
  { header: "Description",          key: "Description",           width: 32 },
  { header: "Vertical",             key: "Vertical",              width: 28 },
  { header: "Incentive",            key: "Incentive",             width: 24 },
  { header: "Comments",             key: "comments",              width: 30 },
  { header: "Transaction Date",     key: "Transaction_Date",      width: 22 },
  { header: "Category",             key: "Category",              width: 14 },
];

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.isAdmin) {
    if (!session.user.dbUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const allowed = await hasReportPermission(session.user.dbUserId, "driver-wallet");
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
      DRIVER_WALLET_QUERY,
      [startDate, endDate]
    );

    if (rows.length > 1048575) {
      return NextResponse.json(
        { error: `Too many records (${rows.length.toLocaleString()}). Exceeds Excel's maximum row limit of 1,048,575.` },
        { status: 400 }
      );
    }

    const buffer = await generateExcel("Driver Wallet", COLUMNS, rows);
    await logDownload("Driver Wallet Report", startDate, endDate, session.user?.email ?? "unknown");

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="driver_wallet_${startDate}_${endDate}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("[Driver Wallet] Error:", err);
    await logDownload("Driver Wallet Report", startDate!, endDate!, session.user?.email ?? "unknown", "error");
    return NextResponse.json(
      { error: "Failed to generate report. Check server logs." },
      { status: 500 }
    );
  }
}
