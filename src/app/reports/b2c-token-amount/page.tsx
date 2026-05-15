import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { getUserPermissions } from "@/lib/userDb";
import AppLayout from "@/components/AppLayout";
import ReportTableClient, { ColDef, SummaryCardDef } from "@/components/ReportTableClient";
import DashboardLocked from "@/components/DashboardLocked";

const COLUMNS: ColDef[] = [
  { header: "ID",                        key: "id",                        minWidth: 80 },
  { header: "Token Booking ID",          key: "token_booking_id",          minWidth: 150 },
  { header: "Booking Ref",               key: "booking_ref",               minWidth: 180 },
  { header: "Amount",                    key: "amount",                    minWidth: 120, numeric: true },
  { header: "Refund Amount",             key: "refund_amount",             minWidth: 140, numeric: true },
  { header: "Cancellation Fee Deducted", key: "cancellation_fee_deducted", minWidth: 200, numeric: true },
  { header: "Created At",                key: "created_at",                minWidth: 170 },
  { header: "Booking Status",            key: "booking_status",            minWidth: 140 },
  { header: "Adjusted to Invoice",       key: "Adjusted_to_invoice",       minWidth: 170, numeric: true },
  { header: "Balance Amount",            key: "Balance_Amount",            minWidth: 150, numeric: true },
];

const SUMMARY_CARDS: SummaryCardDef[] = [
  { label: "Total Transactions",             valueType: "count" },
  { label: "Total Amount (Received)",        valueType: "sum",  keys: ["amount"] },
  { label: "Total Cancellation Fee Deducted",valueType: "sum",  keys: ["cancellation_fee_deducted"] },
  { label: "Total Refund Amount",            valueType: "sum",  keys: ["refund_amount"] },
  { label: "Total Adjusted to Invoice",      valueType: "sum",  keys: ["Adjusted_to_invoice"] },
  { label: "Total Balance Amount",           valueType: "sum",  keys: ["Balance_Amount"] },
];

export default async function B2CTokenAmountPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.status === "pending") redirect("/pending");
  if (session.user.status === "rejected") redirect("/login?error=rejected");

  const hasAccess = session.user.isAdmin || (
    session.user.dbUserId
      ? (await getUserPermissions(session.user.dbUserId)).includes("b2c-token-amount")
      : false
  );

  return (
    <AppLayout userName={session.user?.name ?? "User"} isAdmin={session.user.isAdmin}>
      {!hasAccess ? (
        <DashboardLocked dashboardId="b2c-token-amount" dashboardName="B2C Token Amount Report" />
      ) : (
        <ReportTableClient
          reportId="b2c-token-amount"
          reportName="B2C Token Amount Report"
          columns={COLUMNS}
          summaryCards={SUMMARY_CARDS}
        />
      )}
    </AppLayout>
  );
}
