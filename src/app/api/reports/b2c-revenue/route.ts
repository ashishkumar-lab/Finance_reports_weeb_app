import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { driveuQueryLong, logDownload, driveuPool } from "@/lib/db";
import { hasReportPermission } from "@/lib/userDb";
import { generateExcel } from "@/lib/excel";

const B2C_REVENUE_QUERY = `
SELECT
    b.id,
    b.booking_id,
    CONCAT("'", b.booking_id) AS 'Formated booking_id',
    tariff_city.name AS 'City Name',
    tariff_citysubzone.zone_name AS 'Zone Name',
    csbt.service_type,
    b.user_id,
    b.customer_mobile,
    b.driver_id,
    driver.contact_number AS Driver_mobile,
    app_bookingsummary.booking_type,
    app_bookingsummary.car_type,
    app_bookingsummary.trip_started_at,
    app_bookingsummary.trip_ended_at,
    abf.trip_time,
    app_bookingsummary.src,

    CASE
        WHEN app_bookingsummary.booking_type='one_way_trip'
             AND HOUR(b.pickup_datetime) BETWEEN 6 AND 21
            THEN 'P2P'
        WHEN app_bookingsummary.booking_type='one_way_trip'
             AND HOUR(b.pickup_datetime) IN (22,23,0,1,2,3,4,5)
            THEN 'DDND'
        WHEN app_bookingsummary.booking_type='round_trip'
            THEN 'Round Trip'
        WHEN app_bookingsummary.booking_type IN ('outstation','one_way_outstation')
            THEN 'Outstation'
        WHEN app_bookingsummary.booking_type IN
            ('1hr','2hr','4hr','5hr','6hr','8hr','10hr','12hr')
            THEN 'Packages'
    END AS Category,

    CASE
        WHEN pt.status='initiated'
            THEN sib.driver_fee
        ELSE (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges)
    END AS driver_fee,

    sib.base_discount,
    sib.discount_on_driver_fee,
    sib.discount,
    sib.cancellation_charges,

    CASE
        WHEN sib.driver_fee -
             (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges) > 1
        THEN (abf.fare + abf.extra_charges + abf.night_charges + sib.pickup_fare_du - 15)
             - (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges)
        WHEN sib.driver_fee -
             (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges) < -1
        THEN (abf.fare + abf.extra_charges + abf.night_charges + sib.pickup_fare_du - 15)
             - (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges)
        ELSE sib.convenience_fee
    END AS convenience_fee,

    sib.du_secure_fee,
    sib.platform_fee,

    CASE
        WHEN JSON_VALID(sib.extra_data)
        THEN JSON_UNQUOTE(JSON_EXTRACT(sib.extra_data, '$.du_black_fee'))
        ELSE NULL
    END AS du_black_amt,

    CASE
        WHEN sib.driver_fee -
             (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges) > 1
        THEN (abf.fare + abf.extra_charges + abf.night_charges + sib.pickup_fare_du
             - sib.discount - 15)
             - (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges)
             + sib.cancellation_charges + sib.du_secure_fee + sib.platform_fee
        WHEN sib.driver_fee -
             (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges) < -1
        THEN (abf.fare + abf.extra_charges + abf.night_charges + sib.pickup_fare_du
             - sib.discount - 15)
             - (sde.trip_time_earnings + sde.night_charges + sde.one_way_charges)
             + sib.cancellation_charges + sib.du_secure_fee + sib.platform_fee
        ELSE sib.taxable_amount
    END AS taxable_amount,

    sib.cgst,
    sib.sgst,

    CASE
        WHEN b.pickup_datetime >= '2025-01-20 16:00:00'
            THEN sib.subtotal
        ELSE sib.subtotal + sib.cancellation_charges
             + (sib.cancellation_charges * 0.18)
    END AS subtotal,

    sib.rounding_value,

    CASE
        WHEN b.pickup_datetime >= '2025-01-20 16:00:00'
            THEN sib.subtotal + sib.rounding_value
        ELSE sib.subtotal + sib.cancellation_charges
             + (sib.cancellation_charges * 0.18)
             + sib.rounding_value
    END AS payable,

    sib.pickup_fare,
    sib.pickup_fare_driver,
    sib.pickup_fare_du,

    CASE
        WHEN pt.status='initiated'
            THEN 'Not Paid'
        ELSE 'Paid'
    END AS payment_status,

    sib.gstin_number,

    CASE
        WHEN pt.du_credits > 0 AND abf.payment_mode='amazonpay'
            THEN 'DU Money + Amazon Pay'
        WHEN pt.du_credits > 0 AND abf.payment_mode='simpl'
            THEN 'DU Money + Simpl'
        WHEN pt.du_credits > 0 AND abf.payment_mode='cash'
            THEN 'DU Money + Cash'
        WHEN abf.payment_mode='simpl'
            THEN 'Simpl'
        WHEN abf.payment_mode='amazonpay'
            THEN 'Amazon Pay'
        ELSE sib.payment_mode
    END AS payment_mode,

    CASE
        WHEN pt.issuing_bank IN ('AmazonPay','Simpl')
            THEN pt.net_amount_debit
        ELSE ''
    END AS external_wallet_amount,

    CASE
        WHEN pt.issuing_bank IN ('AmazonPay','Simpl')
            THEN pti.txn_id
        ELSE ''
    END AS external_txn_id,

    earning_plan.name AS earning_plan,

    IF(discounts_dupassredemption.user_id IS NOT NULL,
        'Active',
        'Non-Active') AS is_du_black

FROM app_booking AS b

JOIN tariff_city
    ON b.city_id = tariff_city.id

JOIN app_bookingsummary
    ON app_bookingsummary.booking_id = b.id

LEFT JOIN tariff_citysubzone
    ON tariff_citysubzone.id = app_bookingsummary.zone_id

JOIN tariff_cityservicebookingtype AS csbt
    ON app_bookingsummary.city_service_booking_id = csbt.id

JOIN driver_driver AS driver
    ON driver.id = b.driver_id

JOIN app_bookingfare AS abf
    ON abf.booking_id = b.id

LEFT JOIN payment_transaction AS pt
    ON pt.booking_id = b.booking_id

JOIN settlements_invoicebreakup AS sib
    ON sib.booking_id = b.id

LEFT JOIN settlements_driverearning AS sde
    ON sde.booking_id = b.id

LEFT JOIN payment_transactionid pti
    ON pti.transaction_id = pt.id

LEFT JOIN driver_earningdays
    ON driver_earningdays.driver_id = b.driver_id
   AND driver_earningdays.date = DATE(b.pickup_datetime)

LEFT JOIN earning_plan
    ON earning_plan.id = driver_earningdays.plan_id

LEFT OUTER JOIN discounts_dupassredemption
    ON discounts_dupassredemption.user_id = b.user_id
   AND DATE(b.pickup_datetime)
       BETWEEN discounts_dupassredemption.created_at
           AND discounts_dupassredemption.valid_till

WHERE sib.is_active = TRUE
AND b.status = 5
AND b.is_b2b = 0
AND DATE(app_bookingsummary.trip_ended_at) BETWEEN ? AND ?

GROUP BY b.booking_id

ORDER BY app_bookingsummary.trip_ended_at
`;

