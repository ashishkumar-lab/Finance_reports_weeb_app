"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PendingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      if (session.user.isAdmin || session.user.status === "approved") {
        router.push("/dashboard");
      }
      if (session.user.status === "rejected") {
        router.push("/login?error=rejected");
      }
    }
  }, [status, session, router]);

  if (status === "loading") return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 to-primary-600 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-50 rounded-full mb-5">
          <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Approval Pending</h1>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          Hi <strong>{session?.user?.name}</strong>, your account is under review.<br />
          Our admin team will approve your access shortly.<br />
          You will receive an email once your account is approved.
        </p>

        {/* User info */}
        <div className="bg-gray-50 rounded-xl px-4 py-3 mb-6 text-left">
          <div className="flex items-center gap-3">
            {session?.user?.image && (
              <img src={session.user.image} alt="" className="w-10 h-10 rounded-full" />
            )}
            <div>
              <p className="text-sm font-semibold text-gray-900">{session?.user?.name}</p>
              <p className="text-xs text-gray-500">{session?.user?.email}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700 mb-6">
          A confirmation email has been sent to <strong>{session?.user?.email}</strong>.
          Please wait for admin approval.
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-gray-500 hover:text-red-500 transition-colors"
        >
          Sign out and use a different account
        </button>
      </div>
    </div>
  );
}
