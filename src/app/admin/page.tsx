"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface User {
  id: number;
  email: string;
  name: string;
  image: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  permissions: string[];
}

interface Report { id: string; name: string; }

const STATUS_BADGE: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !session.user.isAdmin) router.push("/dashboard");
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.isAdmin) return;
    fetchUsers();
  }, [status, session]);

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users ?? []);
    setReports(data.reports ?? []);
    setLoading(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleAction(userId: number, action: string, extra?: object) {
    const key = `${userId}-${action}`;
    setActionLoading(key);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    setActionLoading(null);
    if (res.ok) {
      showToast(data.message);
      fetchUsers();
    } else {
      showToast(data.error ?? "Action failed.");
    }
  }

  async function togglePermission(userId: number, reportId: string, currentlyGranted: boolean) {
    await handleAction(userId, "permission", { reportId, grant: !currentlyGranted });
  }

  const pending  = users.filter((u) => u.status === "pending");
  const approved = users.filter((u) => u.status === "approved");
  const rejected = users.filter((u) => u.status === "rejected");

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar userName={session?.user?.name ?? "Admin"} isAdmin={true} />

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-500 mt-1">Manage user access and report permissions.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Pending Approval", count: pending.length,  color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
            { label: "Approved Users",   count: approved.length, color: "text-green-600",  bg: "bg-green-50 border-green-200"  },
            { label: "Rejected Users",   count: rejected.length, color: "text-red-600",    bg: "bg-red-50 border-red-200"    },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border rounded-xl px-5 py-4`}>
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.count}</p>
            </div>
          ))}
        </div>

        {/* Pending users */}
        {pending.length > 0 && (
          <Section title="Pending Approval" count={pending.length} accent="yellow">
            <div className="divide-y divide-gray-100">
              {pending.map((u) => (
                <UserRow key={u.id} user={u} reports={reports}
                  actionLoading={actionLoading}
                  onApprove={() => handleAction(u.id, "approve")}
                  onReject={() => handleAction(u.id, "reject")}
                  onTogglePermission={(rId, granted) => togglePermission(u.id, rId, granted)}
                  showPermissions={false}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Approved users */}
        {approved.length > 0 && (
          <Section title="Approved Users" count={approved.length} accent="green">
            <div className="divide-y divide-gray-100">
              {approved.map((u) => (
                <UserRow key={u.id} user={u} reports={reports}
                  actionLoading={actionLoading}
                  onApprove={() => handleAction(u.id, "approve")}
                  onReject={() => handleAction(u.id, "reject")}
                  onTogglePermission={(rId, granted) => togglePermission(u.id, rId, granted)}
                  showPermissions={true}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Rejected users */}
        {rejected.length > 0 && (
          <Section title="Rejected Users" count={rejected.length} accent="red">
            <div className="divide-y divide-gray-100">
              {rejected.map((u) => (
                <UserRow key={u.id} user={u} reports={reports}
                  actionLoading={actionLoading}
                  onApprove={() => handleAction(u.id, "approve")}
                  onReject={() => handleAction(u.id, "reject")}
                  onTogglePermission={(rId, granted) => togglePermission(u.id, rId, granted)}
                  showPermissions={false}
                />
              ))}
            </div>
          </Section>
        )}

        {users.length === 0 && (
          <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-200">
            <p className="text-sm">No users have registered yet.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, count, accent, children }: {
  title: string; count: number; accent: string; children: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    yellow: "text-yellow-700 bg-yellow-50",
    green: "text-green-700 bg-green-50",
    red: "text-red-700 bg-red-50",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors[accent]}`}>{count}</span>
      </div>
      {children}
    </div>
  );
}

function UserRow({ user, reports, actionLoading, onApprove, onReject, onTogglePermission, showPermissions }: {
  user: User;
  reports: Report[];
  actionLoading: string | null;
  onApprove: () => void;
  onReject: () => void;
  onTogglePermission: (reportId: string, granted: boolean) => void;
  showPermissions: boolean;
}) {
  const approveKey = `${user.id}-approve`;
  const rejectKey  = `${user.id}-reject`;

  return (
    <div className="px-6 py-4">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Avatar */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {user.image ? (
            <img src={user.image} alt="" className="w-9 h-9 rounded-full flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
              {user.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>

        {/* Status badge */}
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[user.status]}`}>
          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
        </span>

        {/* Action buttons */}
        <div className="flex gap-2">
          {user.status !== "approved" && (
            <button onClick={onApprove} disabled={actionLoading === approveKey}
              className="text-xs font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors">
              {actionLoading === approveKey ? "..." : "Approve"}
            </button>
          )}
          {user.status !== "rejected" && (
            <button onClick={onReject} disabled={actionLoading === rejectKey}
              className="text-xs font-semibold bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors">
              {actionLoading === rejectKey ? "..." : "Reject"}
            </button>
          )}
        </div>
      </div>

      {/* Report permissions (only for approved users) */}
      {showPermissions && (
        <div className="mt-3 ml-12 flex flex-wrap gap-2">
          {reports.map((r) => {
            const granted = user.permissions.includes(r.id);
            return (
              <button key={r.id} onClick={() => onTogglePermission(r.id, granted)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  granted
                    ? "bg-primary-50 border-primary-300 text-primary-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                    : "bg-gray-50 border-gray-300 text-gray-500 hover:bg-green-50 hover:border-green-300 hover:text-green-600"
                }`}>
                {granted ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
                {r.name.replace(" Report", "")}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
