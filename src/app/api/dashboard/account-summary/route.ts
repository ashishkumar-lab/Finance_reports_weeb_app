import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { driveuQuery, financePool } from "@/lib/db";

// ── Cache helpers (finance DB) ─────────────────────────────────────────────

async function ensureCacheTable() {
  await financePool.execute(`
    CREATE TABLE IF NOT EXISTS account_summary_cache (
      cache_key VARCHAR(100) PRIMARY KEY,
      data_json LONGTEXT NOT NULL,
      cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function getFromCache(key: string): Promise<Record<string, unknown> | null> {
  try {
    await ensureCacheTable();
    const [rows] = await financePool.execute(
      `SELECT data_json FROM account_summary_cache WHERE cache_key = ?`,
      [key]
    );
    const list = rows as { data_json: string }[];
    return list.length > 0 ? JSON.parse(list[0].data_json) : null;
  } catch {
    return null;
  }
}

async function saveToCache(key: string, data: object): Promise<void> {
  try {
    await ensureCacheTable();
    const json = JSON.stringify(data);
    await financePool.execute(
      `INSERT INTO account_summary_cache (cache_key, data_json)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE data_json = ?, cached_at = CURRENT_TIMESTAMP`,
      [key, json, json]
    );
  } catch {
    // cache save failure is non-fatal
  }
}

// ── Queries ────────────────────────────────────────────────────────────────

const B2C_SUMMARY_QUERY = `
SELECT
  COUNT(DISTINCT b.booking_id) AS booking_count,
  SUM(CASE WHEN pt.status='initiated' THEN sib.driver_fee ELSE (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges) END) AS driver_fee,
  SUM(sib.base_discount) AS base_discount,
  SUM(sib.discount_on_driver_fee) AS discount_on_driver_fee,
  SUM(sib.discount) AS discount,
  SUM(sib.cancellation_charges) AS cancellation_charges,
  SUM(CASE
    WHEN sib.driver_fee - (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges) > 1
      THEN (abf.fare + abf.extra_charges + abf.night_charges + sib.pickup_fare_du - 15) - (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges)
    WHEN sib.driver_fee - (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges) < -1
      THEN (abf.fare + abf.extra_charges + abf.night_charges + sib.pickup_fare_du - 15) - (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges)
    ELSE sib.convenience_fee
  END) AS convenience_fee,
  SUM(sib.du_secure_fee) AS du_secure_fee,
  SUM(sib.platform_fee) AS platform_fee,
  SUM(CASE WHEN JSON_VALID(sib.extra_data) THEN JSON_UNQUOTE(JSON_EXTRACT(sib.extra_data, '$.du_black_fee')) ELSE NULL END) AS du_black_amt,
  SUM(CASE
    WHEN sib.driver_fee - (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges) > 1
      THEN (abf.fare + abf.extra_charges + abf.night_charges + sib.pickup_fare_du - sib.discount - 15) - (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges) + sib.cancellation_charges + sib.du_secure_fee + sib.platform_fee
    WHEN sib.driver_fee - (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges) < -1
      THEN (abf.fare + abf.extra_charges + abf.night_charges + sib.pickup_fare_du - sib.discount - 15) - (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges) + sib.cancellation_charges + sib.du_secure_fee + sib.platform_fee
    ELSE sib.taxable_amount
  END) AS taxable_amount,
  SUM(sib.cgst) AS cgst,
  SUM(sib.sgst) AS sgst,
  SUM(CASE WHEN b.pickup_datetime >= '2025-01-20 16:00:00' THEN sib.subtotal ELSE sib.subtotal + sib.cancellation_charges + (sib.cancellation_charges * 0.18) END) AS subtotal,
  SUM(sib.rounding_value) AS rounding_value,
  SUM(CASE WHEN b.pickup_datetime >= '2025-01-20 16:00:00' THEN sib.subtotal + sib.rounding_value ELSE sib.subtotal + sib.cancellation_charges + (sib.cancellation_charges * 0.18) + sib.rounding_value END) AS payable,
  SUM(sib.pickup_fare) AS pickup_fare,
  SUM(sib.pickup_fare_driver) AS pickup_fare_driver,
  SUM(sib.pickup_fare_du) AS pickup_fare_du
FROM app_booking AS b
JOIN app_bookingsummary ON app_bookingsummary.booking_id = b.id
JOIN app_bookingfare AS abf ON abf.booking_id = b.id
LEFT JOIN payment_transaction AS pt ON pt.booking_id = b.booking_id
JOIN settlements_invoicebreakup AS sib ON sib.booking_id = b.id
LEFT JOIN settlements_driverearning AS sde ON sde.booking_id = b.id
WHERE sib.is_active = TRUE AND b.status = 5 AND b.is_b2b = 0
AND app_bookingsummary.trip_ended_at >= ? AND app_bookingsummary.trip_ended_at < DATE_ADD(?, INTERVAL 1 DAY)
`;

const B2B_SUMMARY_QUERY = `
SELECT
  COUNT(DISTINCT b.booking_id) AS booking_count,
  SUM(f.fare) AS Base_Fare,
  SUM(f.extra_charges) AS Extra_Charges,
  SUM(f.night_charges) AS Night_Charges,
  SUM(f.fare + f.extra_charges + f.night_charges) AS Total_Fare,
  SUM(sde.trip_time_earnings + sde.night_charges + sde.one_way_charges) AS Driver_Fare,
  SUM((f.fare + f.extra_charges + f.night_charges) - (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges)) AS Convenience_Fee,
  SUM(f.premium_amount) AS Trip_Secure_Fee,
  SUM(0.18 * ((f.fare + f.extra_charges + f.night_charges) - (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges) + f.premium_amount)) AS GST_Conv_TripSec_Fee,
  SUM((f.fare + f.extra_charges + f.night_charges) + f.premium_amount + 0.18 * ((f.fare + f.extra_charges + f.night_charges) - (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges) + f.premium_amount)) AS Payable
FROM app_booking b
JOIN app_bookingsummary ON b.id = app_bookingsummary.booking_id
JOIN app_bookingfare f ON f.booking_id = b.id
LEFT JOIN settlements_driverearning sde ON sde.booking_id = b.id
WHERE b.is_b2b = 1 AND b.status = 5
AND b.pickup_datetime >= ? AND b.pickup_datetime < DATE_ADD(?, INTERVAL 1 DAY)
`;

const DRIVER_WALLET_VERTICAL_QUERY = `
SELECT
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
  SUM(IF(wallet_wallettxnlog.txn_type = 'DEBIT', wallet_wallettxnlog.amount, 0)) AS total_debit,
  SUM(IF(wallet_wallettxnlog.txn_type = 'CREDIT', wallet_wallettxnlog.amount, 0)) AS total_credit,
  SUM(IF(wallet_wallettxnlog.txn_type = 'CREDIT', wallet_wallettxnlog.amount, 0)) - SUM(IF(wallet_wallettxnlog.txn_type = 'DEBIT', wallet_wallettxnlog.amount, 0)) AS net
FROM wallet_wallettxnlog
JOIN wallet_wallet w ON w.id = wallet_wallettxnlog.wallet_id AND w.content_type_id = 10
JOIN driver_driver d ON d.id = w.object_id
JOIN driveu.driver_operator op ON op.id = d.operator_id
WHERE wallet_wallettxnlog.defaulted = 0
AND d.id IS NOT NULL AND d.service_type != 20
AND wallet_wallettxnlog.created_at >= ? AND wallet_wallettxnlog.created_at < DATE_ADD(?, INTERVAL 1 DAY)
GROUP BY Vertical
ORDER BY Vertical
`;

const CUSTOMER_WALLET_VERTICAL_QUERY = `
SELECT
  CASE
    WHEN wallet_wallettxnlog.component_type = 'promotional' AND wallet_wallettxnlog.txn_type = 'Debit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.comments LIKE '%Credits expired%' THEN 'Credits expired'
    WHEN wallet_wallettxnlog.component_type = 'promotional' AND wallet_wallettxnlog.txn_type = 'Debit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.comments LIKE '%Fare Adjustment%' THEN 'Fare Adjustment'
    WHEN wallet_wallettxnlog.component_type = 'promotional' AND wallet_wallettxnlog.txn_type = 'Debit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Wallet Refund%' THEN 'Wallet Refund'
    WHEN wallet_wallettxnlog.component_type = 'promotional' AND wallet_wallettxnlog.txn_type = 'Debit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Promo Balance Expired%' THEN 'Credit Expiry'
    WHEN wallet_wallettxnlog.component_type = 'promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 THEN 'Promotional Credit'
    WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Debit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.comments LIKE '%Fare Adjustment%' THEN 'Fare Adjustment'
    WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Debit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%DU Money Expired%' THEN 'DU Money Expired'
    WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Debit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%No Longer Using Driveu%' THEN 'No Longer Using Driveu'
    WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Debit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Traffic Violation%' THEN 'Traffic Violation'
    WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Debit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Wallet Refund%' THEN 'Wallet Refund'
    WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Debit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Write off%' THEN 'Write off'
    WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Accident Compensation%' THEN 'Accident Compensation'
    WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Booking Payment Adjustment%' THEN 'Booking Payment Adjustment'
    WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Cancellation Charge Reversal%' THEN 'Cancellation Charge Reversal'
    WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Car missused by Driver%' THEN 'Car missused by Driver'
    WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%DU Money Restored%' THEN 'DU Money Restored'
    WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Dual payment reversed%' THEN 'Dual payment reversed'
    WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Fare Adjustment%' THEN 'Fare Adjustment'
    WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Item Lost/Thefts%' THEN 'Item Lost/Thefts'
    WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Night Charges Waiver%' THEN 'Night Charges Waiver'
    WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%No Longer Using DriveU%' THEN 'No Longer Using DriveU'
    WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Overcharge by driver%' THEN 'Overcharge by driver'
    WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Traffic violation%' THEN 'Traffic violation'
    WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Trip time related%' THEN 'Trip time related'
    WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Wallet Recharge%' THEN 'Wallet Recharge'
    WHEN wallet_wallettxnlog.component_type = 'non-promotional' AND wallet_wallettxnlog.txn_type = 'Credit' AND wallet_wallettxnlog.amount != 0 AND wallet_wallettxnlog.txn_desc LIKE '%Write-off%' THEN 'Write-off'
    ELSE 'Others'
  END AS vertical,
  SUM(IF(wallet_wallettxnlog.txn_type = 'Debit', wallet_wallettxnlog.amount, 0)) AS total_debit,
  SUM(IF(wallet_wallettxnlog.txn_type = 'Credit', wallet_wallettxnlog.amount, 0)) AS total_credit,
  SUM(IF(wallet_wallettxnlog.txn_type = 'Credit', wallet_wallettxnlog.amount, 0)) - SUM(IF(wallet_wallettxnlog.txn_type = 'Debit', wallet_wallettxnlog.amount, 0)) AS net
FROM userprofile_profile up
JOIN auth_user u ON u.id = up.user_id
JOIN wallet_wallet w ON w.object_id = u.id AND w.content_type_id = 4
JOIN wallet_wallettxnlog ON wallet_wallettxnlog.wallet_id = w.id AND wallet_wallettxnlog.defaulted = 0
LEFT OUTER JOIN app_booking ab ON ab.booking_id = wallet_wallettxnlog.reference_id
WHERE wallet_wallettxnlog.created_at >= ? AND wallet_wallettxnlog.created_at < DATE_ADD(?, INTERVAL 1 DAY)
AND (ab.is_b2b IS NULL OR ab.is_b2b != 1 OR wallet_wallettxnlog.component_type != 'promotional')
GROUP BY vertical
ORDER BY vertical
`;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const fromCache = searchParams.get("fromCache") === "true";

  if (!startDate || !endDate)
    return NextResponse.json({ error: "startDate and endDate are required." }, { status: 400 });
  if (!DATE_REGEX.test(startDate) || !DATE_REGEX.test(endDate))
    return NextResponse.json({ error: "Invalid date format." }, { status: 400 });

  const cacheKey = `${startDate}_${endDate}`;

  // Return cached data if requested (initial page load)
  if (fromCache) {
    const cached = await getFromCache(cacheKey);
    if (cached) return NextResponse.json({ ...cached, fromCache: true });
  }

  // Run each query independently — partial failures don't break the rest
  const [b2cResult, b2bResult, dwResult, cwResult] = await Promise.allSettled([
    driveuQuery<Record<string, unknown>>(B2C_SUMMARY_QUERY, [startDate, endDate]),
    driveuQuery<Record<string, unknown>>(B2B_SUMMARY_QUERY, [startDate, endDate]),
    driveuQuery<Record<string, unknown>>(DRIVER_WALLET_VERTICAL_QUERY, [startDate, endDate]),
    driveuQuery<Record<string, unknown>>(CUSTOMER_WALLET_VERTICAL_QUERY, [startDate, endDate]),
  ]);

  const result = {
    b2c:           b2cResult.status === "fulfilled" ? (b2cResult.value[0] ?? null) : null,
    b2b:           b2bResult.status === "fulfilled" ? (b2bResult.value[0] ?? null) : null,
    driverWallet:  dwResult.status  === "fulfilled" ? dwResult.value  : null,
    customerWallet:cwResult.status  === "fulfilled" ? cwResult.value  : null,
    errors: {
      b2c:           b2cResult.status === "rejected" ? "Failed to load B2C data"            : null,
      b2b:           b2bResult.status === "rejected" ? "Failed to load B2B data"            : null,
      driverWallet:  dwResult.status  === "rejected" ? "Failed to load Driver Wallet data"  : null,
      customerWallet:cwResult.status  === "rejected" ? "Failed to load Customer Wallet data": null,
    },
  };

  if (b2cResult.status === "rejected") console.error("[Account Summary] B2C:", b2cResult.reason);
  if (b2bResult.status === "rejected") console.error("[Account Summary] B2B:", b2bResult.reason);
  if (dwResult.status  === "rejected") console.error("[Account Summary] Driver Wallet:", dwResult.reason);
  if (cwResult.status  === "rejected") console.error("[Account Summary] Customer Wallet:", cwResult.reason);

  // Save to cache (background — don't await)
  saveToCache(cacheKey, result);

  return NextResponse.json(result);
}
