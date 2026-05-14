import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { getUserPermissions } from "@/lib/userDb";
import AppLayout from "@/components/AppLayout";
import ReportTableClient, { ColDef } from "@/components/ReportTableClient";
import DashboardLocked from "@/components/DashboardLocked";

const COLUMNS: ColDef[] = [
  { header: "Booking ID",            key: "booking_id",          minWidth: 110 },
  { header: "Booking Ref",           key: "booking_ref",         minWidth: 150 },
  { header: "Booking Type",          key: "booking_type",        minWidth: 130 },
  { header: "Status ID",             key: "booking_status_id",   minWidth: 100 },
  { header: "Status",                key: "booking_status_text", minWidth: 120 },
  { header: "Booking Created At",    key: "booking_created_at",  minWidth: 170 },
  { header: "Pickup Date",           key: "pickup_date",         minWidth: 120 },
  { header: "Pickup Time",           key: "pickup_time",         minWidth: 110 },
  { header: "Drop Date",             key: "drop_date",           minWidth: 110 },
  { header: "Drop Time",             key: "drop_time",           minWidth: 110 },
  { header: "Trip Start Time",       key: "trip_start_time",     minWidth: 160 },
  { header: "Trip End Time",         key: "trip_end_time",       minWidth: 160 },
  { header: "Actual Distance (km)",  key: "actual_distance_km",  minWidth: 160, numeric: true },
  { header: "Trip Total Days",       key: "trip_total_days",     minWidth: 130, numeric: true },
  { header: "Waiting Time (mins)",   key: "waiting_time_mins",   minWidth: 160, numeric: true },
  { header: "Trip Base Fare",        key: "trip_base_fare",      minWidth: 130, numeric: true },
  { header: "Extra KM Charges",      key: "extra_km_charges",    minWidth: 150, numeric: true },
  { header: "Extra HR Charges",      key: "extra_hr_charges",    minWidth: 150, numeric: true },
  { header: "Waiting Charges",       key: "waiting_charges",     minWidth: 140, numeric: true },
  { header: "Toll Charges",          key: "trip_toll_charges",   minWidth: 130, numeric: true },
  { header: "Parking Charges",       key: "parking_charges",     minWidth: 140, numeric: true },
  { header: "Night Charges",         key: "night_charges",       minWidth: 130, numeric: true },
  { header: "Batta Charges",         key: "batta_charges",       minWidth: 130, numeric: true },
  { header: "Trip Subtotal",         key: "trip_subtotal",       minWidth: 130, numeric: true },
  { header: "Discount",              key: "discount",            minWidth: 110, numeric: true },
  { header: "GST Amount",            key: "gst_amount",          minWidth: 120, numeric: true },
  { header: "Trip Final Price",      key: "trip_final_price",    minWidth: 150, numeric: true },
  { header: "Customer Name",         key: "customer_name",       minWidth: 160 },
  { header: "Vehicle Type",          key: "vehicle_type",        minWidth: 130 },
  { header: "Vehicle Make",          key: "vehicle_make",        minWidth: 130 },
  { header: "Vehicle Model",         key: "vehicle_model",       minWidth: 130 },
  { header: "Pickup Address",        key: "pickup_address",      minWidth: 220 },
  { header: "Pickup City",           key: "pickup_city",         minWidth: 120 },
  { header: "Pickup State",          key: "pickup_state",        minWidth: 120 },
  { header: "Pickup Pincode",        key: "pickup_pincode",      minWidth: 130 },
  { header: "Drop Address",          key: "drop_address",        minWidth: 220 },
  { header: "Drop City",             key: "drop_city",           minWidth: 110 },
  { header: "Drop State",            key: "drop_state",          minWidth: 110 },
  { header: "Drop Pincode",          key: "drop_pincode",        minWidth: 120 },
  { header: "Vendor Name",           key: "vendor_name",         minWidth: 160 },
  { header: "Vendor Entity Type",    key: "vendor_entity_type",  minWidth: 160 },
  { header: "Vendor Status",         key: "vendor_status",       minWidth: 130 },
  { header: "Estimated Price",       key: "estimatedPrice",      minWidth: 140, numeric: true },
  { header: "Base Fare",             key: "baseFare",            minWidth: 110, numeric: true },
  { header: "Per Day Rate",          key: "perDayRate",          minWidth: 120, numeric: true },
  { header: "Night Batta",           key: "nightBatta",          minWidth: 120, numeric: true },
  { header: "Max KM/Day",            key: "maxKm",               minWidth: 110, numeric: true },
  { header: "Extra HR Rate",         key: "extraHrRate",         minWidth: 130, numeric: true },
  { header: "Extra KM Rate",         key: "extraKmRate",         minWidth: 130, numeric: true },
  { header: "Payment Amount",        key: "paymentAmount",       minWidth: 150, numeric: true },
  { header: "Payment Status",        key: "paymentStatus",       minWidth: 140 },
  { header: "Payment Gateway",       key: "paymentGateway",      minWidth: 150 },
  { header: "Payment Txn ID",        key: "paymentTxnId",        minWidth: 180 },
  { header: "Payment Order ID",      key: "paymentOrderId",      minWidth: 180 },
  { header: "Payment Date",          key: "paymentDate",         minWidth: 160 },
];

export default async function CarRentalBookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.status === "pending") redirect("/pending");
  if (session.user.status === "rejected") redirect("/login?error=rejected");

  const hasAccess = session.user.isAdmin || (
    session.user.dbUserId
      ? (await getUserPermissions(session.user.dbUserId)).includes("car-rental-bookings")
      : false
  );

  return (
    <AppLayout userName={session.user?.name ?? "User"} isAdmin={session.user.isAdmin}>
      {!hasAccess ? (
        <DashboardLocked dashboardId="car-rental-bookings" dashboardName="Car Rental Booking Request Report" />
      ) : (
        <ReportTableClient reportId="car-rental-bookings" reportName="Car Rental Booking Request Report" columns={COLUMNS} />
      )}
    </AppLayout>
  );
}
