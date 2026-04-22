"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const COLUMNS = [
  { key: "booking_id",         label: "Booking ID" },
  { key: "booking_ref",        label: "Booking Ref" },
  { key: "booking_type",       label: "Booking Type" },
  { key: "booking_status_id",  label: "Status ID" },
  { key: "booking_status_text",label: "Status" },
  { key: "booking_created_at", label: "Created At" },
  { key: "pickup_date",        label: "Pickup Date" },
  { key: "pickup_time",        label: "Pickup Time" },
  { key: "drop_date",          label: "Drop Date" },
  { key: "drop_time",          label: "Drop Time" },
  { key: "trip_start_time",    label: "Trip Start" },
  { key: "trip_end_time",      label: "Trip End" },
  { key: "actual_distance_km", label: "Distance (km)" },
  { key: "trip_total_days",    label: "Total Days" },
  { key: "waiting_time_mins",  label: "Waiting (mins)" },
  { key: "trip_base_fare",     label: "Base Fare" },
  { key: "extra_km_charges",   label: "Extra KM" },
  { key: "extra_hr_charges",   label: "Extra HR" },
  { key: "waiting_charges",    label: "Waiting Charges" },
  { key: "trip_toll_charges",  label: "Toll" },
  { key: "parking_charges",    label: "Parking" },
  { key: "night_charges",      label: "Night Charges" },
  { key: "batta_charges",      label: "Batta" },
  { key: "trip_subtotal",      label: "Subtotal" },
  { key: "discount",           label: "Discount" },
  { key: "gst_amount",         label: "GST" },
  { key: "trip_final_price",   label: "Final Price" },
  { key: "customer_name",      label: "Customer" },
  { key: "vehicle_type",       label: "Vehicle Type" },
  { key: "vehicle_make",       label: "Make" },
  { key: "vehicle_model",      label: "Model" },
  { key: "pickup_address",     label: "Pickup Address" },
  { key: "pickup_city",        label: "Pickup City" },
  { key: "pickup_state",       label: "Pickup State" },
  { key: "pickup_pincode",     label: "Pickup PIN" },
  { key: "drop_address",       label: "Drop Address" },
  { key: "drop_city",          label: "Drop City" },
  { key: "drop_state",         label: "Drop State" },
  { key: "drop_pincode",       label: "Drop PIN" },
  { key: "vendor_name",        label: "Vendor" },
  { key: "vendor_entity_type", label: "Vendor Type" },
  { key: "vendor_status",      label: "Vendor Status" },
  { key: "estimatedPrice",     label: "Est. Price" },
  { key: "baseFare",           label: "Base Fare (b)" },
  { key: "perDayRate",         label: "Per Day Rate" },
  { key: "nightBatta",         label: "Night Batta" },
  { key: "maxKm",              label: "Max KM/Day" },
  { key: "extraHrRate",        label: "Extra HR Rate" },
  { key: "extraKmRate",        label: "Extra KM Rate" },
  { key: "paymentAmount",      label: "Paid Amount" },
  { key: "paymentStatus",      label: "Payment Status" },
  { key: "paymentGateway",     label: "Gateway" },
  { key: "paymentTxnId",       label: "Txn ID" },
  { key: "paymentOrderId",     label: "Order ID" },
  { key: "paymentDate",        label: "Payment Date" },
];

const FILTER_LABELS: Record<string, string> = {
  all: "Total Requests",
  completed: "Completed (4 & 8)",
  cancelled: "Cancelled",
  pending: "Pending",
  confirmed: "Confirmed",
  others: "Others",
};

function fmt(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (val instanceof Date) return val.toLocaleString();
  const s = String(val);
  if (s === "") return "—";
  return s;
}

export default function CarRentalDetailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filter    = searchParams.get("filter") ?? "all";
  const startDate = searchParams.get("startDate") ?? "";
  const endDate   = searchParams.get("endDate") ?? "";

  const [rows, setRows]   = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const limit = 50;

  const fetchData = useCallback(async (p: number) => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/dashboard/car-rental/detail?filter=${filter}&startDate=${startDate}&endDate=${endDate}&page=${p}&limit=${limit}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setRows(json.rows);
      setTotal(json.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error occurred");
    } finally {
      setLoading(false);
    }
  }, [filter, startDate, endDate]);

  useEffect(() => { fetchData(page); }, [fetchData, page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="h-4 w-px bg-gray-300" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {FILTER_LABELS[filter] ?? filter}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{startDate} → {endDate}</p>
        </div>
        <span className="ml-auto bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
          {total.toLocaleString()} records
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-[#1e3a8a]">
                    {COLUMNS.map((col) => (
                      <th key={col.key}
                        className="px-3 py-2.5 text-left text-white font-semibold whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMNS.length} className="text-center text-gray-400 py-10">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        {COLUMNS.map((col) => (
                          <td key={col.key}
                            className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate"
                            title={fmt(row[col.key])}>
                            {fmt(row[col.key])}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()}
              </p>
              <div className="flex gap-2">
                <button onClick={() => { setPage(p => p - 1); fetchData(page - 1); }}
                  disabled={page === 1 || loading}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                  Previous
                </button>
                <span className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium">
                  {page} / {totalPages}
                </span>
                <button onClick={() => { setPage(p => p + 1); fetchData(page + 1); }}
                  disabled={page === totalPages || loading}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
