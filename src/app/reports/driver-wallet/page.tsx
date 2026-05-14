import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { getUserPermissions } from "@/lib/userDb";
import AppLayout from "@/components/AppLayout";
import ReportTableClient, { ColDef } from "@/components/ReportTableClient";
import DashboardLocked from "@/components/DashboardLocked";

const COLUMNS: ColDef[] = [
  { header: "Driver ID",            key: "DriverId",              minWidth: 100 },
  { header: "Driver Name",          key: "DriverName",            minWidth: 160 },
  { header: "Service Type",         key: "service_type",          minWidth: 130 },
  { header: "City",                 key: "City",                  minWidth: 120 },
  { header: "Zone",                 key: "Zone",                  minWidth: 150 },
  { header: "Ref ID (Formatted)",   key: "convert_reference_id",  minWidth: 180 },
  { header: "Reference ID",         key: "reference_id",          minWidth: 180 },
  { header: "Debit",                key: "Debit",                 minWidth: 110, numeric: true },
  { header: "Credit",               key: "Credit",                minWidth: 110, numeric: true },
  { header: "Closing Balance",      key: "Closing_Balance",       minWidth: 140 },
  { header: "Client Name",          key: "ClientName",            minWidth: 180 },
  { header: "Description",          key: "Description",           minWidth: 240 },
  { header: "Vertical",             key: "Vertical",              minWidth: 200 },
  { header: "Incentive",            key: "Incentive",             minWidth: 180 },
  { header: "Comments",             key: "comments",              minWidth: 220 },
  { header: "Transaction Date",     key: "Transaction_Date",      minWidth: 170 },
  { header: "Category",             key: "Category",              minWidth: 110 },
  { header: "Plan Category",        key: "plan_category",         minWidth: 150 },
];

export default async function DriverWalletPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.status === "pending") redirect("/pending");
  if (session.user.status === "rejected") redirect("/login?error=rejected");

  const hasAccess = session.user.isAdmin || (
    session.user.dbUserId
      ? (await getUserPermissions(session.user.dbUserId)).includes("driver-wallet")
      : false
  );

  return (
    <AppLayout userName={session.user?.name ?? "User"} isAdmin={session.user.isAdmin}>
      {!hasAccess ? (
        <DashboardLocked dashboardId="driver-wallet" dashboardName="Driver Wallet Report" />
      ) : (
        <ReportTableClient reportId="driver-wallet" reportName="Driver Wallet Report" columns={COLUMNS} />
      )}
    </AppLayout>
  );
}
