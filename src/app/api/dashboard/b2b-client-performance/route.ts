import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { buildReport, fetchFilterOptions } from "@/lib/b2bClientPerf";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseList(sp: URLSearchParams, key: string): string[] {
  return sp.getAll(key).flatMap((v) => v.split(",")).filter(Boolean);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const action    = searchParams.get("action");
  const startDate = searchParams.get("startDate");
  const endDate   = searchParams.get("endDate");

  if (!startDate || !endDate)
    return NextResponse.json({ error: "startDate and endDate are required." }, { status: 400 });
  if (!DATE_REGEX.test(startDate) || !DATE_REGEX.test(endDate))
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });

  if (action === "filters") {
    try {
      const options = await fetchFilterOptions(startDate, endDate);
      return NextResponse.json(options);
    } catch (err) {
      console.error("[B2B Perf] Filters error:", err);
      return NextResponse.json({ error: "Failed to load filter options." }, { status: 500 });
    }
  }

  const clients = parseList(searchParams, "clients");
  const cities  = parseList(searchParams, "cities");

  try {
    const rows = await buildReport(startDate, endDate, clients, cities);
    return NextResponse.json({ rows, total: rows.length });
  } catch (err) {
    console.error("[B2B Perf] Data error:", err);
    return NextResponse.json({ error: "Failed to load report data." }, { status: 500 });
  }
}
