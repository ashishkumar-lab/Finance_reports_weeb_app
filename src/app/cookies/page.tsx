import Link from "next/link";

export const metadata = { title: "Cookie Policy — Finance Reports | DriveU" };

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-900 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-blue-300 text-sm mb-2">DriveU Mobility Solutions Pvt. Ltd.</p>
          <h1 className="text-3xl font-bold">Cookie Policy</h1>
          <p className="text-blue-200 mt-2 text-sm">Finance Reports Internal Portal — Effective: January 1, 2025</p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        <Section title="1. What Are Cookies?">
          <p>Cookies are small text files stored on your device (computer, tablet, or mobile) when you visit a website or use a web application. They are widely used to make applications work efficiently and to provide information to the application owner.</p>
          <p className="mt-3">This Cookie Policy explains how the DriveU Finance Reports Internal Portal uses cookies and similar technologies, and what choices you have regarding them.</p>
        </Section>

        <Section title="2. Cookies We Use">
          <p>This Portal uses only strictly necessary cookies. We do not use advertising, tracking, or analytics cookies.</p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-primary-900 text-white">
                  <th className="px-4 py-3 text-left font-semibold">Cookie Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Purpose</th>
                  <th className="px-4 py-3 text-left font-semibold">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">next-auth.session-token</td>
                  <td className="px-4 py-3 text-gray-600">Session / Auth</td>
                  <td className="px-4 py-3 text-gray-600">Stores your encrypted JWT session token to keep you logged in across page navigations.</td>
                  <td className="px-4 py-3 text-gray-600">Session (cleared on logout or browser close)</td>
                </tr>
                <tr className="border-t border-gray-100 bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">__Secure-next-auth.session-token</td>
                  <td className="px-4 py-3 text-gray-600">Session / Auth</td>
                  <td className="px-4 py-3 text-gray-600">Secure variant of the session token used when the Portal is served over HTTPS in production.</td>
                  <td className="px-4 py-3 text-gray-600">Session (cleared on logout or browser close)</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">next-auth.csrf-token</td>
                  <td className="px-4 py-3 text-gray-600">Security</td>
                  <td className="px-4 py-3 text-gray-600">Prevents Cross-Site Request Forgery (CSRF) attacks during the login and logout flow.</td>
                  <td className="px-4 py-3 text-gray-600">Session</td>
                </tr>
                <tr className="border-t border-gray-100 bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">next-auth.callback-url</td>
                  <td className="px-4 py-3 text-gray-600">Functional</td>
                  <td className="px-4 py-3 text-gray-600">Remembers the page you were trying to access before being redirected to login, so you can be sent back after authentication.</td>
                  <td className="px-4 py-3 text-gray-600">Session</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="3. Why These Cookies Are Necessary">
          <p>All cookies used by this Portal fall under the <strong>strictly necessary</strong> category. Without them:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>You would be logged out on every page navigation.</li>
            <li>The Portal cannot verify your identity, making it impossible to access protected reports.</li>
            <li>Security protections against CSRF attacks would not function.</li>
          </ul>
          <p className="mt-3">Because these cookies are essential for the Portal to function, they cannot be disabled while using the Portal.</p>
        </Section>

        <Section title="4. What We Do NOT Use Cookies For">
          <p>This Portal does <strong>not</strong> use cookies for:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Advertising or remarketing.</li>
            <li>Third-party analytics (e.g., Google Analytics).</li>
            <li>Cross-site tracking.</li>
            <li>Profiling or behavioral targeting.</li>
            <li>Storing any sensitive data (e.g., passwords, financial data) — session tokens contain only your user ID, encrypted and signed.</li>
          </ul>
        </Section>

        <Section title="5. Cookie Security">
          <p>All cookies set by this Portal are configured with the following security attributes:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><span className="font-medium">HttpOnly:</span> Cookies cannot be accessed by JavaScript, protecting against XSS attacks.</li>
            <li><span className="font-medium">SameSite=Lax:</span> Cookies are not sent with cross-site requests, protecting against CSRF.</li>
            <li><span className="font-medium">Secure (in production):</span> Cookies are only transmitted over HTTPS connections.</li>
          </ul>
        </Section>

        <Section title="6. Managing Cookies">
          <p>Since all cookies on this Portal are strictly necessary for authentication, disabling them will prevent you from logging in.</p>
          <p className="mt-3">If you wish to clear cookies, you can do so through your browser settings:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><span className="font-medium">Chrome:</span> Settings → Privacy and Security → Clear browsing data → Cookies</li>
            <li><span className="font-medium">Edge:</span> Settings → Privacy, search, and services → Clear browsing data</li>
            <li><span className="font-medium">Firefox:</span> Settings → Privacy &amp; Security → Cookies and Site Data → Clear Data</li>
          </ul>
          <p className="mt-3">Note: Clearing cookies will log you out of the Portal. Simply log in again to receive a fresh session cookie.</p>
        </Section>

        <Section title="7. Changes to This Policy">
          <p>We may update this Cookie Policy if we introduce new functionality that uses additional cookies. You will be notified of any such changes through internal communication channels.</p>
        </Section>

        <Section title="8. Contact">
          <p>For questions about this Cookie Policy, contact the DriveU IT or Finance team at:</p>
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
