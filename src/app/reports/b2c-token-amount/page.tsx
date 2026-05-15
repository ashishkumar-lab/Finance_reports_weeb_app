import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { getUserPermissions } from "@/lib/userDb";
import AppLayout from "@/components/AppLayout";
import B2CTokenAmountClient from "@/components/B2CTokenAmountClient";
import DashboardLocked from "@/components/DashboardLocked";

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
        <B2CTokenAmountClient />
      )}
    </AppLayout>
  );
}
