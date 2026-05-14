import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { getUserPermissions } from "@/lib/userDb";
import AppLayout from "@/components/AppLayout";
import ReportTableClient, { ColDef } from "@/components/ReportTableClient";
import DashboardLocked from "@/components/DashboardLocked";

const COLUMNS: ColDef[] = [
  { header: "Mobile",           key: "mobile",          minWidth: 130 },
  { header: "First Name",       key: "first_name",      minWidth: 150 },
  { header: "City",             key: "city",            minWidth: 120 },
  { header: "Booking City",     key: "booking_city",    minWidth: 130 },
  { header: "Category",         key: "Category",        minWidth: 110 },
  { header: "Reference ID",     key: "reference_id",    minWidth: 180 },
  { header: "Debit",            key: "Debit",           minWidth: 100, numeric: true },
  { header: "Credit",           key: "Credit",          minWidth: 100, numeric: true },
  { header: "Closing Balance",  key: "Closing_Balance", minWidth: 140 },
  { header: "Txn Description",  key: "txn_desc",        minWidth: 240 },
  { header: "Comments",         key: "comments",        minWidth: 220 },
  { header: "Created At",       key: "created_at",      minWidth: 170 },
  { header: "Component Type",   key: "component_type",  minWidth: 140 },
  { header: "Vertical",         key: "vertical",        minWidth: 200 },
];

export default async function CustomerWalletPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.status === "pending") redirect("/pending");
  if (session.user.status === "rejected") redirect("/login?error=rejected");

  const hasAccess = session.user.isAdmin || (
    session.user.dbUserId
      ? (await getUserPermissions(session.user.dbUserId)).includes("customer-wallet")
      : false
  );

  return (
    <AppLayout userName={session.user?.name ?? "User"} isAdmin={session.user.isAdmin}>
      {!hasAccess ? (
        <DashboardLocked dashboardId="customer-wallet" dashboardName="Customer Wallet Report" />
      ) : (
        <ReportTableClient reportId="customer-wallet" reportName="Customer Wallet Report" columns={COLUMNS} />
      )}
    </AppLayout>
  );
}
