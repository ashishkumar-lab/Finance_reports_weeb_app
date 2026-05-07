import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { carRentalQueryLong, logDownload } from "@/lib/db";
import { hasReportPermission } from "@/lib/userDb";
import { generateExcel } from "@/lib/excel";

const QUERY = `
SELECT
    b.id                                                AS booking_id,
    b.booking_ref,
    b.booking_type,
    b.status_id                                         AS booking_status_id,
    bs.code                                             AS booking_status_text,
    b.created_at                                        AS booking_created_at,
    b.pickup_date,
    b.pickup_time,
    b.drop_date,
    b.drop_time,
    t.trip_start_time,
    t.trip_end_time,
    t.actual_distance_km,
    t.total_days                                        AS trip_total_days,
    t.waiting_time_mins,
    t.base_fare                                         AS trip_base_fare,
    t.distance_fare                                     AS extra_km_charges,
    t.time_fare                                         AS extra_hr_charges,
    t.waiting_charges,
    t.toll_charges                                      AS trip_toll_charges,
    t.parking_charges,
    b.night_charges,
    t.driver_batta_total                                AS batta_charges,
    t.subtotal                                          AS trip_subtotal,
    b.discount_applied                                  AS discount,
    t.tax_amount                                        AS gst_amount,
    t.final_price                                       AS trip_final_price,
    CONCAT(c.first_name, ' ', IFNULL(c.last_name, '')) AS customer_name,
    vt.type                                             AS vehicle_type,
    vm.name                                             AS vehicle_make,
    vmo.name                                            AS vehicle_model,
    pl.address                                          AS pickup_address,
    pcity.name                                          AS pickup_city,
    pst.name                                            AS pickup_state,
    pl.pin                                              AS pickup_pincode,
    dl.address                                          AS drop_address,
    dcity.name                                          AS drop_city,
    dst.name                                            AS drop_state,
    dl.pin                                              AS drop_pincode,
    v.name                                              AS vendor_name,
    v.entity_type                                       AS vendor_entity_type,
    v.status                                            AS vendor_status,
    b.estimated_price                                   AS estimatedPrice,
    b.base_fare                                         AS baseFare,
    pt.per_day_rate                                     AS perDayRate,
    pt.driver_night_batta                               AS nightBatta,
    pt.max_km_per_day                                   AS maxKm,
    pt.extra_hour_rate                                  AS extraHrRate,
    pt.extra_km_rate                                    AS extraKmRate,
    txn_agg.paymentAmount,
    txn_agg.paymentStatus,
    txn_agg.paymentGateway,
    txn_agg.paymentTxnId,
    txn_agg.paymentOrderId,
    txn_agg.paymentDate
FROM booking b
LEFT JOIN booking_status bs     ON b.status_id           = bs.id
LEFT JOIN trip t                ON b.id                  = t.booking_id
LEFT JOIN customer c            ON b.customer_id         = c.id
LEFT JOIN vehicle_type vt       ON b.vehicle_type_id     = vt.id
LEFT JOIN vehicle_model vmo     ON b.vehicle_model_id    = vmo.id
LEFT JOIN vehicle_make vm       ON vmo.make_id           = vm.id
LEFT JOIN location pl           ON b.pickup_address_id   = pl.id
LEFT JOIN city_master pcity     ON pl.city_id            = pcity.id
LEFT JOIN state_master pst      ON pcity.state_code      = pst.code
LEFT JOIN location dl           ON b.drop_address_id     = dl.id
LEFT JOIN city_master dcity     ON dl.city_id            = dcity.id
LEFT JOIN state_master dst      ON dcity.state_code      = dst.code
LEFT JOIN vendor v              ON b.vendor_id           = v.id
LEFT JOIN pricing_template pt   ON b.pricing_template_id = pt.id
LEFT JOIN (
    SELECT
        booking_id,
        SUM(amount)                                                                 AS paymentAmount,
        GROUP_CONCAT(DISTINCT status         ORDER BY created_at SEPARATOR ', ')   AS paymentStatus,
        GROUP_CONCAT(DISTINCT gateway        ORDER BY created_at SEPARATOR ', ')   AS paymentGateway,
        GROUP_CONCAT(DISTINCT gateway_txn_id   ORDER BY created_at SEPARATOR ', ') AS paymentTxnId,
        GROUP_CONCAT(DISTINCT gateway_order_id ORDER BY created_at SEPARATOR ', ') AS paymentOrderId,
        GROUP_CONCAT(DISTINCT created_at     ORDER BY created_at SEPARATOR ', ')   AS paymentDate
    FROM \`transaction\`
    WHERE party_type = 'CUSTOMER' AND type = 'PAYMENT' AND status = 'SUCCESS'
    GROUP BY booking_id
) txn_agg ON b.id = txn_agg.booking_id
WHERE b.created_at BETWEEN ? AND ?
ORDER BY b.created_at DESC
`;

