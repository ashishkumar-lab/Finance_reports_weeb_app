import Link from "next/link";

export const metadata = { title: "Copyright — Finance Reports | DriveU" };

const currentYear = new Date().getFullYear();

export default function CopyrightPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-900 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-blue-300 text-sm mb-2">DriveU Mobility Solutions Pvt. Ltd.</p>
          <h1 className="text-3xl font-bold">Copyright Notice</h1>
          <p className="text-blue-200 mt-2 text-sm">Finance Reports Internal Portal</p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* Copyright Banner */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 rounded-full mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-4xl font-extrabold text-gray-800 mb-2">© {currentYear}</p>
          <p className="text-xl font-bold text-primary-700">DriveU Mobility Solutions Private Limited</p>
          <p className="text-gray-500 text-sm mt-2">All Rights Reserved</p>
        </div>

        <Section title="Ownership">
          <p>This Finance Reports Portal, including its design, source code, report templates, SQL queries, data pipelines, and all associated intellectual property, is the exclusive property of <strong>DriveU Mobility Solutions Private Limited</strong> (formerly Humble Mobile Solutions Private Limited), registered in India.</p>
          <p className="mt-3">No part of this Portal or its output may be reproduced, distributed, modified, or used outside of DriveU's internal operations without the express written consent of DriveU Mobility Solutions Private Limited.</p>
        </Section>

        <Section title="Software &amp; Open Source Acknowledgements">
          <p>This Portal is built using open-source software under their respective licenses. DriveU acknowledges the contributions of the following projects:</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { name: "Next.js", license: "MIT License", author: "Vercel, Inc." },
              { name: "React", license: "MIT License", author: "Meta Platforms, Inc." },
              { name: "NextAuth.js", license: "ISC License", author: "Balázs Orbán et al." },
              { name: "Tailwind CSS", license: "MIT License", author: "Tailwind Labs, Inc." },
              { name: "ExcelJS", license: "MIT License", author: "ExcelJS Contributors" },
              { name: "mysql2", license: "MIT License", author: "Sidorenko Andrey et al." },
              { name: "bcryptjs", license: "MIT License", author: "Daniel Wirtz" },
              { name: "TypeScript", license: "Apache 2.0 License", author: "Microsoft Corporation" },
            ].map((pkg) => (
              <div key={pkg.name} className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
                <p className="font-semibold text-gray-800">{pkg.name}</p>
                <p className="text-gray-500">{pkg.license}</p>
                <p className="text-gray-400 text-xs">{pkg.author}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-gray-500">Use of open-source libraries does not transfer any ownership rights of this Portal or its data to any third party.</p>
        </Section>

        <Section title="Report Data Copyright">
          <p>All financial data, transaction records, driver and customer data, and business intelligence contained in reports generated through this Portal are the confidential and proprietary information of DriveU Mobility Solutions Private Limited.</p>
          <p className="mt-3">Report data may include personal data of DriveU's customers and partners, which is protected under applicable Indian data protection laws. Unauthorized disclosure or use of report data is strictly prohibited and may result in disciplinary action and legal proceedings.</p>
        </Section>

        <Section title="Trademarks">
          <p>The following trademarks and service marks are the property of DriveU Mobility Solutions Private Limited:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>DriveU</strong>™ — Brand name and platform identity</li>
            <li><strong>DU Money</strong>™ — Wallet product</li>
            <li><strong>DriveU Crew</strong>™ — Event driver service</li>
          </ul>
          <p className="mt-3">All other trademarks, service marks, and logos mentioned on this Portal belong to their respective owners.</p>
        </Section>

        <Section title="Prohibited Use">
          <p>The following uses of DriveU's copyrighted material are strictly prohibited without prior written authorization:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Copying, reproducing, or republishing any part of this Portal.</li>
            <li>Distributing, selling, or licensing report data to third parties.</li>
            <li>Using DriveU's name, logo, or trademarks in any external communication or publication.</li>
            <li>Reverse engineering or decompiling the Portal's source code.</li>
          </ul>
        </Section>

        <Section title="DMCA &amp; Infringement">
          <p>If you believe that any content within this Portal infringes upon your intellectual property rights, please contact DriveU's legal team with a detailed notice including:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Identification of the copyrighted work claimed to be infringed.</li>
            <li>Description of the infringing material and its location within the Portal.</li>
            <li>Your contact information.</li>
            <li>A statement of good faith belief and authority to act on behalf of the copyright owner.</li>
          </ul>
        </Section>

        <Section title="Contact">
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
            <p className="font-semibold text-gray-900">DriveU Mobility Solutions Private Limited</p>
            <p className="text-gray-600">No. 19, 3rd Floor, 1st Cross Road, KHB Colony</p>
            <p className="text-gray-600">5th Block Koramangala, Bengaluru – 560095, India</p>
            <p className="text-gray-600 mt-1">Website: <a href="https://www.driveu.in" className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">www.driveu.in</a></p>
            <div className="flex gap-4 mt-3">
              <a href="https://www.facebook.com/driveu.in/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-xs">Facebook</a>
              <a href="https://www.instagram.com/driveu.in/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-xs">Instagram</a>
              <a href="https://www.twitter.com/driveu_in/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-xs">Twitter/X</a>
              <a href="https://www.linkedin.com/company/driveu/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-xs">LinkedIn</a>
            </div>
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
