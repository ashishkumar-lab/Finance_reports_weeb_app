import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Props {
  children: React.ReactNode;
  userName: string;
  isAdmin: boolean;
}

export default function AppLayout({ children, userName, isAdmin }: Props) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar userName={userName} isAdmin={isAdmin} />
        <main className="flex-1 px-6 py-8">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
