import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { carRentalQueryLong } from "@/lib/db";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const VALID_FILTERS = ["all", "completed", "cancelled", "pending", "confirmed", "others"] as const;
type Filter = typeof VALID_FILTERS[number];

function filterClause(filter: Filter): string {
  switch (filter) {
    case "completed":
      return "AND b.status_id IN (4, 8)";
    case "cancelled":
      return "AND (UPPER(IFNULL(bs.code,'')) LIKE '%CANCEL%' OR UPPER(IFNULL(bs.code,'')) LIKE '%REJECT%')";
    case "pending":
      return "AND b.status_id NOT IN (4, 8) AND (UPPER(IFNULL(bs.code,'')) LIKE '%PENDING%' OR UPPER(IFNULL(bs.code,'')) LIKE '%NEW%' OR b.status_id = 1)";
    case "confirmed":
      return "AND b.status_id NOT IN (4, 8) AND (UPPER(IFNULL(bs.code,'')) LIKE '%CONFIRM%' OR UPPER(IFNULL(bs.code,'')) LIKE '%APPROV%' OR b.status_id IN (2, 3))";
    case "others":
      return `AND b.status_id NOT IN (4, 8)
              AND UPPER(IFNULL(bs.code,'')) NOT LIKE '%CANCEL%'
              AND UPPER(IFNULL(bs.code,'')) NOT LIKE '%REJECT%'
              AND UPPER(IFNULL(bs.code,'')) NOT LIKE '%PENDING%'
              AND UPPER(IFNULL(bs.code,'')) NOT LIKE '%NEW%'
              AND b.status_id != 1
              AND UPPER(IFNULL(bs.code,'')) NOT LIKE '%CONFIRM%'
              AND UPPER(IFNULL(bs.code,'')) NOT LIKE '%APPROV%'
              AND b.status_id NOT IN (2, 3)`;
    default:
      return "";
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate   = searchParams.get("endDate");
  const filter    = (searchParams.get("filter") ?? "all") as Filter;
  const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit     = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") ?? "50", 10)));
  const offset    = (page - 1) * limit;

  if (!startDate || !endDate)
    return NextResponse.json({ error: "startDate and endDate are required." }, { status: 400 });
  if (!DATE_REGEX.test(startDate) || !DATE_REGEX.test(endDate))
    return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
  if (!VALID_FILTERS.includes(filter))
    return NextResponse.json({ error: "Invalid filter." }, { status: 400 });

  const startDt = `${startDate} 00:00:00`;
  const endDt   = `${endDate} 23:59:59`;
  const where   = filterClause(filter);

  const baseQuery = `
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
    ${where}
  `;

  try {
    const [countRows, rows] = await Promise.all([
      carRentalQueryLong<{ total: number }>(
        `SELECT COUNT(*) AS total ${baseQuery}`,
        [startDt, endDt]
      ),
      carRentalQueryLong<Record<string, unknown>>(
        `SELECT
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
        ${baseQuery}
        ORDER BY b.created_at DESC
        LIMIT ${limit} OFFSET ${offset}`,
        [startDt, endDt]
      ),
    ]);

    const total = Number(countRows[0]?.total ?? 0);

    return NextResponse.json({ rows, total, page, limit });
  } catch (err) {
    console.error("[Car Rental Detail] Error:", err);
    return NextResponse.json({ error: "Failed to load detail data." }, { status: 500 });
  }
}
