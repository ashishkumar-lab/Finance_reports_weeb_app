import mysql from "mysql2/promise";

// Finance DB pool
const financePool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false },
  connectTimeout: 30000,
});

// DriveU DB pool
const driveuPool = mysql.createPool({
  host: process.env.DRIVEU_DB_HOST,
  port: Number(process.env.DRIVEU_DB_PORT) || 3306,
  user: process.env.DRIVEU_DB_USER,
  password: process.env.DRIVEU_DB_PASSWORD,
  database: process.env.DRIVEU_DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false },
  connectTimeout: 30000,
});

export async function query<T = unknown>(
  sql: string,
  params?: (string | number | boolean | null)[]
): Promise<T[]> {
  const [rows] = await financePool.execute(sql, params);
  return rows as T[];
}

export async function driveuQuery<T = unknown>(
  sql: string,
  params?: (string | number | boolean | null)[]
): Promise<T[]> {
  const [rows] = await driveuPool.execute(sql, params);
  return rows as T[];
}

// Long-running query with extended session timeouts (for report generation)
export async function driveuQueryLong<T = unknown>(
  sql: string,
  params?: (string | number | boolean | null)[]
): Promise<T[]> {
  const conn = await driveuPool.getConnection();
  try {
    await conn.execute('SET SESSION net_read_timeout = 31536000');
    await conn.execute('SET SESSION net_write_timeout = 31536000');
    await conn.execute('SET SESSION wait_timeout = 31536000');
    const [rows] = await conn.execute(sql, params);
    return rows as T[];
  } finally {
    conn.release();
  }
}

export interface DownloadLog {
  id: number;
  report_name: string;
  start_date: string;
  end_date: string;
  downloaded_at: string;
  downloaded_by: string;
  status: "success" | "error";
}

export async function logDownload(
  reportName: string,
  startDate: string,
  endDate: string,
  userEmail: string,
  status: "success" | "error" = "success"
): Promise<void> {
  try {
    await driveuPool.execute(
      `INSERT INTO finance.finance_report_download_logs (report_name, start_date, end_date, downloaded_by, status)
       VALUES (?, ?, ?, ?, ?)`,
      [reportName, startDate, endDate, userEmail, status]
    );
  } catch (err) {
    console.error("[logDownload] Failed to log download:", err);
  }
}

export async function getDownloadLogs(
  page: number,
  limit: number,
  filterByEmail?: string
): Promise<{ logs: DownloadLog[]; total: number }> {
  try {
    const offset = (page - 1) * limit;
    const whereClause = filterByEmail ? `WHERE downloaded_by = ?` : "";
    const params = filterByEmail ? [filterByEmail, limit, offset] : [limit, offset];
    const countParams = filterByEmail ? [filterByEmail] : [];

    const [logs] = await driveuPool.query(
      `SELECT id, report_name, start_date, end_date, downloaded_at, downloaded_by, status
       FROM finance.finance_report_download_logs
       ${whereClause}
       ORDER BY downloaded_at DESC
       LIMIT ? OFFSET ?`,
      params
    );
    const [[{ total }]] = await driveuPool.query(
      `SELECT COUNT(*) as total FROM finance.finance_report_download_logs ${whereClause}`,
      countParams
    ) as [{ total: number }[], unknown];
    return { logs: logs as DownloadLog[], total };
  } catch (err) {
    console.error("[getDownloadLogs] Failed to fetch logs:", err);
    return { logs: [], total: 0 };
  }
}

export async function getAdminPasswordHash(): Promise<string | null> {
  try {
    const [rows] = await driveuPool.query(
      `SELECT setting_value FROM finance.finance_admin_settings WHERE setting_key = 'admin_password_hash' LIMIT 1`
    ) as [unknown[], unknown];
    const list = rows as { setting_value: string }[];
    return list.length > 0 ? list[0].setting_value : null;
  } catch {
    return null;
  }
}

export async function setAdminPasswordHash(hash: string): Promise<void> {
  await driveuPool.execute(
    `INSERT INTO finance.finance_admin_settings (setting_key, setting_value)
     VALUES ('admin_password_hash', ?)
     ON DUPLICATE KEY UPDATE setting_value = ?`,
    [hash, hash]
  );
}

// Car Rental DB pool
const carRentalPool = mysql.createPool({
  host: process.env.CAR_RENTAL_DB_HOST,
  port: Number(process.env.CAR_RENTAL_DB_PORT) || 3306,
  user: process.env.CAR_RENTAL_DB_USER,
  password: process.env.CAR_RENTAL_DB_PASSWORD,
  database: process.env.CAR_RENTAL_DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false },
  connectTimeout: 30000,
});

export async function carRentalQueryLong<T = unknown>(
  sql: string,
  params?: (string | number | boolean | null)[]
): Promise<T[]> {
  const conn = await carRentalPool.getConnection();
  try {
    await conn.execute('SET SESSION net_read_timeout = 31536000');
    await conn.execute('SET SESSION net_write_timeout = 31536000');
    await conn.execute('SET SESSION wait_timeout = 31536000');
    const [rows] = await conn.execute(sql, params);
    return rows as T[];
  } finally {
    conn.release();
  }
}

export { financePool, driveuPool, carRentalPool };
