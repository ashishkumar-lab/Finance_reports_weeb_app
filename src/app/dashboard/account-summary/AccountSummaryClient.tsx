"use client";

import { useState } from "react";

function fmt(val: unknown): string {
  const n = Number(val);
  if (val === null || val === undefined || val === "" || isNaN(n)) return "—";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtInt(val: unknown): string {
  const n = Number(val);
  if (isNaN(n)) return "—";
  return n.toLocaleString("en-IN");
}

type WalletVertical = {
  Vertical?: string;
  vertical?: string;
  total_debit: number;
  total_credit: number;
  net: number;
};

type SummaryData = {
  b2c: Record<string, unknown> | null;
  b2b: Record<string, unknown> | null;
  driverWallet: WalletVertical[];
  customerWallet: WalletVertical[];
};

function MetricRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-800 tabular-nums">₹{fmt(value)}</span>
    </div>
  );
}

function WalletCard({ name, debit, credit, net }: { name: string; debit: number; credit: number; net: number }) {
  const netVal = Number(net);
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 truncate" title={name}>{name}</h4>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-xs text-gray-500">Debit</span>
          <span className="text-sm font-medium text-red-600 tabular-nums">₹{fmt(debit)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-gray-500">Credit</span>
          <span className="text-sm font-medium text-green-600 tabular-nums">₹{fmt(credit)}</span>
        </div>
        <div className="flex justify-between border-t border-gray-100 pt-2">
          <span className="text-xs font-semibold text-gray-600">Net</span>
          <span className={`text-sm font-bold tabular-nums ${netVal >= 0 ? "text-green-700" : "text-red-700"}`}>
            ₹{fmt(netVal)}
          </span>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <div className={`flex items-center gap-3 mb-4`}>
      <div className={`w-1 h-6 rounded-full ${color}`} />
      <h2 className="text-lg font-bold text-gray-800">{title}</h2>
    </div>
  );
}

export default function AccountSummaryClient() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleApply() {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch(`/api/dashboard/account-summary?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Failed to load");
      }
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load summary");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account Summary</h1>
        <p className="text-sm text-gray-500 mt-1">Aggregated totals across all reports for the selected period</p>
      </div>

      {/* Date Picker */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={handleApply} disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
          {loading && <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>}
          {loading ? "Loading..." : "Apply"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      )}

      {!data && !loading && !error && (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm">Select a date range and click Apply to view the summary</p>
        </div>
      )}

      {data && (
        <div className="space-y-10">

          {/* B2C Revenue */}
          <section>
            <SectionHeader title="B2C Revenue" color="bg-blue-500" />
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                <div className="bg-blue-100 rounded-lg p-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500">No. of Bookings</p>
                  <p className="text-2xl font-bold text-blue-700">{fmtInt(data.b2c?.booking_count)}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
                <div>
                  <MetricRow label="Driver Fee" value={data.b2c?.driver_fee} />
                  <MetricRow label="Base Discount" value={data.b2c?.base_discount} />
                  <MetricRow label="Discount on Driver Fee" value={data.b2c?.discount_on_driver_fee} />
                  <MetricRow label="Discount" value={data.b2c?.discount} />
                  <MetricRow label="Cancellation Charges" value={data.b2c?.cancellation_charges} />
                  <MetricRow label="Convenience Fee" value={data.b2c?.convenience_fee} />
                </div>
                <div>
                  <MetricRow label="DU Secure Fee" value={data.b2c?.du_secure_fee} />
                  <MetricRow label="Platform Fee" value={data.b2c?.platform_fee} />
                  <MetricRow label="DU Black Amount" value={data.b2c?.du_black_amt} />
                  <MetricRow label="Taxable Amount" value={data.b2c?.taxable_amount} />
                  <MetricRow label="CGST" value={data.b2c?.cgst} />
                  <MetricRow label="SGST" value={data.b2c?.sgst} />
                </div>
                <div>
                  <MetricRow label="Subtotal" value={data.b2c?.subtotal} />
                  <MetricRow label="Rounding Value" value={data.b2c?.rounding_value} />
                  <MetricRow label="Payable" value={data.b2c?.payable} />
                  <MetricRow label="Pickup Fare" value={data.b2c?.pickup_fare} />
                  <MetricRow label="Pickup Fare Driver" value={data.b2c?.pickup_fare_driver} />
                  <MetricRow label="Pickup Fare DU" value={data.b2c?.pickup_fare_du} />
                </div>
              </div>
            </div>
          </section>

          {/* B2B Revenue */}
          <section>
            <SectionHeader title="B2B Revenue" color="bg-purple-500" />
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                <div className="bg-purple-100 rounded-lg p-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500">No. of Bookings</p>
                  <p className="text-2xl font-bold text-purple-700">{fmtInt(data.b2b?.booking_count)}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
                <div>
                  <MetricRow label="Base Fare" value={data.b2b?.Base_Fare} />
                  <MetricRow label="Extra Charges" value={data.b2b?.Extra_Charges} />
                  <MetricRow label="Night Charges" value={data.b2b?.Night_Charges} />
                </div>
                <div>
                  <MetricRow label="Total Fare" value={data.b2b?.Total_Fare} />
                  <MetricRow label="Driver Fare" value={data.b2b?.Driver_Fare} />
                  <MetricRow label="Convenience Fee" value={data.b2b?.Convenience_Fee} />
                </div>
                <div>
                  <MetricRow label="Trip Secure Fee" value={data.b2b?.Trip_Secure_Fee} />
                  <MetricRow label="GST on Conv. & Trip Sec." value={data.b2b?.GST_Conv_TripSec_Fee} />
                  <MetricRow label="Payable" value={data.b2b?.Payable} />
                </div>
              </div>
            </div>
          </section>

          {/* Driver Wallet */}
          <section>
            <SectionHeader title="Driver Wallet" color="bg-orange-500" />
            {data.driverWallet.length === 0 ? (
              <p className="text-sm text-gray-400">No data for this period.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.driverWallet.map((row) => (
                  <WalletCard
                    key={row.Vertical}
                    name={row.Vertical ?? "Unknown"}
                    debit={Number(row.total_debit)}
                    credit={Number(row.total_credit)}
                    net={Number(row.net)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Customer Wallet */}
          <section>
            <SectionHeader title="Customer Wallet" color="bg-teal-500" />
            {data.customerWallet.length === 0 ? (
              <p className="text-sm text-gray-400">No data for this period.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.customerWallet.map((row) => (
                  <WalletCard
                    key={row.vertical}
                    name={row.vertical ?? "Unknown"}
                    debit={Number(row.total_debit)}
                    credit={Number(row.total_credit)}
                    net={Number(row.net)}
                  />
                ))}
              </div>
            )}
          </section>

        </div>
      )}
    </div>
  );
}
