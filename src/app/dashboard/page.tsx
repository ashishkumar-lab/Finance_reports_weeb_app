import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import Navbar from "@/components/Navbar";
import ReportCard from "@/components/ReportCard";
import Footer from "@/components/Footer";
import { getUserPermissions, ALL_REPORTS } from "@/lib/userDb";

const reports = [
  { id: "b2c-revenue",     title: "B2C Revenue Report",     description: "Business-to-Consumer revenue breakdown including transaction totals, refunds, and net revenue by date range.", icon: "b2c",      color: "blue"   },
  { id: "b2b-revenue",     title: "B2B Revenue Report",     description: "Business-to-Business revenue summary covering corporate accounts, invoices, and payment settlements.",         icon: "b2b",      color: "green"  },
  { id: "driver-wallet",   title: "Driver Wallet Report",   description: "Driver wallet transactions including earnings, withdrawals, bonuses, and current balances.",                   icon: "driver",   color: "orange" },
  { id: "customer-wallet", title: "Customer Wallet Report", description: "Customer wallet activity covering top-ups, spending, refunds, and wallet balance history.",                   icon: "customer", color: "purple" },
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar userName={session.user?.name ?? "User"} isAdmin={session.user.isAdmin} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Finance Reports</h1>
          <p className="text-gray-500 mt-1">Select a report, choose a date range, and download as Excel.</p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {reports.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{r.title.replace(" Report", "")}</p>
              <p className={`text-sm font-semibold mt-1 ${allowedReports.includes(r.id) ? "text-green-600" : "text-gray-400"}`}>
                {allowedReports.includes(r.id) ? "Available" : "Locked"}
              </p>
            </div>
          ))}
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
      </main>
      <Footer />
    </div>
  );
}
