"use client";

import { useState, useRef } from "react";

interface Report {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const colorMap: Record<string, { bg: string; icon: string; btn: string; border: string }> = {
  blue:   { bg: "bg-blue-50",   icon: "bg-blue-100 text-blue-700",   btn: "bg-blue-600 hover:bg-blue-700",   border: "border-blue-200" },
  green:  { bg: "bg-green-50",  icon: "bg-green-100 text-green-700",  btn: "bg-green-600 hover:bg-green-700",  border: "border-green-200" },
  orange: { bg: "bg-orange-50", icon: "bg-orange-100 text-orange-700", btn: "bg-orange-500 hover:bg-orange-600", border: "border-orange-200" },
  purple: { bg: "bg-purple-50", icon: "bg-purple-100 text-purple-700", btn: "bg-purple-600 hover:bg-purple-700", border: "border-purple-200" },
};

const iconMap: Record<string, React.ReactNode> = {
  b2c: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  b2b: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  driver: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  customer: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
};

export default function ReportCard({
  report,
  hasAccess,
}: {
  report: Report;
  hasAccess: boolean;
}) {
  const today = new Date().toISOString().split("T")[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [requestError, setRequestError] = useState("");

  const colors = colorMap[report.color] ?? colorMap.blue;

  async function handleDownload() {
    setError("");
    setCancelled(false);
    if (!startDate || !endDate) { setError("Please select both start and end dates."); return; }
    if (startDate > endDate) { setError("Start date cannot be after end date."); return; }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await fetch(`/api/reports/${report.id}?${params}`, { signal: controller.signal });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed to generate report.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.id}_${startDate}_${endDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setCancelled(true);
      } else {
        setError(err instanceof Error ? err.message : "An error occurred.");
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function handleCancel() { abortRef.current?.abort(); }

  async function handleRequestAccess() {
    setRequesting(true);
    setRequestError("");
    try {
      const res = await fetch("/api/reports/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: report.id }),
      });
      const data = await res.json();
      if (!res.ok) setRequestError(data.error ?? "Failed to send request.");
      else setRequested(true);
    } catch {
      setRequestError("An error occurred.");
    } finally {
      setRequesting(false);
    }
  }

  // ── LOCKED CARD ──────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <div className={`bg-white rounded-2xl border ${colors.border} shadow-sm overflow-hidden opacity-80 relative`}>
        {/* Lock overlay */}
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center gap-3 rounded-2xl">
          <div className="bg-gray-100 rounded-full p-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-600">Access Restricted</p>

          {requested ? (
            <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-4 py-2 rounded-lg text-center max-w-xs">
              Request sent! Admin will review shortly.
            </div>
          ) : (
            <>
              {requestError && (
                <p className="text-xs text-red-500">{requestError}</p>
              )}
              <button
                onClick={handleRequestAccess}
                disabled={requesting}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                {requesting ? "Sending..." : "Request Access"}
              </button>
            </>
          )}
        </div>

        {/* Blurred card content beneath */}
        <div className={`${colors.bg} px-6 py-5 flex items-start gap-4`}>
          <div className={`${colors.icon} p-3 rounded-xl flex-shrink-0`}>{iconMap[report.icon]}</div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{report.title}</h2>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{report.description}</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><div className="h-8 bg-gray-100 rounded-lg" /></div>
            <div><div className="h-8 bg-gray-100 rounded-lg" /></div>
          </div>
          <div className="h-10 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }

  // ── NORMAL CARD ───────────────────────────────────────────────
  return (
    <div className={`bg-white rounded-2xl border ${colors.border} shadow-sm hover:shadow-md transition-shadow overflow-hidden`}>
      <div className={`${colors.bg} px-6 py-5 flex items-start gap-4`}>
        <div className={`${colors.icon} p-3 rounded-xl flex-shrink-0`}>{iconMap[report.icon]}</div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{report.title}</h2>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{report.description}</p>
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
          </div>
        </div>

        {error && <p className="text-red-600 text-xs mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {cancelled && !loading && (
          <p className="text-yellow-700 text-xs mb-3 bg-yellow-50 px-3 py-2 rounded-lg">Download cancelled.</p>
        )}

        <div className="flex gap-2">
          <button onClick={handleDownload} disabled={loading}
            className={`flex-1 ${colors.btn} disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm flex items-center justify-center gap-2`}>
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Excel
              </>
            )}
          </button>
          {loading && (
            <button onClick={handleCancel}
              className="px-4 py-2.5 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm transition-colors flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
