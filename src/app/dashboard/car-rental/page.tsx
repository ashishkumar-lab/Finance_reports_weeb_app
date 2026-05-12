import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { getUserPermissions } from "@/lib/userDb";
import AppLayout from "@/components/AppLayout";
import CarRentalDashboardClient from "./CarRentalDashboardClient";

export default async function CarRentalDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.status === "pending") redirect("/pending");
  if (session.user.status === "rejected") redirect("/login?error=rejected");

  if (!session.user.isAdmin) {
    const perms = await getUserPermissions(session.user.dbUserId!);
    if (!perms.includes("dash-car-rental")) redirect("/unauthorized");
  }

  return (
    <AppLayout userName={session.user?.name ?? "User"} isAdmin={session.user.isAdmin}>
      <CarRentalDashboardClient />
    </AppLayout>
  );
}
