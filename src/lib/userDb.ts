import { driveuPool } from "@/lib/db";

export interface DbUser {
  id: number;
  email: string;
  name: string;
  image: string | null;
  google_id: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export const ALL_REPORTS = [
  { id: "b2c-revenue",            name: "B2C Revenue Report" },
  { id: "b2b-revenue",            name: "B2B Revenue Report" },
  { id: "driver-wallet",          name: "Driver Wallet Report" },
  { id: "customer-wallet",        name: "Customer Wallet Report" },
  { id: "car-rental-bookings",    name: "Car Rental Booking Request Report" },
  { id: "car-rental-revenue",     name: "Car Rental Revenue Report" },
];

async function ensureTables() {
  await driveuPool.execute(`
    CREATE TABLE IF NOT EXISTS finance.finance_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255),
      image TEXT,
      google_id VARCHAR(255),
      status ENUM('pending','approved','rejected') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await driveuPool.execute(`
    CREATE TABLE IF NOT EXISTS finance.finance_user_permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      report_id VARCHAR(50) NOT NULL,
      granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_report (user_id, report_id)
    )
  `);
  await driveuPool.execute(`
    CREATE TABLE IF NOT EXISTS finance.finance_access_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      report_id VARCHAR(50) NOT NULL,
      status ENUM('pending','approved','rejected') DEFAULT 'pending',
      requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_req_user_report (user_id, report_id)
    )
  `);
}

export async function getOrCreateUser(
  email: string,
  name: string,
  image: string | null,
  googleId: string
): Promise<DbUser> {
  await ensureTables();
  const [rows] = await driveuPool.query(
    `SELECT * FROM finance.finance_users WHERE email = ? LIMIT 1`,
    [email]
  ) as [DbUser[], unknown];

  if (rows.length > 0) {
    // Update name/image in case they changed
    await driveuPool.execute(
      `UPDATE finance.finance_users SET name = ?, image = ?, google_id = ? WHERE email = ?`,
      [name, image, googleId, email]
    );
    return rows[0];
  }

  // New user — insert as pending
  await driveuPool.execute(
    `INSERT INTO finance.finance_users (email, name, image, google_id, status) VALUES (?, ?, ?, ?, 'pending')`,
    [email, name, image, googleId]
  );
  const [newRows] = await driveuPool.query(
    `SELECT * FROM finance.finance_users WHERE email = ? LIMIT 1`,
    [email]
  ) as [DbUser[], unknown];
  return newRows[0];
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  await ensureTables();
  const [rows] = await driveuPool.query(
    `SELECT * FROM finance.finance_users WHERE email = ? LIMIT 1`,
    [email]
  ) as [DbUser[], unknown];
  return rows.length > 0 ? rows[0] : null;
}

export async function getUserById(id: number): Promise<DbUser | null> {
  const [rows] = await driveuPool.query(
    `SELECT * FROM finance.finance_users WHERE id = ? LIMIT 1`,
    [id]
  ) as [DbUser[], unknown];
  return rows.length > 0 ? rows[0] : null;
}

export async function getAllUsers(): Promise<DbUser[]> {
  await ensureTables();
  const [rows] = await driveuPool.query(
    `SELECT * FROM finance.finance_users ORDER BY FIELD(status,'pending','approved','rejected'), created_at DESC`
  ) as [DbUser[], unknown];
  return rows;
}

export async function updateUserStatus(id: number, status: "approved" | "rejected") {
  await driveuPool.execute(
    `UPDATE finance.finance_users SET status = ? WHERE id = ?`,
    [status, id]
  );
}

export async function getUserPermissions(userId: number): Promise<string[]> {
  const [rows] = await driveuPool.query(
    `SELECT report_id FROM finance.finance_user_permissions WHERE user_id = ?`,
    [userId]
  ) as [unknown[], unknown];
  return (rows as { report_id: string }[]).map((r) => r.report_id);
}

export async function setUserPermission(userId: number, reportId: string, grant: boolean) {
  if (grant) {
    await driveuPool.execute(
      `INSERT IGNORE INTO finance.finance_user_permissions (user_id, report_id) VALUES (?, ?)`,
      [userId, reportId]
    );
  } else {
    await driveuPool.execute(
      `DELETE FROM finance.finance_user_permissions WHERE user_id = ? AND report_id = ?`,
      [userId, reportId]
    );
  }
}

export async function hasReportPermission(userId: number, reportId: string): Promise<boolean> {
  const [rows] = await driveuPool.query(
    `SELECT 1 FROM finance.finance_user_permissions WHERE user_id = ? AND report_id = ? LIMIT 1`,
    [userId, reportId]
  ) as [unknown[], unknown];
  return rows.length > 0;
}

export async function createAccessRequest(userId: number, reportId: string) {
  await driveuPool.execute(
    `INSERT INTO finance.finance_access_requests (user_id, report_id, status)
     VALUES (?, ?, 'pending')
     ON DUPLICATE KEY UPDATE status = 'pending', requested_at = NOW()`,
    [userId, reportId]
  );
}

export async function getAccessRequests(): Promise<{
  id: number; user_id: number; report_id: string; status: string;
  requested_at: string; email: string; name: string;
}[]> {
  const [rows] = await driveuPool.query(`
    SELECT ar.id, ar.user_id, ar.report_id, ar.status, ar.requested_at,
           u.email, u.name
    FROM finance.finance_access_requests ar
    JOIN finance.finance_users u ON u.id = ar.user_id
    WHERE ar.status = 'pending'
    ORDER BY ar.requested_at DESC
  `) as [unknown[], unknown];
  return rows as ReturnType<typeof getAccessRequests> extends Promise<infer T> ? T : never;
}
