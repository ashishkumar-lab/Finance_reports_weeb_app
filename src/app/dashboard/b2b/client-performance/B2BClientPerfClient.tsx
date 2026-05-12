"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { PerfRow } from "@/lib/b2bClientPerf";

// ── Types ──────────────────────────────────────────────────────────────────────

type IncentiveType = "specific" | "unspecific" | "both";

// ── Helpers ────────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, "0"); }
function localDate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function lastMonthRange() {
  const now   = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last  = new Date(now.getFullYear(), now.getMonth(), 0);
  return { start: localDate(first), end: localDate(last) };
}

function fmt(v: unknown): string {
  const n = Number(v);
  if (v === null || v === undefined || v === "" || isNaN(n)) return "—";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtInt(v: unknown): string {
  const n = Number(v);
  if (isNaN(n)) return "—";
  return n.toLocaleString("en-IN");
}
function r2(v: number) { return Math.round(v * 100) / 100; }

// ── Multi-Select Component ─────────────────────────────────────────────────────

function MultiSelect({
  label, options, selected, onChange,
}: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  };

  const allSelected = selected.length === 0;
  const label2 = allSelected ? `All ${label}s` : selected.length === 1 ? selected[0] : `${selected.length} ${label}s selected`;

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="min-w-[180px] max-w-[280px] flex items-center justify-between gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
      >
        <span className="truncate text-left text-gray-700">{label2}</span>
        <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 flex flex-col">
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <button
              className="text-xs text-blue-600 hover:underline"
              onClick={() => onChange([])}
            >All</button>
            <span className="text-xs text-gray-400">{selected.length}/{options.length} selected</span>
            <button
              className="text-xs text-blue-600 hover:underline"
              onClick={() => onChange([...options])}
            >Select all</button>
          </div>
          <div className="overflow-y-auto flex-1">
            {options.map((opt) => (
              <label key={opt} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="truncate text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Derived column calculator ──────────────────────────────────────────────────

function deriveRow(r: PerfRow, it: IncentiveType) {
  const selInc =
    it === "specific"   ? r.specific_trip_incentive :
    it === "unspecific" ? r.total_unspecific_incentive :
                           r.total_incentive;
  const doneWith =
    it === "specific"   ? r.done_with_specific :
    it === "unspecific" ? r.done_with_unspecific :
                           r.done_with_any;

  const ft_pct              = r.no_of_requests > 0 ? r2(r.done / r.no_of_requests * 100) : 0;
  const incentive_per_trip  = r.no_of_requests > 0 ? r2(selInc / r.no_of_requests) : 0;
  const margin_after_inc    = r2(r.trip_level_margin - selInc);
  const margin_after_pct    = r.total_fare > 0 ? r2(margin_after_inc / r.total_fare * 100) : 0;
  const done_without        = r.done - doneWith;
  const pct_done_with       = r.done > 0 ? r2(doneWith / r.done * 100) : 0;
  const pct_done_without    = r.done > 0 ? r2(done_without / r.done * 100) : 0;

  return { ft_pct, incentive_per_trip, margin_after_inc, margin_after_pct, doneWith, done_without, pct_done_with, pct_done_without };
}

// ── Column header groups ───────────────────────────────────────────────────────

const STICKY_COL_WIDTH_A = 200;
const STICKY_COL_WIDTH_B = 160;

// ── Main Component ─────────────────────────────────────────────────────────────

export default function B2BClientPerfClient() {
  const { start: lmStart, end: lmEnd } = lastMonthRange();

  const [startDate, setStartDate] = useState(lmStart);
  const [endDate,   setEndDate]   = useState(lmEnd);

  const [availableClients, setAvailableClients] = useState<string[]>([]);
  const [availableCities,  setAvailableCities]  = useState<string[]>([]);
  const [selClients,  setSelClients]  = useState<string[]>([]);
  const [selCities,   setSelCities]   = useState<string[]>([]);
  const [incentiveType, setIncentiveType] = useState<IncentiveType>("both");

  const [allRows, setAllRows]   = useState<PerfRow[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState("");
  const [applied, setApplied]   = useState(false);

  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const [downloading, setDownloading] = useState(false);
  const downloadRef = useRef<AbortController | null>(null);
  const dataAbortRef = useRef<AbortController | null>(null);

  // When Apply is clicked — fetch filters then data
  const handleApply = useCallback(async () => {
    if (!startDate || !endDate) return;
    dataAbortRef.current?.abort();
    const ctrl = new AbortController();
    dataAbortRef.current = ctrl;

    setLoading(true);
    setError("");
    setAllRows([]);
    setPage(1);
    setApplied(false);
    setSelClients([]);
    setSelCities([]);
    setAvailableClients([]);
    setAvailableCities([]);

    try {
      // Fetch filter options first
      const fRes = await fetch(
        `/api/dashboard/b2b-client-performance?action=filters&startDate=${startDate}&endDate=${endDate}`,
        { signal: ctrl.signal }
      );
      if (!fRes.ok) throw new Error((await fRes.json()).error ?? "Failed to load filters");
      const { clients, cities } = await fRes.json();
      setAvailableClients(clients);
      setAvailableCities(cities);

      // Fetch data
      const dRes = await fetch(
        `/api/dashboard/b2b-client-performance?startDate=${startDate}&endDate=${endDate}`,
        { signal: ctrl.signal }
      );
      if (!dRes.ok) throw new Error((await dRes.json()).error ?? "Failed to load data");
      const { rows } = await dRes.json();
      setAllRows(rows);
      setApplied(true);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // Re-filter locally when client/city selection changes
  const filteredRows = allRows.filter((r) => {
    if (selClients.length > 0 && !selClients.includes(r.client_name)) return false;
    if (selCities.length  > 0 && !selCities.includes(r.city))         return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / LIMIT));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filteredRows.slice((safePage - 1) * LIMIT, safePage * LIMIT);

  // Download
  const handleDownload = useCallback(async () => {
    if (!startDate || !endDate) return;
    downloadRef.current?.abort();
    const ctrl = new AbortController();
    downloadRef.current = ctrl;
    setDownloading(true);

    try {
      const params = new URLSearchParams({ startDate, endDate, incentiveType });
      selClients.forEach((c) => params.append("clients", c));
      selCities.forEach((c)  => params.append("cities", c));

      const res = await fetch(`/api/reports/b2b-client-performance?${params}`, { signal: ctrl.signal });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Download failed");
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `b2b_client_performance_${startDate}_${endDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }, [startDate, endDate, incentiveType, selClients, selCities]);

  const handleStopDownload = () => {
    downloadRef.current?.abort();
    setDownloading(false);
  };

  // Cell formatters
  const fmtN = fmt;
  const fmtI = fmtInt;

  return (
    <div className="p-6 space-y-6 max-w-full">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">B2B Client Performance</h1>
        <p className="text-sm text-gray-500 mt-1">Client-wise trip, fare and incentive breakdown</p>
      </div>

      {/* Filters panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">

        {/* Date + Apply row */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={handleApply} disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            {loading && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {loading ? "Loading…" : "Apply"}
          </button>
        </div>

        {/* Multi-selects + incentive type — only shown after first load */}
        {applied && (
          <div className="flex flex-wrap items-end gap-4 pt-2 border-t border-gray-100">
            <MultiSelect label="Client" options={availableClients} selected={selClients} onChange={(v) => { setSelClients(v); setPage(1); }} />
            <MultiSelect label="City"   options={availableCities}  selected={selCities}  onChange={(v) => { setSelCities(v);  setPage(1); }} />

            {/* Incentive type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Incentive Type</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
                {(["specific", "unspecific", "both"] as IncentiveType[]).map((opt) => (
                  <button key={opt}
                    onClick={() => setIncentiveType(opt)}
                    className={`px-4 py-2 font-medium capitalize transition-colors ${
                      incentiveType === opt
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {opt === "specific" ? "Specific" : opt === "unspecific" ? "Unspecific" : "Both"}
                  </button>
                ))}
              </div>
            </div>

            {/* Download */}
            <div className="ml-auto flex items-end gap-2">
              {!downloading ? (
                <button onClick={handleDownload}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download XLSX
                </button>
              ) : (
                <button onClick={handleStopDownload}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Stop Download
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Loading spinner (initial) */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      )}

      {/* Table */}
      {!loading && applied && (
        <>
          {/* Summary bar */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>
              <span className="font-semibold text-gray-800">{filteredRows.length.toLocaleString()}</span> client-city combinations
            </span>
            {(selClients.length > 0 || selCities.length > 0) && (
              <span className="text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-3 py-0.5">
                Filtered
              </span>
            )}
            <span className="text-xs capitalize bg-purple-50 border border-purple-200 text-purple-700 rounded-full px-3 py-0.5">
              {incentiveType} incentive
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Scrollable container — both axes */}
            <div className="overflow-auto max-h-[70vh]">
              <table className="min-w-full text-xs border-separate border-spacing-0">
                <thead>
                  <tr>
                    {/* Frozen header: Client Name */}
                    <th className="sticky top-0 left-0 z-30 bg-[#1e3a8a] text-white font-semibold px-3 py-2.5 whitespace-nowrap border-b border-r border-blue-700"
                      style={{ minWidth: STICKY_COL_WIDTH_A, maxWidth: STICKY_COL_WIDTH_A }}>
                      Client Name
                    </th>
                    {/* Frozen header: City */}
                    <th className="sticky top-0 z-30 bg-[#1e3a8a] text-white font-semibold px-3 py-2.5 whitespace-nowrap border-b border-r border-blue-700"
                      style={{ minWidth: STICKY_COL_WIDTH_B, maxWidth: STICKY_COL_WIDTH_B, left: STICKY_COL_WIDTH_A }}>
                      City
                    </th>
                    {/* Regular headers */}
                    {[
                      "No of Requests","Done","Unfulfilled","FT%",
                      "Total Fare","Driver Fare","Trip Level Margin","Margin %",
                      "Per Trip Incentive","FT Incentive","Dry Run Incentive","Specific Trip Incentive",
                      "Daily Incentive\n(Amort.)","Weekly Incentive\n(Amort.)","Monthly Incentive\n(Amort.)",
                      "Total Unspecific","Total Incentive","Incentive Per Trip",
                      "Margin After Inc.","Margin After Inc. %",
                      "Done With Inc.","% Done With","Done Without Inc.","% Done Without",
                    ].map((h) => (
                      <th key={h}
                        className="sticky top-0 z-20 bg-[#1e3a8a] text-white font-semibold px-3 py-2.5 whitespace-pre-line text-center border-b border-r border-blue-700"
                        style={{ minWidth: h.includes("Client") || h.includes("City") ? undefined : 110 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={26} className="text-center text-gray-400 py-12">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((r, i) => {
                      const d = deriveRow(r, incentiveType);
                      const bg = i % 2 === 0 ? "bg-white" : "bg-blue-50/40";
                      const stickyBg = i % 2 === 0 ? "bg-white" : "bg-blue-50";

                      return (
                        <tr key={`${r.client_name}|||${r.city}`} className={bg}>
                          {/* Frozen: Client Name */}
                          <td className={`sticky left-0 z-10 ${stickyBg} px-3 py-2 text-gray-800 font-medium border-r border-gray-200 whitespace-nowrap`}
                            style={{ minWidth: STICKY_COL_WIDTH_A, maxWidth: STICKY_COL_WIDTH_A }}>
                            <span className="block truncate" title={r.client_name}>{r.client_name}</span>
                          </td>
                          {/* Frozen: City */}
                          <td className={`sticky z-10 ${stickyBg} px-3 py-2 text-gray-700 border-r border-gray-200 whitespace-nowrap`}
                            style={{ minWidth: STICKY_COL_WIDTH_B, maxWidth: STICKY_COL_WIDTH_B, left: STICKY_COL_WIDTH_A }}>
                            {r.city}
                          </td>
                          {/* Data cells */}
                          <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap border-r border-gray-100">{fmtI(r.no_of_requests)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap border-r border-gray-100">{fmtI(r.done)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap border-r border-gray-100">{fmtI(r.unfulfilled)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap border-r border-gray-100">{fmt(d.ft_pct)}%</td>
                          <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap border-r border-gray-100">{fmtN(r.total_fare)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap border-r border-gray-100">{fmtN(r.driver_fare)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap border-r border-gray-100">{fmtN(r.trip_level_margin)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap border-r border-gray-100">{fmt(r.trip_level_margin_pct)}%</td>
                          <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap border-r border-gray-100">{fmtN(r.per_trip_incentive)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap border-r border-gray-100">{fmtN(r.ft_incentive)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap border-r border-gray-100">{fmtN(r.dry_run_incentive)}</td>
                          <td className="px-3 py-2 text-right font-medium text-blue-700 whitespace-nowrap border-r border-gray-100">{fmtN(r.specific_trip_incentive)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap border-r border-gray-100">{fmtN(r.daily_incentive)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap border-r border-gray-100">{fmtN(r.weekly_incentive)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap border-r border-gray-100">{fmtN(r.monthly_incentive)}</td>
                          <td className="px-3 py-2 text-right font-medium text-green-700 whitespace-nowrap border-r border-gray-100">{fmtN(r.total_unspecific_incentive)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-purple-700 whitespace-nowrap border-r border-gray-100">{fmtN(r.total_incentive)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap border-r border-gray-100">{fmtN(d.incentive_per_trip)}</td>
                          <td className={`px-3 py-2 text-right font-medium whitespace-nowrap border-r border-gray-100 ${d.margin_after_inc >= 0 ? "text-green-700" : "text-red-600"}`}>{fmtN(d.margin_after_inc)}</td>
                          <td className={`px-3 py-2 text-right whitespace-nowrap border-r border-gray-100 ${d.margin_after_pct >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(d.margin_after_pct)}%</td>
                          <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap border-r border-gray-100">{fmtI(d.doneWith)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap border-r border-gray-100">{fmt(d.pct_done_with)}%</td>
                          <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap border-r border-gray-100">{fmtI(d.done_without)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap">{fmt(d.pct_done_without)}%</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {((safePage - 1) * LIMIT + 1).toLocaleString()}–
                {Math.min(safePage * LIMIT, filteredRows.length).toLocaleString()} of{" "}
                {filteredRows.length.toLocaleString()}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium">
                  {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state before first apply */}
      {!loading && !applied && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm">Select a date range and click <strong className="text-gray-600">Apply</strong> to load data.</p>
        </div>
      )}
    </div>
  );
}
