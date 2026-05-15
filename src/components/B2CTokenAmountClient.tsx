"use client";

import { useState, useRef, useMemo } from "react";

type Row = Record<string, unknown>;

const COLUMNS = [
  { header: "ID",                        key: "id",                        minWidth: 80 },
  { header: "Token Booking ID",          key: "token_booking_id",          minWidth: 150 },
  { header: "Booking Ref",               key: "booking_ref",               minWidth: 180 },
  { header: "Amount",                    key: "amount",                    minWidth: 120, numeric: true },
  { header: "Refund Amount",             key: "refund_amount",             minWidth: 140, numeric: true },
  { header: "Cancellation Fee Deducted", key: "cancellation_fee_deducted", minWidth: 200, numeric: true },
  { header: "Created At",                key: "created_at",                minWidth: 170 },
  { header: "Pickup Datetime",           key: "pickup_datetime",           minWidth: 170 },
  { header: "Booking Status",            key: "booking_status",            minWidth: 140 },
  { header: "Adjusted to Invoice",       key: "Adjusted_to_invoice",       minWidth: 170, numeric: true },
  { header: "Balance Amount",            key: "Balance_Amount",            minWidth: 150, numeric: true },
];

const CARD_LABELS = [
  "Total Transactions",
  "Total Amount (Received)",
  "Total Cancellation Fee Deducted",
  "Total Refund Amount",
  "Total Adjusted to Invoice",
  "Total Balance Amount",
];

const CARD_COLORS = [
  { bg: "bg-blue-50",   border: "border-blue-200",  text: "text-blue-700",   val: "text-blue-900"   },
  { bg: "bg-green-50",  border: "border-green-200", text: "text-green-700",  val: "text-green-900"  },
  { bg: "bg-amber-50",  border: "border-amber-200", text: "text-amber-700",  val: "text-amber-900"  },
  { bg: "bg-purple-50", border: "border-purple-200",text: "text-purple-700", val: "text-purple-900" },
  { bg: "bg-rose-50",   border: "border-rose-200",  text: "text-rose-700",   val: "text-rose-900"   },
  { bg: "bg-teal-50",   border: "border-teal-200",  text: "text-teal-700",   val: "text-teal-900"   },
];

const PAGE_SIZE = 20;

function r2(v: number) { return Math.round(v * 100) / 100; }

function useSummary(rows: Row[]) {
  return useMemo(() => [
    rows.length,
    r2(rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)),
    r2(rows.reduce((s, r) => s + (Number(r.cancellation_fee_deducted) || 0), 0)),
    r2(rows.reduce((s, r) => s + (Number(r.refund_amount) || 0), 0)),
    r2(rows.reduce((s, r) => s + (Number(r.Adjusted_to_invoice) || 0), 0)),
    r2(rows.reduce((s, r) => s + (Number(r.Balance_Amount) || 0), 0)),
  ], [rows]);
}

function useTotals(rows: Row[]) {
  return useMemo(() => {
    const t: Record<string, number> = {};
    for (const col of COLUMNS) {
      if (col.numeric) {
        t[col.key] = r2(rows.reduce((s, r) => s + (Number(r[col.key]) || 0), 0));
      }
    }
    return t;
  }, [rows]);
}

