import { driveuQueryLong } from "@/lib/db";

// ── Types ─────────────────────────────────────────────────────────────────────

type BookingRow    = { client_name: string; city: string; no_of_requests: number; done: number; unfulfilled: number; total_fare: number; driver_fare: number };
type SpecificAgg   = { client_name: string; city: string; per_trip_incentive: number; ft_incentive: number; dry_run_incentive: number; done_with_specific: number };
type SpecificBk    = { client_name: string; city: string; booking_pk: number };
type DriverTxnRow  = { driver_id: number; daily_total: number; weekly_total: number; monthly_total: number };

export type PerfRow = {
  client_name: string;
  city: string;
  no_of_requests: number;
  done: number;
  unfulfilled: number;
  total_fare: number;
  driver_fare: number;
  trip_level_margin: number;
  trip_level_margin_pct: number;
  per_trip_incentive: number;
  ft_incentive: number;
  dry_run_incentive: number;
  specific_trip_incentive: number;
  daily_incentive: number;
  weekly_incentive: number;
  monthly_incentive: number;
  total_unspecific_incentive: number;
  total_incentive: number;
  done_with_specific: number;
  done_with_unspecific: number;
  done_with_any: number;
};

// ── SQL builders ──────────────────────────────────────────────────────────────

function bookingSql(clientWhere: string, cityWhere: string) {
  return `
    SELECT
      ao.name AS client_name,
      CASE WHEN tc.name LIKE '%Gurgaon%' OR tcz.zone_name LIKE '%Gurgaon%' THEN 'Gurgaon' ELSE tc.name END AS city,
      COUNT(DISTINCT b.id)                                                   AS no_of_requests,
      COUNT(DISTINCT CASE WHEN b.status = 5 THEN b.id END)                   AS done,
      COUNT(DISTINCT b.id)
        - COUNT(DISTINCT CASE WHEN b.status = 5 THEN b.id END)               AS unfulfilled,
      ROUND(SUM(CASE WHEN b.status = 5
        THEN IFNULL(abf.fare,0) + IFNULL(abf.extra_charges,0) + IFNULL(abf.night_charges,0)
        ELSE 0 END), 2)                                                       AS total_fare,
      ROUND(SUM(CASE WHEN b.status = 5
        THEN IFNULL(sde.trip_time_earnings,0) + IFNULL(sde.night_charges,0) + IFNULL(sde.one_way_charges,0)
        ELSE 0 END), 2)                                                       AS driver_fare
    FROM app_booking b
    JOIN affiliate_organisation ao    ON ao.id = b.organisation_id
    JOIN tariff_city tc               ON tc.id = b.city_id
    LEFT JOIN app_bookingsummary abs2 ON abs2.booking_id = b.id
    LEFT JOIN tariff_citysubzone tcz  ON tcz.id = abs2.zone_id
    LEFT JOIN app_bookingfare abf     ON abf.booking_id = b.id
    LEFT JOIN settlements_driverearning sde ON sde.booking_id = b.id
    WHERE b.is_b2b = 1
      AND b.pickup_datetime >= ? AND b.pickup_datetime < DATE_ADD(?, INTERVAL 1 DAY)
      ${clientWhere} ${cityWhere}
    GROUP BY ao.name,
             CASE WHEN tc.name LIKE '%Gurgaon%' OR tcz.zone_name LIKE '%Gurgaon%' THEN 'Gurgaon' ELSE tc.name END
    ORDER BY ao.name, city
  `;
}

