import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <p className="text-sm text-gray-500">
            © {year}{" "}
            <a
              href="https://www.driveu.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gray-700 hover:text-primary-600 transition-colors"
            >
              DriveU Mobility Solutions Pvt. Ltd.
            </a>{" "}
            — All rights reserved.
          </p>

          {/* Legal Links */}
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
            <Link href="/terms" className="hover:text-primary-600 transition-colors">
              Terms &amp; Conditions
            </Link>
            <span className="text-gray-300">·</span>
            <Link href="/privacy-policy" className="hover:text-primary-600 transition-colors">
              Privacy Policy
            </Link>
            <span className="text-gray-300">·</span>
            <Link href="/cookies" className="hover:text-primary-600 transition-colors">
              Cookie Policy
            </Link>
            <span className="text-gray-300">·</span>
            <Link href="/copyright" className="hover:text-primary-600 transition-colors">
              Copyright
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
