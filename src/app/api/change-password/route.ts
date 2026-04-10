import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getAdminPasswordHash, setAdminPasswordHash, driveuPool } from "@/lib/db";
import bcrypt from "bcryptjs";

// Ensure the settings table exists
async function ensureSettingsTable() {
  await driveuPool.execute(`
    CREATE TABLE IF NOT EXISTS finance.finance_admin_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(100) NOT NULL UNIQUE,
      setting_value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { currentPassword, newPassword, confirmPassword } = body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "New passwords do not match." }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }

  // Verify current password
  const dbHash = await getAdminPasswordHash();
  const envPassword = process.env.ADMIN_PASSWORD ?? "";

  let currentValid = false;
  if (dbHash) {
    currentValid = await bcrypt.compare(currentPassword, dbHash);
  } else {
    currentValid = envPassword.startsWith("$2")
      ? await bcrypt.compare(currentPassword, envPassword)
      : currentPassword === envPassword;
  }

  if (!currentValid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  try {
    await ensureSettingsTable();
    const newHash = await bcrypt.hash(newPassword, 12);
    await setAdminPasswordHash(newHash);
    return NextResponse.json({ message: "Password changed successfully." });
  } catch (err) {
    console.error("[Change Password] Error:", err);
    return NextResponse.json({ error: "Failed to update password." }, { status: 500 });
  }
}
