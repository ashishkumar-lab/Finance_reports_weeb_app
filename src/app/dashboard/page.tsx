import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import AppLayout from "@/components/AppLayout";
import ReportCard from "@/components/ReportCard";
import { getUserPermissions, ALL_REPORTS } from "@/lib/userDb";

const reports = [
  { id: "b2c-revenue",         title: "B2C Revenue Report",                description: "Business-to-Consumer revenue breakdown including transaction totals, refunds, and net revenue by date range.", icon: "b2c",      color: "blue"   },
  { id: "b2b-revenue",         title: "B2B Revenue Report",                description: "Business-to-Business revenue summary covering corporate accounts, invoices, and payment settlements.",         icon: "b2b",      color: "green"  },
  { id: "driver-wallet",       title: "Driver Wallet Report",              description: "Driver wallet transactions including earnings, withdrawals, bonuses, and current balances.",                   icon: "driver",   color: "orange" },
  { id: "customer-wallet",     title: "Customer Wallet Report",            description: "Customer wallet activity covering top-ups, spending, refunds, and wallet balance history.",                   icon: "customer", color: "purple" },
  { id: "car-rental-bookings", title: "Car Rental Booking Request Report", description: "All car rental booking requests with status, trip details, vehicle info, pricing, and payment breakdown.",    icon: "b2b",      color: "blue"   },
  { id: "car-rental-revenue",  title: "Car Rental Revenue Report",         description: "Completed car rental trips (status 4 & 8) with full trip financials, fare breakdown, and payment details.",  icon: "b2c",      color: "green"  },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.status === "pending") redirect("/pending");
  if (session.user.status === "rejected") redirect("/login?error=rejected");

  // Get user's allowed reports
  let allowedReports: string[];
  if (session.user.isAdmin) {
    allowedReports = ALL_REPORTS.map((r) => r.id);
  } else {
    allowedReports = session.user.dbUserId
      ? await getUserPermissions(session.user.dbUserId)
      : [];
  }

  return (
    <AppLayout userName={session.user?.name ?? "User"} isAdmin={session.user.isAdmin}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Finance Reports</h1>
          <p className="text-gray-500 mt-1">Select a report, choose a date range, and download as Excel.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              hasAccess={allowedReports.includes(report.id)}
            />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