/* ── Single table section ─────────────────────────────────── */
function TableSection({
  rows, loading, error, page, setPage, dataLoaded, downloading, onDownload,
  summaryHeading,
}: {
  rows: Row[];
  loading: boolean;
  error: string;
  page: number;
  setPage: (fn: (p: number) => number) => void;
  dataLoaded: boolean;
  downloading: boolean;
  onDownload: () => void;
  summaryHeading: string;
}) {
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totals = useTotals(rows);
  const summaryValues = useSummary(rows);

  return (
    <div className="mt-2">
      {error && (
        <div className="mb-3 text-red-600 text-sm bg-red-50 border border-red-200 px-4 py-2 rounded-lg">{error}</div>
      )}

      {!dataLoaded && !loading && (
        <div className="flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl" style={{ height: 200 }}>
          Click Apply to load data.
        </div>
      )}

      {dataLoaded && (
        <>
          {/* row count + download */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">{rows.length.toLocaleString()} records · Page {page} of {totalPages}</span>
            <button onClick={onDownload} disabled={downloading}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloading ? "Downloading…" : `Download Excel (${rows.length.toLocaleString()} rows)`}
            </button>
          </div>

          {/* Table */}
          <div className="overflow-auto border border-gray-200 rounded-xl" style={{ maxHeight: 420 }}>
            <table className="text-xs border-collapse" style={{ minWidth: "max-content", width: "100%" }}>
              <thead className="bg-[#1e3a8a] text-white" style={{ position: "sticky", top: 0, zIndex: 20 }}>
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap border-r border-blue-800" style={{ minWidth: 40 }}>#</th>
                  {COLUMNS.map(col => (
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
                    {COLUMNS.map(col => (
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
                  {COLUMNS.map(col => (
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
          <div className="flex items-center justify-between mt-3">
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

          {/* Summary cards */}
          <div className="mt-6">
            <h2 className="text-base font-semibold text-gray-700 mb-3">{summaryHeading}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 pb-6">
              {CARD_LABELS.map((label, i) => {
                const val = summaryValues[i] as number;
                const c = CARD_COLORS[i];
                const isCount = i === 0;
                return (
                  <div key={i} className={`rounded-xl border ${c.bg} ${c.border} p-5 shadow-sm`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${c.text} mb-1`}>{label}</p>
                    <p className={`text-xl font-bold ${c.val} leading-tight`}>
                      {isCount
                        ? val.toLocaleString()
                        : `₹${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────── */
export default function B2CTokenAmountClient() {
  const today    = new Date().toISOString().split("T")[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate]     = useState(today);
  const [dateError, setDateError] = useState("");

  // Table 1 — filtered by created_at
  const [rows1, setRows1]           = useState<Row[]>([]);
  const [loading1, setLoading1]     = useState(false);
  const [error1, setError1]         = useState("");
  const [page1, setPage1]           = useState(1);
  const [loaded1, setLoaded1]       = useState(false);
  const [dl1, setDl1]               = useState(false);
  const abort1 = useRef<AbortController | null>(null);

  // Table 2 — filtered by pickup_datetime
  const [rows2, setRows2]           = useState<Row[]>([]);
  const [loading2, setLoading2]     = useState(false);
  const [error2, setError2]         = useState("");
  const [page2, setPage2]           = useState(1);
  const [loaded2, setLoaded2]       = useState(false);
  const [dl2, setDl2]               = useState(false);
  const abort2 = useRef<AbortController | null>(null);

  const isLoading = loading1 || loading2;

  async function fetchOne(
    dateField: string,
    signal: AbortSignal,
    setRows: (r: Row[]) => void,
    setLoading: (v: boolean) => void,
    setError: (e: string) => void,
    setLoaded: (v: boolean) => void,
  ) {
    try {
      const params = new URLSearchParams({ startDate, endDate, format: "json", dateField });
      const res = await fetch(`/api/reports/b2c-token-amount?${params}`, { signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch data.");
      setRows(data.rows ?? []);
      setLoaded(true);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      } else if (!(err instanceof Error)) {
        setError("An error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!startDate || !endDate) { setDateError("Please select both dates."); return; }
    if (startDate > endDate)    { setDateError("Start date cannot be after end date."); return; }
    setDateError("");

    setRows1([]); setLoaded1(false); setError1(""); setPage1(1); setLoading1(true);
    setRows2([]); setLoaded2(false); setError2(""); setPage2(1); setLoading2(true);

    const c1 = new AbortController();
    const c2 = new AbortController();
    abort1.current = c1;
    abort2.current = c2;

    fetchOne("created", c1.signal, setRows1, setLoading1, setError1, setLoaded1);
    fetchOne("pickup",  c2.signal, setRows2, setLoading2, setError2, setLoaded2);
  }

  function handleStop() {
    abort1.current?.abort();
    abort2.current?.abort();
    setLoading1(false);
    setLoading2(false);
  }

  async function download(dateField: string, setDl: (v: boolean) => void) {
    setDl(true);
    try {
      const params = new URLSearchParams({ startDate, endDate, dateField });
      const res = await fetch(`/api/reports/b2c-token-amount?${params}`);
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error ?? "Download failed."); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `b2c_token_amount_${dateField}_${startDate}_${endDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Download failed."); }
    finally { setDl(false); }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">B2C Token Amount Report</h1>
        <p className="text-gray-500 mt-0.5 text-sm">Select a date range and click Apply to load both sections.</p>
      </div>

      {/* Shared controls */}
      <div className="flex items-center gap-3 flex-wrap mb-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            disabled={isLoading}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            disabled={isLoading}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
        </div>

        {!isLoading ? (
          <button onClick={handleApply}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
            Apply
          </button>
        ) : (
          <button onClick={handleStop}
            className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Stop
          </button>
        )}
      </div>

      {dateError && (
        <div className="mb-3 text-red-600 text-sm bg-red-50 border border-red-200 px-4 py-2 rounded-lg">{dateError}</div>
      )}

      {/* Section 1 — by Token Created Date */}
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-bold text-gray-800">By Token Created Date</h2>
          {loading1 && <span className="text-xs text-blue-500 font-medium animate-pulse">Loading…</span>}
        </div>
        <TableSection
          rows={rows1} loading={loading1} error={error1}
          page={page1} setPage={setPage1}
          dataLoaded={loaded1} downloading={dl1}
          onDownload={() => download("created", setDl1)}
          summaryHeading="Summary"
        />
      </div>

      {/* Divider */}
      <div className="my-8 border-t-2 border-dashed border-gray-200" />

      {/* Section 2 — by Pickup Date */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-bold text-gray-800">By Pickup Date</h2>
          {loading2 && <span className="text-xs text-blue-500 font-medium animate-pulse">Loading…</span>}
        </div>
        <TableSection
          rows={rows2} loading={loading2} error={error2}
          page={page2} setPage={setPage2}
          dataLoaded={loaded2} downloading={dl2}
          onDownload={() => download("pickup", setDl2)}
          summaryHeading="Previously Received but Settled in Current Period Summary"
        />
      </div>
    </div>
  );
}
