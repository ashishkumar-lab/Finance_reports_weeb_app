import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { getUserPermissions } from "@/lib/userDb";
import AppLayout from "@/components/AppLayout";
import ReportTableClient, { ColDef, SummaryCardDef } from "@/components/ReportTableClient";
import DashboardLocked from "@/components/DashboardLocked";

const COLUMNS: ColDef[] = [
  { header: "ID",                     key: "id",                       minWidth: 80 },
  { header: "Booking ID",             key: "booking_id",               minWidth: 180 },
  { header: "Formatted Booking ID",   key: "Formated booking_id",      minWidth: 190 },
  { header: "City Name",              key: "City Name",                minWidth: 130 },
  { header: "Zone Name",              key: "Zone Name",                minWidth: 150 },
  { header: "Service Type",           key: "service_type",             minWidth: 130 },
  { header: "User ID",                key: "user_id",                  minWidth: 100 },
  { header: "Driver ID",              key: "driver_id",                minWidth: 100 },
  { header: "Booking Type",           key: "booking_type",             minWidth: 150 },
  { header: "Car Type",               key: "car_type",                 minWidth: 120 },
  { header: "Trip Started At",        key: "trip_started_at",          minWidth: 170 },
  { header: "Trip Ended At",          key: "trip_ended_at",            minWidth: 170 },
  { header: "Trip Time",              key: "trip_time",                minWidth: 100, numeric: true },
  { header: "Actual Distance",        key: "actual_distance",          minWidth: 130, numeric: true },
  { header: "Src",                    key: "src",                      minWidth: 100 },
  { header: "Category",               key: "Category",                 minWidth: 110 },
  { header: "Driver Fee",             key: "driver_fee",               minWidth: 110, numeric: true },
  { header: "Base Discount",          key: "base_discount",            minWidth: 120, numeric: true },
  { header: "Discount on Driver Fee", key: "discount_on_driver_fee",   minWidth: 170, numeric: true },
  { header: "Discount",               key: "discount",                 minWidth: 100, numeric: true },
  { header: "Cancellation Charges",   key: "cancellation_charges",     minWidth: 170, numeric: true },
  { header: "Convenience Fee",        key: "convenience_fee",          minWidth: 140, numeric: true },
  { header: "DU Secure Fee",          key: "du_secure_fee",            minWidth: 120, numeric: true },
  { header: "Platform Fee",           key: "platform_fee",             minWidth: 120, numeric: true },
  { header: "DU Black Amount",        key: "du_black_amt",             minWidth: 130, numeric: true },
  { header: "Taxable Amount",         key: "taxable_amount",           minWidth: 130, numeric: true },
  { header: "CGST",                   key: "cgst",                     minWidth: 90,  numeric: true },
  { header: "SGST",                   key: "sgst",                     minWidth: 90,  numeric: true },
  { header: "Subtotal",               key: "subtotal",                 minWidth: 110, numeric: true },
  { header: "Rounding Value",         key: "rounding_value",           minWidth: 130, numeric: true },
  { header: "Payable",                key: "payable",                  minWidth: 100, numeric: true },
  { header: "Pickup Fare",            key: "pickup_fare",              minWidth: 110, numeric: true },
  { header: "Pickup Fare Driver",     key: "pickup_fare_driver",       minWidth: 150, numeric: true },
  { header: "Pickup Fare DU",         key: "pickup_fare_du",           minWidth: 130, numeric: true },
  { header: "Payment Status",         key: "payment_status",           minWidth: 130 },
  { header: "GSTIN Number",           key: "gstin_number",             minWidth: 160 },
  { header: "Payment Mode",           key: "payment_mode",             minWidth: 180 },
  { header: "External Wallet Amt",    key: "external_wallet_amount",   minWidth: 160, numeric: true },
  { header: "External Txn ID",        key: "external_txn_id",          minWidth: 180 },
  { header: "Earning Plan",           key: "earning_plan",             minWidth: 140 },
  { header: "Is DU Black",            key: "is_du_black",              minWidth: 110 },
];

const SUMMARY_CARDS: SummaryCardDef[] = [
  { label: "Count of Bookings", valueType: "count" },
  {
    label: "Total Revenue",
    valueType: "sum",
    keys: ["driver_fee", "convenience_fee", "du_secure_fee", "platform_fee"],
  },
  { label: "Total Driver Earnings", valueType: "sum", keys: ["driver_fee"] },
  {
    label: "Trip Level Margin",
    valueType: "subtract",
    positiveKeys: ["driver_fee", "convenience_fee", "du_secure_fee", "platform_fee"],
    negativeKeys: ["driver_fee"],
  },
];

export default async function CoachRevenuePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.status === "pending") redirect("/pending");
  if (session.user.status === "rejected") redirect("/login?error=rejected");

  const hasAccess = session.user.isAdmin || (
    session.user.dbUserId
      ? (await getUserPermissions(session.user.dbUserId)).includes("coach-revenue")
      : false
  );

  return (
    <AppLayout userName={session.user?.name ?? "User"} isAdmin={session.user.isAdmin}>
      {!hasAccess ? (
        <DashboardLocked dashboardId="coach-revenue" dashboardName="Coach Revenue Report" />
      ) : (
        <ReportTableClient reportId="coach-revenue" reportName="Coach Revenue Report" columns={COLUMNS} summaryCards={SUMMARY_CARDS} />
      )}
    </AppLayout>
  );
}