const COLUMNS = [
  { header: "Booking ID",            key: "booking_id",          width: 14 },
  { header: "Booking Ref",           key: "booking_ref",         width: 20 },
  { header: "Booking Type",          key: "booking_type",        width: 16 },
  { header: "Status ID",             key: "booking_status_id",   width: 12 },
  { header: "Status",                key: "booking_status_text", width: 16 },
  { header: "Booking Created At",    key: "booking_created_at",  width: 22 },
  { header: "Pickup Date",           key: "pickup_date",         width: 14 },
  { header: "Pickup Time",           key: "pickup_time",         width: 14 },
  { header: "Drop Date",             key: "drop_date",           width: 14 },
  { header: "Drop Time",             key: "drop_time",           width: 14 },
  { header: "Trip Start Time",       key: "trip_start_time",     width: 22 },
  { header: "Trip End Time",         key: "trip_end_time",       width: 22 },
  { header: "Actual Distance (km)",  key: "actual_distance_km",  width: 20 },
  { header: "Trip Total Days",       key: "trip_total_days",     width: 16 },
  { header: "Waiting Time (mins)",   key: "waiting_time_mins",   width: 20 },
  { header: "Trip Base Fare",        key: "trip_base_fare",      width: 16 },
  { header: "Extra KM Charges",      key: "extra_km_charges",    width: 18 },
  { header: "Extra HR Charges",      key: "extra_hr_charges",    width: 18 },
  { header: "Waiting Charges",       key: "waiting_charges",     width: 16 },
  { header: "Toll Charges",          key: "trip_toll_charges",   width: 16 },
  { header: "Parking Charges",       key: "parking_charges",     width: 16 },
  { header: "Night Charges",         key: "night_charges",       width: 16 },
  { header: "Batta Charges",         key: "batta_charges",       width: 16 },
  { header: "Trip Subtotal",         key: "trip_subtotal",       width: 16 },
  { header: "Discount",              key: "discount",            width: 14 },
  { header: "GST Amount",            key: "gst_amount",          width: 14 },
  { header: "Trip Final Price",      key: "trip_final_price",    width: 18 },
  { header: "Customer Name",         key: "customer_name",       width: 22 },
  { header: "Vehicle Type",          key: "vehicle_type",        width: 16 },
  { header: "Vehicle Make",          key: "vehicle_make",        width: 16 },
  { header: "Vehicle Model",         key: "vehicle_model",       width: 16 },
  { header: "Pickup Address",        key: "pickup_address",      width: 30 },
  { header: "Pickup City",           key: "pickup_city",         width: 16 },
  { header: "Pickup State",          key: "pickup_state",        width: 16 },
  { header: "Pickup Pincode",        key: "pickup_pincode",      width: 16 },
  { header: "Drop Address",          key: "drop_address",        width: 30 },
  { header: "Drop City",             key: "drop_city",           width: 16 },
  { header: "Drop State",            key: "drop_state",          width: 16 },
  { header: "Drop Pincode",          key: "drop_pincode",        width: 16 },
  { header: "Vendor Name",           key: "vendor_name",         width: 22 },
  { header: "Vendor Entity Type",    key: "vendor_entity_type",  width: 20 },
  { header: "Vendor Status",         key: "vendor_status",       width: 16 },
  { header: "Estimated Price",       key: "estimatedPrice",      width: 18 },
  { header: "Base Fare",             key: "baseFare",            width: 14 },
  { header: "Per Day Rate",          key: "perDayRate",          width: 14 },
  { header: "Night Batta",           key: "nightBatta",          width: 14 },
  { header: "Max KM/Day",            key: "maxKm",               width: 14 },
  { header: "Extra HR Rate",         key: "extraHrRate",         width: 14 },
  { header: "Extra KM Rate",         key: "extraKmRate",         width: 14 },
  { header: "Payment Amount",        key: "paymentAmount",       width: 18 },
  { header: "Payment Status",        key: "paymentStatus",       width: 18 },
  { header: "Payment Gateway",       key: "paymentGateway",      width: 18 },
  { header: "Payment Txn ID",        key: "paymentTxnId",        width: 24 },
  { header: "Payment Order ID",      key: "paymentOrderId",      width: 24 },
  { header: "Payment Date",          key: "paymentDate",         width: 22 },
];

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.user.isAdmin) {
    if (!session.user.dbUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    try {
      const allowed = await hasReportPermission(session.user.dbUserId, "car-rental-bookings");
      if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } catch {
      return NextResponse.json({ error: "Failed to verify permissions." }, { status: 500 });
    }
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate)
    return NextResponse.json({ error: "startDate and endDate are required." }, { status: 400 });
  if (!DATE_REGEX.test(startDate) || !DATE_REGEX.test(endDate))
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });

  const startDt = `${startDate} 00:00:00`;
  const endDt = `${endDate} 23:59:59`;

  try {
    const rows = await carRentalQueryLong<Record<string, unknown>>(QUERY, [startDt, endDt]);

    if (rows.length > 1048575)
      return NextResponse.json({ error: `Too many records (${rows.length.toLocaleString()}).` }, { status: 400 });

    const buffer = await generateExcel("Car Rental Bookings", COLUMNS, rows);
    await logDownload("Car Rental Booking Report", startDate, endDate, session.user?.email ?? "unknown");

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="car_rental_bookings_${startDate}_${endDate}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("[Car Rental Bookings] Error:", err);
    await logDownload("Car Rental Booking Report", startDate!, endDate!, session.user?.email ?? "unknown", "error");
    return NextResponse.json({ error: "Failed to generate report. Check server logs." }, { status: 500 });
  }
}
