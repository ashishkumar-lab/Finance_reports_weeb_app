import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import AppLayout from "@/components/AppLayout";
import CarRentalDashboardClient from "./CarRentalDashboardClient";

export default async function CarRentalDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.status === "pending") redirect("/pending");
  if (session.user.status === "rejected") redirect("/login?error=rejected");

  return (
    <AppLayout userName={session.user?.name ?? "User"} isAdmin={session.user.isAdmin}>
      <CarRentalDashboardClient />
    </AppLayout>
  );
}
