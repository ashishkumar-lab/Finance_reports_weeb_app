import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { carRentalQueryLong } from "@/lib/db";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate)
    return NextResponse.json({ error: "startDate and endDate are required." }, { status: 400 });
  if (!DATE_REGEX.test(startDate) || !DATE_REGEX.test(endDate))
    return NextResponse.json({ error: "Invalid date format." }, { status: 400 });

  const startDt = `${startDate} 00:00:00`;
  const endDt = `${endDate} 23:59:59`;

  try {
    // Summary cards — count by status_id
    const summaryRows = await carRentalQueryLong<{ status_id: number; code: string; cnt: number }>(`
      SELECT b.status_id, IFNULL(bs.code, 'UNKNOWN') AS code, COUNT(*) AS cnt
      FROM booking b
      LEFT JOIN booking_status bs ON bs.id = b.status_id
      WHERE b.created_at BETWEEN ? AND ?
      GROUP BY b.status_id, bs.code
    `, [startDt, endDt]);

    let totalRequests = 0;
    let completed = 0;
    let cancelled = 0;
    let pending = 0;
    let confirmed = 0;
    let others = 0;

    for (const row of summaryRows) {
      const cnt = Number(row.cnt);
      totalRequests += cnt;
      const code = (row.code ?? "").toUpperCase();
      const sid = Number(row.status_id);

      if (sid === 4 || sid === 8) {
        completed += cnt;
      } else if (code.includes("CANCEL") || code.includes("REJECT")) {
        cancelled += cnt;
      } else if (code.includes("PENDING") || code.includes("NEW") || sid === 1) {
        pending += cnt;
      } else if (code.includes("CONFIRM") || code.includes("APPROV") || sid === 2 || sid === 3) {
        confirmed += cnt;
      } else {
        others += cnt;
      }
    }

    // Weekly data — last 5 weeks from end date
    const weeklyRows = await carRentalQueryLong<{
      week_label: string;
      week_start: string;
      total_requests: number;
      completed: number;
    }>(`
      SELECT
        CONCAT('W', WEEK(MIN(b.created_at), 1), ' ', YEAR(MIN(b.created_at))) AS week_label,
        DATE(MIN(b.created_at))                                                 AS week_start,
        COUNT(*)                                                                AS total_requests,
        SUM(CASE WHEN b.status_id IN (4, 8) THEN 1 ELSE 0 END)                AS completed
      FROM booking b
      WHERE b.created_at >= DATE_SUB(?, INTERVAL 5 WEEK)
        AND b.created_at <= ?
      GROUP BY YEARWEEK(b.created_at, 1)
      ORDER BY YEARWEEK(b.created_at, 1) ASC
      LIMIT 5
    `, [endDt, endDt]);

    const weekly = weeklyRows.map((r) => {
      const req = Number(r.total_requests);
      const comp = Number(r.completed);
      return {
        week: r.week_label,
        weekStart: r.week_start,
        totalRequests: req,
        completed: comp,
        completionPct: req > 0 ? Math.round((comp / req) * 100) : 0,
      };
    });

    return NextResponse.json({
      summary: { totalRequests, completed, cancelled, pending, confirmed, others },
      weekly,
    });
  } catch (err) {
    console.error("[Dashboard Car Rental] Error:", err);
    return NextResponse.json({ error: "Failed to load dashboard data." }, { status: 500 });
  }
}
