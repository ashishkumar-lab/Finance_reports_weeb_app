import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { logDownload } from "@/lib/db";
import { generateExcel } from "@/lib/excel";
import { buildReport, PerfRow } from "@/lib/b2bClientPerf";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type IncentiveType = "specific" | "unspecific" | "both";

function parseList(sp: URLSearchParams, key: string): string[] {
  return sp.getAll(key).flatMap((v) => v.split(",")).filter(Boolean);
}

function r2(v: number) { return Math.round(v * 100) / 100; }

function deriveRow(r: PerfRow, incentiveType: IncentiveType) {
  const selIncentive =
    incentiveType === "specific"   ? r.specific_trip_incentive :
    incentiveType === "unspecific" ? r.total_unspecific_incentive :
                                      r.total_incentive;

  const doneWith =
    incentiveType === "specific"   ? r.done_with_specific :
    incentiveType === "unspecific" ? r.done_with_unspecific :
                                      r.done_with_any;

  const ft_pct               = r.no_of_requests > 0 ? r2(r.done / r.no_of_requests * 100) : 0;
  const incentive_per_trip   = r.no_of_requests > 0 ? r2(selIncentive / r.no_of_requests) : 0;
  const margin_after_inc     = r2(r.trip_level_margin - selIncentive);
  const margin_after_inc_pct = r.total_fare > 0 ? r2(margin_after_inc / r.total_fare * 100) : 0;
  const done_without         = r.done - doneWith;
  const pct_done_with        = r.done > 0 ? r2(doneWith / r.done * 100) : 0;
  const pct_done_without     = r.done > 0 ? r2(done_without / r.done * 100) : 0;

  return {
    client_name:                  r.client_name,
    city:                         r.city,
    no_of_requests:               r.no_of_requests,
    done:                         r.done,
    unfulfilled:                  r.unfulfilled,
    ft_pct,
    total_fare:                   r.total_fare,
    driver_fare:                  r.driver_fare,
    trip_level_margin:            r.trip_level_margin,
    trip_level_margin_pct:        r.trip_level_margin_pct,
    per_trip_incentive:           r.per_trip_incentive,
    ft_incentive:                 r.ft_incentive,
    dry_run_incentive:            r.dry_run_incentive,
    specific_trip_incentive:      r.specific_trip_incentive,
    daily_incentive:              r.daily_incentive,
    weekly_incentive:             r.weekly_incentive,
    monthly_incentive:            r.monthly_incentive,
    total_unspecific_incentive:   r.total_unspecific_incentive,
    total_incentive:              r.total_incentive,
    incentive_per_trip,
    margin_after_incentive:       margin_after_inc,
    margin_after_incentive_pct:   margin_after_inc_pct,
    done_with_incentive:          doneWith,
    pct_done_with_incentive:      pct_done_with,
    done_without_incentive:       done_without,
    pct_done_without_incentive:   pct_done_without,
  };
}

const COLUMNS = [
  { header: "Client Name",                    key: "client_name",                  width: 28 },
  { header: "City",                            key: "city",                         width: 18 },
  { header: "No of Requests",                  key: "no_of_requests",               width: 14 },
  { header: "Done",                            key: "done",                         width: 10 },
  { header: "Unfulfilled",                     key: "unfulfilled",                  width: 12 },
  { header: "FT%",                             key: "ft_pct",                       width: 10 },
  { header: "Total Fare",                      key: "total_fare",                   width: 14 },
  { header: "Driver Fare",                     key: "driver_fare",                  width: 14 },
  { header: "Trip Level Margin",               key: "trip_level_margin",            width: 18 },
  { header: "Trip Level Margin %",             key: "trip_level_margin_pct",        width: 18 },
  { header: "Per Trip Incentive",              key: "per_trip_incentive",           width: 18 },
  { header: "FT Incentive",                    key: "ft_incentive",                 width: 14 },
  { header: "Dry Run Incentive",               key: "dry_run_incentive",            width: 18 },
  { header: "Specific Trip Incentive",         key: "specific_trip_incentive",      width: 22 },
  { header: "Daily Incentive (Amortized)",     key: "daily_incentive",              width: 22 },
  { header: "Weekly Incentive (Amortized)",    key: "weekly_incentive",             width: 22 },
  { header: "Monthly Incentive (Amortized)",   key: "monthly_incentive",            width: 22 },
  { header: "Total Unspecific Incentive",      key: "total_unspecific_incentive",   width: 24 },
  { header: "Total Incentive",                 key: "total_incentive",              width: 16 },
  { header: "Incentive Per Trip",              key: "incentive_per_trip",           width: 18 },
  { header: "Margin After Incentive",          key: "margin_after_incentive",       width: 20 },
  { header: "Margin After Incentive %",        key: "margin_after_incentive_pct",   width: 22 },
  { header: "Done With Incentive",             key: "done_with_incentive",          width: 18 },
  { header: "% Done With Incentive",           key: "pct_done_with_incentive",      width: 20 },
  { header: "Done Without Incentive",          key: "done_without_incentive",       width: 20 },
  { header: "% Done Without Incentive",        key: "pct_done_without_incentive",   width: 22 },
];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startDate     = searchParams.get("startDate");
  const endDate       = searchParams.get("endDate");
  const incentiveType = (searchParams.get("incentiveType") ?? "both") as IncentiveType;
  const clients       = parseList(searchParams, "clients");
  const cities        = parseList(searchParams, "cities");

  if (!startDate || !endDate)
    return NextResponse.json({ error: "startDate and endDate are required." }, { status: 400 });
  if (!DATE_REGEX.test(startDate) || !DATE_REGEX.test(endDate))
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
  if (!["specific", "unspecific", "both"].includes(incentiveType))
    return NextResponse.json({ error: "Invalid incentiveType." }, { status: 400 });

  try {
    const rows = await buildReport(startDate, endDate, clients, cities);
    const xlsxData = rows.map((r) => deriveRow(r, incentiveType) as Record<string, unknown>);

    const buffer = await generateExcel("B2B Performance", COLUMNS, xlsxData);
    await logDownload("B2B Client Performance Report", startDate, endDate, session.user?.email ?? "unknown");

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="b2b_client_performance_${startDate}_${endDate}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("[B2B Perf Download] Error:", err);
    await logDownload("B2B Client Performance Report", startDate!, endDate!, session.user?.email ?? "unknown", "error");
    return NextResponse.json({ error: "Failed to generate report." }, { status: 500 });
  }
}
