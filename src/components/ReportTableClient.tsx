"use client";

import { useState, useRef, useMemo } from "react";

export type ColDef = {
  header: string;
  key: string;
  numeric?: boolean;
  minWidth?: number;
};

export type SummaryCardDef =
  | { label: string; valueType: "count"; color?: string }
  | { label: string; valueType: "sum"; keys: string[]; color?: string }
  | { label: string; valueType: "subtract"; positiveKeys: string[]; negativeKeys: string[]; color?: string };

interface Props {
  reportId: string;
  reportName: string;
  columns: ColDef[];
  summaryCards?: SummaryCardDef[];
}

const PAGE_SIZE = 20;

function r2(v: number) { return Math.round(v * 100) / 100; }

const CARD_COLORS = [
  { bg: "bg-blue-50",   border: "border-blue-200",  text: "text-blue-700",   val: "text-blue-900"   },
  { bg: "bg-green-50",  border: "border-green-200", text: "text-green-700",  val: "text-green-900"  },
  { bg: "bg-amber-50",  border: "border-amber-200", text: "text-amber-700",  val: "text-amber-900"  },
  { bg: "bg-purple-50", border: "border-purple-200",text: "text-purple-700", val: "text-purple-900" },
  { bg: "bg-rose-50",   border: "border-rose-200",  text: "text-rose-700",   val: "text-rose-900"   },
  { bg: "bg-teal-50",   border: "border-teal-200",  text: "text-teal-700",   val: "text-teal-900"   },
];

export default function ReportTableClient({ reportId, reportName, columns, summaryCards }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const col of columns) {
      if (col.numeric) {
        t[col.key] = r2(rows.reduce((sum, row) => sum + (Number(row[col.key]) || 0), 0));
      }
    }
    return t;
  }, [rows, columns]);

  const summaryValues = useMemo(() => {
    if (!summaryCards) return [];
    return summaryCards.map(card => {
      if (card.valueType === "count") return rows.length;
      if (card.valueType === "sum") {
        return r2(rows.reduce((sum, row) =>
          sum + card.keys.reduce((s, k) => s + (Number(row[k]) || 0), 0), 0));
      }
      if (card.valueType === "subtract") {
        const pos = r2(rows.reduce((sum, row) =>
          sum + card.positiveKeys.reduce((s, k) => s + (Number(row[k]) || 0), 0), 0));
        const neg = r2(rows.reduce((sum, row) =>
          sum + card.negativeKeys.reduce((s, k) => s + (Number(row[k]) || 0), 0), 0));
        return r2(pos - neg);
      }
      return 0;
    });
  }, [rows, summaryCards]);

  async function handleApply() {
    if (!startDate || !endDate) { setError("Please select both dates."); return; }
    if (startDate > endDate) { setError("Start date cannot be after end date."); return; }
    setError("");
    setDataLoaded(false);
    setRows([]);
    setPage(1);
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate, endDate, format: "json" });
      const res = await fetch(`/api/reports/${reportId}?${params}`, { signal: controller.signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch data.");
      setRows(data.rows ?? []);
      setDataLoaded(true);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Cancelled.");
      } else {
        setError(err instanceof Error ? err.message : "An error occurred.");
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  async function handleDownload() {
    setDownloading(true);
    setError("");
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await fetch(`/api/reports/${reportId}?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Download failed.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportId}_${startDate}_${endDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Download failed.");
    } finally {
      setDownloading(false);
    }
  }

  const hasSummary = summaryCards && summaryCards.length > 0;

  return (
    <div className="flex flex-col" style={{ height: hasSummary ? "auto" : "calc(100vh - 120px)" }}>
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">{reportName}</h1>
        <p className="text-gray-500 mt-0.5 text-sm">Select a date range and click Apply to load data.</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            disabled={loading}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            disabled={loading}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
        </div>

        {!loading ? (
          <button onClick={handleApply}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
            Apply
          </button>
        ) : (
          <button onClick={() => abortRef.current?.abort()}
            className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Stop
          </button>
        )}

        {dataLoaded && (
          <button onClick={handleDownload} disabled={downloading}
            className="ml-auto px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {downloading ? "Downloading..." : `Download Excel (${rows.length.toLocaleString()} rows)`}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 flex-shrink-0 text-red-600 text-sm bg-red-50 border border-red-200 px-4 py-2 rounded-lg">{error}</div>
      )}

      {/* Empty state */}
      {!dataLoaded && !loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
          Select a date range and click Apply to load data.
        </div>
      )}

      {/* Table */}
      {dataLoaded && (
        <div className={`flex flex-col ${hasSummary ? "" : "flex-1 min-h-0"}`}>
          <div className="text-sm text-gray-500 mb-2 flex-shrink-0">
            {rows.length.toLocaleString()} records · Page {page} of {totalPages}
          </div>

          {/* Scrollable table container */}
          <div className="overflow-auto border border-gray-200 rounded-xl"
            style={hasSummary ? { maxHeight: "calc(100vh - 440px)", minHeight: 200 } : { flex: 1, minHeight: 0 }}>
            <table className="text-xs border-collapse" style={{ minWidth: "max-content", width: "100%" }}>
              <thead className="bg-[#1e3a8a] text-white" style={{ position: "sticky", top: 0, zIndex: 20 }}>
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap border-r border-blue-800" style={{ minWidth: 40 }}>#</th>
                  {columns.map(col => (
                    <th key={col.key}
                      className="px-3 py-2.5 text-left font-semibold whitespace-nowrap border-r border-blue-800 last:border-r-0"
                      style={{ minWidth: col.minWidth ?? 120 }}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white hover:bg-blue-50" : "bg-gray-50 hover:bg-blue-50"}>
                    <td className="px-3 py-2 border-r border-gray-100 text-gray-400 whitespace-nowrap">
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>
                    {columns.map(col => (
                      <td key={col.key}
                        className="px-3 py-2 border-r border-gray-100 last:border-r-0 whitespace-nowrap text-gray-700">
                        {row[col.key] == null ? "" : String(row[col.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-blue-50 border-t-2 border-blue-300 font-semibold text-blue-900"
                style={{ position: "sticky", bottom: 0, zIndex: 20 }}>
                <tr>
                  <td className="px-3 py-2.5 border-r border-blue-200 whitespace-nowrap text-blue-700 font-bold">Total</td>
                  {columns.map(col => (
                    <td key={col.key}
                      className="px-3 py-2.5 border-r border-blue-200 last:border-r-0 whitespace-nowrap">
                      {col.numeric && totals[col.key] !== undefined
                        ? totals[col.key].toLocaleString(undefined, { maximumFractionDigits: 2 })
                        : ""}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-3 flex-shrink-0">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium">
              ← Previous
            </button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages} · {rows.length.toLocaleString()} rows total</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium">
              Next →
            </button>
          </div>

          {/* Summary Cards */}
          {hasSummary && (
            <div className="mt-6">
              <h2 className="text-base font-semibold text-gray-700 mb-3">Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6">
                {summaryCards!.map((card, i) => {
                  const val = summaryValues[i] as number;
                  const c = CARD_COLORS[i % CARD_COLORS.length];
                  const isCount = card.valueType === "count";
                  return (
                    <div key={i} className={`rounded-xl border ${c.bg} ${c.border} p-5 shadow-sm`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide ${c.text} mb-1`}>{card.label}</p>
                      <p className={`text-2xl font-bold ${c.val} leading-tight`}>
                        {isCount
                          ? val.toLocaleString()
                          : `₹${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