function specificAggSql(clientWhere: string, cityWhere: string) {
  return `
    SELECT
      ao.name AS client_name,
      CASE WHEN tc.name LIKE '%Gurgaon%' OR tcz.zone_name LIKE '%Gurgaon%' THEN 'Gurgaon' ELSE tc.name END AS city,
      ROUND(SUM(CASE WHEN wtl.txn_desc LIKE '%Per Trip Incentive%' AND wtl.txn_desc NOT LIKE '%fulfilment%'
                THEN wtl.amount ELSE 0 END), 2) AS per_trip_incentive,
      ROUND(SUM(CASE WHEN wtl.txn_desc LIKE '%Per Trip Incentive: fulfilment%'
                THEN wtl.amount ELSE 0 END), 2) AS ft_incentive,
      ROUND(SUM(CASE WHEN wtl.txn_desc LIKE '%Dry Run Incentive%'
                THEN wtl.amount ELSE 0 END), 2) AS dry_run_incentive,
      COUNT(DISTINCT b.id)                       AS done_with_specific
    FROM wallet_wallettxnlog wtl
    JOIN wallet_wallet ww ON ww.id = wtl.wallet_id AND ww.content_type_id = 10
    JOIN app_booking b    ON b.booking_id = wtl.reference_id AND b.is_b2b = 1 AND b.status = 5
    JOIN affiliate_organisation ao    ON ao.id = b.organisation_id
    JOIN tariff_city tc               ON tc.id = b.city_id
    LEFT JOIN app_bookingsummary abs2 ON abs2.booking_id = b.id
    LEFT JOIN tariff_citysubzone tcz  ON tcz.id = abs2.zone_id
    WHERE wtl.txn_type = 'CREDIT' AND wtl.defaulted = 0
      AND (wtl.txn_desc LIKE '%Per Trip Incentive%' OR wtl.txn_desc LIKE '%Dry Run Incentive%')
      AND b.pickup_datetime >= ? AND b.pickup_datetime < DATE_ADD(?, INTERVAL 1 DAY)
      ${clientWhere} ${cityWhere}
    GROUP BY ao.name,
             CASE WHEN tc.name LIKE '%Gurgaon%' OR tcz.zone_name LIKE '%Gurgaon%' THEN 'Gurgaon' ELSE tc.name END
  `;
}

function specificBkSql(clientWhere: string, cityWhere: string) {
  return `
    SELECT DISTINCT
      ao.name AS client_name,
      CASE WHEN tc.name LIKE '%Gurgaon%' OR tcz.zone_name LIKE '%Gurgaon%' THEN 'Gurgaon' ELSE tc.name END AS city,
      b.id AS booking_pk
    FROM wallet_wallettxnlog wtl
    JOIN wallet_wallet ww ON ww.id = wtl.wallet_id AND ww.content_type_id = 10
    JOIN app_booking b    ON b.booking_id = wtl.reference_id AND b.is_b2b = 1 AND b.status = 5
    JOIN affiliate_organisation ao    ON ao.id = b.organisation_id
    JOIN tariff_city tc               ON tc.id = b.city_id
    LEFT JOIN app_bookingsummary abs2 ON abs2.booking_id = b.id
    LEFT JOIN tariff_citysubzone tcz  ON tcz.id = abs2.zone_id
    WHERE wtl.txn_type = 'CREDIT' AND wtl.defaulted = 0
      AND (wtl.txn_desc LIKE '%Per Trip Incentive%' OR wtl.txn_desc LIKE '%Dry Run Incentive%')
      AND b.pickup_datetime >= ? AND b.pickup_datetime < DATE_ADD(?, INTERVAL 1 DAY)
      ${clientWhere} ${cityWhere}
  `;
}

