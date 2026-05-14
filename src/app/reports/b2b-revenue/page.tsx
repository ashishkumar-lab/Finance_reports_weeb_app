import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { getUserPermissions } from "@/lib/userDb";
import AppLayout from "@/components/AppLayout";
import ReportTableClient, { ColDef } from "@/components/ReportTableClient";
import DashboardLocked from "@/components/DashboardLocked";

const COLUMNS: ColDef[] = [
  { header: "City",                   key: "City",                    minWidth: 120 },
  { header: "Booking ID",             key: "booking_id",              minWidth: 180 },
  { header: "Driver Name",            key: "Driver_Name",             minWidth: 160 },
  { header: "Driver ID",              key: "Driver_Id",               minWidth: 100 },
  { header: "Client ID",              key: "Client_ID",               minWidth: 110 },
  { header: "Vehicle Number",         key: "Vehicle_Number",          minWidth: 140 },
  { header: "Client Name",            key: "Client_Name",             minWidth: 180 },
  { header: "Pickup Address",         key: "pickup_address",          minWidth: 240 },
  { header: "Drop Address",           key: "drop_address",            minWidth: 240 },
  { header: "Booking Type",           key: "booking_type",            minWidth: 140 },
  { header: "Trip Category",          key: "trip_category",           minWidth: 130 },
  { header: "Booking Created At",     key: "booking_created_at",      minWidth: 170 },
  { header: "Pickup Datetime",        key: "pickup_datetime",         minWidth: 170 },
  { header: "Driver Reached At",      key: "driver_reached_at",       minWidth: 170 },
  { header: "Delay Time (min)",       key: "Delay_Time",              minWidth: 130, numeric: true },
  { header: "Pickup Checklist Time",  key: "Pickup_Checklist_Time",   minWidth: 180 },
  { header: "Trip Started At",        key: "trip_started_at",         minWidth: 170 },
  { header: "Drop Checklist Time",    key: "Drop_Checklist_Time",     minWidth: 180 },
  { header: "Trip Ended At",          key: "trip_ended_at",           minWidth: 170 },
  { header: "Trip Time",              key: "trip_time",               minWidth: 110, numeric: true },
  { header: "Distance Travel",        key: "Distance_Travel",         minWidth: 140, numeric: true },
  { header: "Est. Distance Travel",   key: "Est_Distance_Travel",     minWidth: 160, numeric: true },
  { header: "Booking Request",        key: "Booking_request",         minWidth: 150 },
  { header: "Insurance Coverage",     key: "insurance_coverage",      minWidth: 160 },
  { header: "Insurance Applicable",   key: "insurance_applicable",    minWidth: 160 },
  { header: "Base Fare",              key: "Base_Fare",               minWidth: 110, numeric: true },
  { header: "Extra Charges",          key: "Extra_Charges",           minWidth: 120, numeric: true },
  { header: "Night Charges",          key: "Night_Charges",           minWidth: 120, numeric: true },
  { header: "Total Fare",             key: "Total_Fare",              minWidth: 110, numeric: true },
  { header: "Driver Fare",            key: "Driver_Fare",             minWidth: 110, numeric: true },
  { header: "Convenience Fee",        key: "Convenience_Fee",         minWidth: 140, numeric: true },
  { header: "Trip Secure Fee",        key: "Trip_Secure_Fee",         minWidth: 140, numeric: true },
  { header: "GST Conv & Trip Sec",    key: "GST_Conv_TripSec_Fee",    minWidth: 170, numeric: true },
  { header: "Payable",                key: "Payable",                 minWidth: 110, numeric: true },
  { header: "Instructions",           key: "instructions",            minWidth: 220 },
];

export default async function B2BRevenuePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.status === "pending") redirect("/pending");
  if (session.user.status === "rejected") redirect("/login?error=rejected");

  const hasAccess = session.user.isAdmin || (
    session.user.dbUserId
      ? (await getUserPermissions(session.user.dbUserId)).includes("b2b-revenue")
      : false
  );

  return (
    <AppLayout userName={session.user?.name ?? "User"} isAdmin={session.user.isAdmin}>
      {!hasAccess ? (
        <DashboardLocked dashboardId="b2b-revenue" dashboardName="B2B Revenue Report" />
      ) : (
        <ReportTableClient reportId="b2b-revenue" reportName="B2B Revenue Report" columns={COLUMNS} />
      )}
    </AppLayout>
  );
}
