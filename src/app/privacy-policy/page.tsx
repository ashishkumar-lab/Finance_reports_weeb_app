import Link from "next/link";

export const metadata = { title: "Privacy Policy — Finance Reports | DriveU" };

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-900 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-blue-300 text-sm mb-2">DriveU Mobility Solutions Pvt. Ltd.</p>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-blue-200 mt-2 text-sm">Finance Reports Internal Portal — Effective: January 1, 2025</p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        <Section title="1. Introduction">
          <p>DriveU Mobility Solutions Private Limited ("DriveU", "we", "our") is committed to protecting the privacy of authorized users of the Finance Reports Internal Portal. This Privacy Policy explains what information we collect, how we use it, and how it is protected.</p>
          <p className="mt-3">This policy applies solely to users of the Finance Reports Portal and does not govern DriveU's consumer-facing products or public website at <a href="https://www.driveu.in" className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">www.driveu.in</a>.</p>
        </Section>

        <Section title="2. Information We Collect">
          <p>We collect the following types of information when you use this Portal:</p>
          <div className="mt-3 space-y-3">
            <div>
              <p className="font-semibold text-gray-800">a) Authentication Information</p>
              <ul className="list-disc pl-6 mt-1 space-y-1">
                <li>Email address used to log in.</li>
                <li>Encrypted password hash (stored securely, never in plain text).</li>
                <li>Session tokens (stored as secure HTTP-only cookies).</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-800">b) Activity Logs</p>
              <ul className="list-disc pl-6 mt-1 space-y-1">
                <li>Report name downloaded.</li>
                <li>Date range selected for the report.</li>
                <li>Timestamp of download.</li>
                <li>Email of the user who performed the download.</li>
                <li>Download status (success or error).</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-800">c) Report Data</p>
              <p className="mt-1">Reports generated through this Portal query the DriveU production database and may contain personal data of customers and drivers (mobile numbers, names, transaction details). This data is read-only and is not stored by the Portal — it is delivered directly to you as an Excel file.</p>
            </div>
          </div>
        </Section>

        <Section title="3. How We Use the Information">
          <ul className="list-disc pl-6 space-y-2">
            <li><span className="font-medium">Authentication:</span> To verify your identity and maintain your session securely.</li>
            <li><span className="font-medium">Audit Trail:</span> Download logs are retained to maintain accountability and support compliance reviews.</li>
            <li><span className="font-medium">Security Monitoring:</span> Access logs may be reviewed to detect unauthorized or unusual activity.</li>
            <li><span className="font-medium">Operational Improvement:</span> Aggregated usage data helps us improve Portal performance and reliability.</li>
          </ul>
        </Section>

        <Section title="4. Data Storage &amp; Security">
          <ul className="list-disc pl-6 space-y-2">
            <li>All passwords are hashed using bcrypt (cost factor 12) before storage. Plain-text passwords are never stored.</li>
            <li>Session tokens are stored in HTTP-only, secure cookies and expire upon logout or after the session timeout.</li>
            <li>Download logs are stored in the DriveU internal MySQL database, accessible only within the secure network.</li>
            <li>Database connections use SSL/TLS encryption.</li>
            <li>Access to the Portal requires authentication; unauthenticated requests are automatically redirected to the login page.</li>
          </ul>
        </Section>

        <Section title="5. Data Sharing">
          <p>We do not sell, rent, or share your personal information with any third parties. Download activity data is accessible only to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>The Finance team for operational reporting.</li>
            <li>The IT / Engineering team for system maintenance and security audits.</li>
            <li>Compliance officers as required by applicable law.</li>
          </ul>
        </Section>

        <Section title="6. Data Retention">
          <p>Download logs are retained indefinitely for audit and compliance purposes. If you require deletion of specific log entries, please contact the Finance or IT team with a formal request and valid business justification.</p>
          <p className="mt-3">Session cookies are deleted upon logout or browser closure. Persistent session tokens expire within 24 hours.</p>
        </Section>

        <Section title="7. Your Rights">
          <p>As an authorized user, you have the right to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Change your password at any time via the Change Password page.</li>
            <li>Request information about what data is stored about your account by contacting the IT team.</li>
            <li>Request removal of your account by contacting the Finance or IT team when you no longer require access.</li>
          </ul>
        </Section>

        <Section title="8. Cookies">
          <p>This Portal uses cookies solely for session management. Please see our <Link href="/cookies" className="text-primary-600 hover:underline">Cookie Policy</Link> for full details.</p>
        </Section>

        <Section title="9. Compliance">
          <p>DriveU is committed to compliance with applicable Indian data protection laws, including the Information Technology Act, 2000 (and its rules), and the Digital Personal Data Protection Act, 2023. If you believe your data rights have been violated, you may raise a concern with DriveU's designated Data Protection Officer or the relevant regulatory authority.</p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. Significant changes will be communicated to users via internal channels. Continued use of the Portal constitutes acceptance of the updated policy.</p>
        </Section>

        <Section title="11. Contact Us">
          <p>For privacy-related inquiries, contact:</p>
          <div className="mt-2 bg-gray-50 rounded-lg px-4 py-3 text-sm">
            <p className="font-semibold text-gray-900">DriveU Mobility Solutions Private Limited</p>
            <p className="text-gray-600">No. 19, 3rd Floor, 1st Cross Road, KHB Colony</p>
            <p className="text-gray-600">5th Block Koramangala, Bengaluru – 560095</p>
            <p className="text-gray-600 mt-1">Website: <a href="https://www.driveu.in" className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">www.driveu.in</a></p>
          </div>
        </Section>

        <Footer />
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-6">
      <h2 className="text-lg font-bold text-gray-900 mb-3">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed">{children}</div>
    </section>
  );
}

function Footer() {
  return (
    <div className="flex flex-wrap gap-4 justify-center text-xs text-gray-400 pb-8 pt-4">
      <Link href="/terms" className="hover:text-primary-600">Terms &amp; Conditions</Link>
      <span>·</span>
      <Link href="/privacy-policy" className="hover:text-primary-600">Privacy Policy</Link>
      <span>·</span>
      <Link href="/cookies" className="hover:text-primary-600">Cookie Policy</Link>
      <span>·</span>
      <Link href="/copyright" className="hover:text-primary-600">Copyright</Link>
      <span>·</span>
      <Link href="/dashboard" className="hover:text-primary-600">Back to Dashboard</Link>
    </div>
  );
}