const DRIVER_TXNS_SQL = `
  SELECT
    ww.object_id AS driver_id,
    SUM(CASE WHEN wtl.txn_desc LIKE '%Daily Incentive%' OR wtl.txn_desc LIKE '%Ladder%'
             THEN wtl.amount ELSE 0 END) AS daily_total,
    SUM(CASE WHEN wtl.txn_desc LIKE '%Weekly Incentive%'
             THEN wtl.amount ELSE 0 END) AS weekly_total,
    SUM(CASE WHEN wtl.txn_desc LIKE '%Monthly Incentive%'
              OR wtl.txn_desc LIKE '%ONB_Refund%'
              OR wtl.txn_desc LIKE '%b2b-incentive%'
             THEN wtl.amount ELSE 0 END) AS monthly_total
  FROM wallet_wallettxnlog wtl
  JOIN wallet_wallet ww ON ww.id = wtl.wallet_id AND ww.content_type_id = 10
  WHERE wtl.txn_type = 'CREDIT' AND wtl.defaulted = 0
    AND DATE(wtl.created_at) BETWEEN ? AND ?
    AND (wtl.txn_desc LIKE '%Daily Incentive%' OR wtl.txn_desc LIKE '%Ladder%'
         OR wtl.txn_desc LIKE '%Weekly Incentive%' OR wtl.txn_desc LIKE '%Monthly Incentive%'
         OR wtl.txn_desc LIKE '%ONB_Refund%' OR wtl.txn_desc LIKE '%b2b-incentive%')
    AND wtl.txn_desc NOT LIKE '%Per Trip%'
  GROUP BY ww.object_id
  HAVING daily_total > 0 OR weekly_total > 0 OR monthly_total > 0
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function inSql(arr: (string | number)[]): { sql: string; params: (string | number)[] } {
  if (arr.length === 0) return { sql: "1=0", params: [] };
  return { sql: `(${arr.map(() => "?").join(",")})`, params: arr };
}

function r2(v: number) { return Math.round(v * 100) / 100; }

// ── Main report builder ───────────────────────────────────────────────────────

export async function buildReport(
  startDate: string,
  endDate: string,
  clients: string[],
  cities: string[]
): Promise<PerfRow[]> {
  const clientWhere = clients.length > 0
    ? `AND ao.name IN (${clients.map(() => "?").join(",")})`
    : "";
  const cityWhere = cities.length > 0
    ? `AND (CASE WHEN tc.name LIKE '%Gurgaon%' OR tcz.zone_name LIKE '%Gurgaon%' THEN 'Gurgaon' ELSE tc.name END) IN (${cities.map(() => "?").join(",")})`
    : "";

  const filterParams: (string | number)[] = [...clients, ...cities];

  const [bookingRows, specificAggRows, specificBkRows, driverTxnRows] = await Promise.all([
    driveuQueryLong<BookingRow>(bookingSql(clientWhere, cityWhere), [startDate, endDate, ...filterParams]),
    driveuQueryLong<SpecificAgg>(specificAggSql(clientWhere, cityWhere), [startDate, endDate, ...filterParams]),
    driveuQueryLong<SpecificBk>(specificBkSql(clientWhere, cityWhere), [startDate, endDate, ...filterParams]),
    driveuQueryLong<DriverTxnRow>(DRIVER_TXNS_SQL, [startDate, endDate]),
  ]);

  // Build lookup maps
  const specificAggMap = new Map<string, SpecificAgg>();
  for (const r of specificAggRows) specificAggMap.set(`${r.client_name}|||${r.city}`, r);

  const specificBkSets = new Map<string, Set<number>>();
  for (const r of specificBkRows) {
    const key = `${r.client_name}|||${r.city}`;
    if (!specificBkSets.has(key)) specificBkSets.set(key, new Set());
    specificBkSets.get(key)!.add(Number(r.booking_pk));
  }

  // Unspecific incentive amortization
  const unspecificMap = new Map<string, { daily: number; weekly: number; monthly: number; bk_set: Set<number> }>();

  if (driverTxnRows.length > 0) {
    const driverTxnMap = new Map<number, DriverTxnRow>();
    for (const t of driverTxnRows) driverTxnMap.set(Number(t.driver_id), t);
    const driverIds = [...driverTxnMap.keys()];
    const { sql: driverIn, params: driverParams } = inSql(driverIds);

    const [driverDoneRows, b2bBookingRows] = await Promise.all([
      driveuQueryLong<{ driver_id: number; total_done: number }>(
        `SELECT driver_id, COUNT(*) AS total_done
         FROM app_booking
         WHERE status = 5
           AND pickup_datetime >= ? AND pickup_datetime < DATE_ADD(?, INTERVAL 1 DAY)
           AND driver_id IN ${driverIn}
         GROUP BY driver_id`,
        [startDate, endDate, ...driverParams]
      ),
      driveuQueryLong<{ booking_pk: number; driver_id: number; client_name: string; city: string }>(
        `SELECT b.id AS booking_pk, b.driver_id,
                ao.name AS client_name,
                CASE WHEN tc.name LIKE '%Gurgaon%' OR tcz.zone_name LIKE '%Gurgaon%' THEN 'Gurgaon' ELSE tc.name END AS city
         FROM app_booking b
         JOIN affiliate_organisation ao    ON ao.id = b.organisation_id
         JOIN tariff_city tc               ON tc.id = b.city_id
         LEFT JOIN app_bookingsummary abs2 ON abs2.booking_id = b.id
         LEFT JOIN tariff_citysubzone tcz  ON tcz.id = abs2.zone_id
         WHERE b.is_b2b = 1 AND b.status = 5
           AND b.pickup_datetime >= ? AND b.pickup_datetime < DATE_ADD(?, INTERVAL 1 DAY)
           AND b.driver_id IN ${driverIn}`,
        [startDate, endDate, ...driverParams]
      ),
    ]);

    const driverDoneMap = new Map<number, number>();
    for (const d of driverDoneRows) driverDoneMap.set(Number(d.driver_id), Number(d.total_done));

    for (const bk of b2bBookingRows) {
      const txn = driverTxnMap.get(Number(bk.driver_id));
      if (!txn) continue;
      const totalDone = driverDoneMap.get(Number(bk.driver_id)) ?? 1;
      const key = `${bk.client_name}|||${bk.city}`;
      if (!unspecificMap.has(key)) unspecificMap.set(key, { daily: 0, weekly: 0, monthly: 0, bk_set: new Set() });
      const entry = unspecificMap.get(key)!;
      entry.daily   += Number(txn.daily_total)   / totalDone;
      entry.weekly  += Number(txn.weekly_total)  / totalDone;
      entry.monthly += Number(txn.monthly_total) / totalDone;
      entry.bk_set.add(Number(bk.booking_pk));
    }
  }

  // Merge into final rows
  return bookingRows.map((bk) => {
    const key  = `${bk.client_name}|||${bk.city}`;
    const spec = specificAggMap.get(key);
    const unsp = unspecificMap.get(key);

    const total_fare            = r2(Number(bk.total_fare));
    const driver_fare           = r2(Number(bk.driver_fare));
    const trip_level_margin     = r2(total_fare - driver_fare);
    const trip_level_margin_pct = total_fare > 0 ? r2(trip_level_margin / total_fare * 100) : 0;

    const per_trip_incentive      = r2(Number(spec?.per_trip_incentive ?? 0));
    const ft_incentive            = r2(Number(spec?.ft_incentive ?? 0));
    const dry_run_incentive       = r2(Number(spec?.dry_run_incentive ?? 0));
    const specific_trip_incentive = r2(per_trip_incentive + ft_incentive + dry_run_incentive);

    const daily_incentive            = r2(unsp?.daily   ?? 0);
    const weekly_incentive           = r2(unsp?.weekly  ?? 0);
    const monthly_incentive          = r2(unsp?.monthly ?? 0);
    const total_unspecific_incentive = r2(daily_incentive + weekly_incentive + monthly_incentive);
    const total_incentive            = r2(specific_trip_incentive + total_unspecific_incentive);

    const done_with_specific    = Number(spec?.done_with_specific ?? 0);
    const done_with_unspecific  = unsp?.bk_set.size ?? 0;

    const specSet = specificBkSets.get(key) ?? new Set<number>();
    const unspSet = unsp?.bk_set ?? new Set<number>();
    const done_with_any = new Set([...specSet, ...unspSet]).size;

    return {
      client_name: bk.client_name,
      city: bk.city,
      no_of_requests: Number(bk.no_of_requests),
      done:           Number(bk.done),
      unfulfilled:    Number(bk.unfulfilled),
      total_fare,
      driver_fare,
      trip_level_margin,
      trip_level_margin_pct,
      per_trip_incentive,
      ft_incentive,
      dry_run_incentive,
      specific_trip_incentive,
      daily_incentive,
      weekly_incentive,
      monthly_incentive,
      total_unspecific_incentive,
      total_incentive,
      done_with_specific,
      done_with_unspecific,
      done_with_any,
    };
  });
}

// ── Filter options ────────────────────────────────────────────────────────────

export async function fetchFilterOptions(startDate: string, endDate: string): Promise<{ clients: string[]; cities: string[] }> {
  const [clientRows, cityRows] = await Promise.all([
    driveuQueryLong<{ client_name: string }>(
      `SELECT DISTINCT ao.name AS client_name
       FROM app_booking b
       JOIN affiliate_organisation ao ON ao.id = b.organisation_id
       WHERE b.is_b2b = 1
         AND b.pickup_datetime >= ? AND b.pickup_datetime < DATE_ADD(?, INTERVAL 1 DAY)
       ORDER BY ao.name`,
      [startDate, endDate]
    ),
    driveuQueryLong<{ city: string }>(
      `SELECT DISTINCT
         CASE WHEN tc.name LIKE '%Gurgaon%' OR tcz.zone_name LIKE '%Gurgaon%' THEN 'Gurgaon' ELSE tc.name END AS city
       FROM app_booking b
       JOIN tariff_city tc               ON tc.id = b.city_id
       LEFT JOIN app_bookingsummary abs2 ON abs2.booking_id = b.id
       LEFT JOIN tariff_citysubzone tcz  ON tcz.id = abs2.zone_id
       WHERE b.is_b2b = 1
         AND b.pickup_datetime >= ? AND b.pickup_datetime < DATE_ADD(?, INTERVAL 1 DAY)
       ORDER BY city`,
      [startDate, endDate]
    ),
  ]);
  return {
    clients: clientRows.map((r) => r.client_name),
    cities:  cityRows.map((r) => r.city),
  };
}
