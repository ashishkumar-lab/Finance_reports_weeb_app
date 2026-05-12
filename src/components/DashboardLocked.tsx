"use client";

import { useState } from "react";

export default function DashboardLocked({ dashboardId, dashboardName }: {
  dashboardId: string;
  dashboardName: string;
}) {
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState("");

  async function handleRequest() {
    setRequesting(true);
    setError("");
    try {
      const res = await fetch("/api/reports/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: dashboardId }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Failed to send request.");
      else setRequested(true);
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="bg-gray-100 rounded-full p-6 mb-4">
        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Access Restricted</h2>
      <p className="text-gray-500 text-sm mb-6 max-w-sm">
        You don&apos;t have access to <span className="font-semibold text-gray-700">{dashboardName}</span>.
        Request access and an admin will review your request.
      </p>

      {requested ? (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-6 py-3 rounded-xl">
          Request sent! Admin will review shortly.
        </div>
      ) : (
        <>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button
            onClick={handleRequest}
            disabled={requesting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
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
  );
}