const COLUMNS = [
  { header: "ID",                     key: "id",                       width: 12 },
  { header: "Booking ID",             key: "booking_id",               width: 22 },
  { header: "Formatted Booking ID",   key: "Formated booking_id",      width: 24 },
  { header: "City Name",              key: "City Name",                width: 18 },
  { header: "Zone Name",              key: "Zone Name",                width: 20 },
  { header: "Service Type",           key: "service_type",             width: 18 },
  { header: "User ID",                key: "user_id",                  width: 14 },
  { header: "Customer Mobile",        key: "customer_mobile",          width: 18 },
  { header: "Driver ID",              key: "driver_id",                width: 14 },
  { header: "Driver Mobile",          key: "Driver_mobile",            width: 18 },
  { header: "Booking Type",           key: "booking_type",             width: 20 },
  { header: "Car Type",               key: "car_type",                 width: 16 },
  { header: "Trip Started At",        key: "trip_started_at",          width: 22 },
  { header: "Trip Ended At",          key: "trip_ended_at",            width: 22 },
  { header: "Trip Time",              key: "trip_time",                width: 14 },
  { header: "Src",                    key: "src",                      width: 14 },
  { header: "Category",              key: "Category",                 width: 16 },
  { header: "Driver Fee",             key: "driver_fee",               width: 14 },
  { header: "Base Discount",          key: "base_discount",            width: 16 },
  { header: "Discount on Driver Fee", key: "discount_on_driver_fee",   width: 22 },
  { header: "Discount",               key: "discount",                 width: 14 },
  { header: "Cancellation Charges",   key: "cancellation_charges",     width: 22 },
  { header: "Convenience Fee",        key: "convenience_fee",          width: 18 },
  { header: "DU Secure Fee",          key: "du_secure_fee",            width: 16 },
  { header: "Platform Fee",           key: "platform_fee",             width: 16 },
  { header: "DU Black Amount",        key: "du_black_amt",             width: 16 },
  { header: "Taxable Amount",         key: "taxable_amount",           width: 16 },
  { header: "CGST",                   key: "cgst",                     width: 12 },
  { header: "SGST",                   key: "sgst",                     width: 12 },
  { header: "Subtotal",               key: "subtotal",                 width: 14 },
  { header: "Rounding Value",         key: "rounding_value",           width: 16 },
  { header: "Payable",                key: "payable",                  width: 14 },
  { header: "Pickup Fare",            key: "pickup_fare",              width: 14 },
  { header: "Pickup Fare Driver",     key: "pickup_fare_driver",       width: 20 },
  { header: "Pickup Fare DU",         key: "pickup_fare_du",           width: 18 },
  { header: "Payment Status",         key: "payment_status",           width: 16 },
  { header: "GSTIN Number",           key: "gstin_number",             width: 20 },
  { header: "Payment Mode",           key: "payment_mode",             width: 24 },
  { header: "External Wallet Amount", key: "external_wallet_amount",   width: 24 },
  { header: "External Txn ID",        key: "external_txn_id",          width: 24 },
  { header: "Earning Plan",           key: "earning_plan",             width: 18 },
  { header: "Is DU Black",            key: "is_du_black",              width: 14 },
];

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.isAdmin) {
    if (!session.user.dbUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const allowed = await hasReportPermission(session.user.dbUserId, "b2c-revenue");
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
    const rows = await driveuQueryLong<Record<string, unknown>>(B2C_REVENUE_QUERY, [startDate, endDate]);

    if (rows.length > 1048575) {
      return NextResponse.json(
        { error: `Too many records (${rows.length.toLocaleString()}). Exceeds Excel's maximum row limit of 1,048,575.` },
        { status: 400 }
      );
    }

    const buffer = await generateExcel("B2C Revenue", COLUMNS, rows);
    await logDownload("B2C Revenue Report", startDate, endDate, session.user?.email ?? "unknown");

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="b2c_revenue_${startDate}_${endDate}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("[B2C Revenue] Error:", err);
    await logDownload("B2C Revenue Report", startDate!, endDate!, session.user?.email ?? "unknown", "error");
    return NextResponse.json(
      { error: "Failed to generate report. Check server logs." },
      { status: 500 }
    );
  }
}
