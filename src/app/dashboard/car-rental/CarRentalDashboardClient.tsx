"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface Summary {
  totalRequests: number;
  completed: number;
  cancelled: number;
  pending: number;
  confirmed: number;
  others: number;
}

interface WeekData {
  week: string;
  weekStart: string;
  totalRequests: number;
  completed: number;
  completionPct: number;
}

interface DashboardData {
  summary: Summary;
  weekly: WeekData[];
}

const today = new Date().toISOString().split("T")[0];
const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString().split("T")[0];

const CARDS = [
  { key: "totalRequests", label: "Total Requests",  color: "bg-blue-50 border-blue-200",   text: "text-blue-700",   icon: "📋" },
  { key: "confirmed",     label: "Confirmed",        color: "bg-green-50 border-green-200",  text: "text-green-700",  icon: "✅" },
  { key: "pending",       label: "Pending",          color: "bg-yellow-50 border-yellow-200",text: "text-yellow-700", icon: "⏳" },
  { key: "completed",     label: "Completed (4 & 8)", color: "bg-indigo-50 border-indigo-200",text: "text-indigo-700", icon: "🏁" },
  { key: "cancelled",     label: "Cancelled",        color: "bg-red-50 border-red-200",      text: "text-red-700",    icon: "❌" },
  { key: "others",        label: "Others",           color: "bg-gray-50 border-gray-200",    text: "text-gray-700",   icon: "📦" },
];

export default function CarRentalDashboardClient() {
  const router = useRouter();
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate || startDate > endDate) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/dashboard/car-rental?startDate=${startDate}&endDate=${endDate}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Car Rental Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">Booking analytics and weekly performance</p>
      </div>

      {/* Date Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={fetchData} disabled={loading}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
          {loading ? "Loading..." : "Apply"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6">{error}</div>
      )}

      {/* Summary Cards */}
      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {CARDS.map((card) => {
              const val = data.summary[card.key as keyof Summary];
              const filterKey = card.key === "totalRequests" ? "all" : card.key;
              return (
                <button
                  key={card.key}
                  onClick={() => router.push(
                    `/dashboard/car-rental/detail?filter=${filterKey}&startDate=${startDate}&endDate=${endDate}`
                  )}
                  className={`${card.color} border rounded-xl p-4 text-center hover:shadow-md hover:scale-105 transition-all cursor-pointer w-full`}>
                  <p className="text-2xl mb-1">{card.icon}</p>
                  <p className={`text-2xl font-bold ${card.text}`}>{val.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-tight">{card.label}</p>
                  <p className="text-xs text-blue-500 mt-1">View details →</p>
                </button>
              );
            })}
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-1">
              Last 5 Weeks — Requests vs Completed
            </h2>
            <p className="text-xs text-gray-400 mb-6">
              Bars show booking counts · Line shows completion %
            </p>

            {data.weekly.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-10">No weekly data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={data.weekly} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false}
                    label={{ value: "Count", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 11 } }} />
                  <YAxis yAxisId="right" orientation="right" unit="%" domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    label={{ value: "Completion %", angle: 90, position: "insideRight", offset: 10, style: { fontSize: 11 } }} />
                  <Tooltip
                    formatter={(value, name) => {
                      const n = Number(value);
                      if (name === "Completion %") return [`${n}%`, name];
                      return [n.toLocaleString(), name];
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="totalRequests" name="Total Requests" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="completed" name="Completed (4 & 8)" fill="#4ade80" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="completionPct"
                    name="Completion %" stroke="#f97316" strokeWidth={2.5}
                    dot={{ r: 4, fill: "#f97316" }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-24">
          <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      )}
    </div>
  );
}
