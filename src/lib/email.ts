import nodemailer from "nodemailer";

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM ?? "Finance Reports <noreply@driveu.in>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3020";

async function send(to: string, subject: string, html: string) {
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("[Email] Failed to send to", to, err);
  }
}

function baseTemplate(content: string) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:#1e3a8a;padding:24px 32px">
        <h1 style="color:#fff;margin:0;font-size:20px">DriveU Finance Reports</h1>
      </div>
      <div style="padding:32px;color:#374151;font-size:14px;line-height:1.6">
        ${content}
      </div>
      <div style="background:#f9fafb;padding:16px 32px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb">
        DriveU Mobility Solutions Pvt. Ltd. · Koramangala, Bengaluru 560095
      </div>
    </div>`;
}

export async function sendWelcomePendingEmail(userEmail: string, userName: string) {
  await send(
    userEmail,
    "Thank you for your interest — Finance Reports Portal",
    baseTemplate(`
      <p>Hi <strong>${escHtml(userName)}</strong>,</p>
      <p>Thank you for signing up to the <strong>DriveU Finance Reports Portal</strong>.</p>
      <p>Your account is currently <strong>pending approval</strong>. Our admin team will review your request and get back to you shortly.</p>
      <p>Once approved, you will be able to log in and download finance reports.</p>
      <br/>
      <p>If you have any questions, please reach out to your Finance team.</p>
      <p>Best regards,<br/><strong>DriveU Finance Team</strong></p>
    `)
  );
}

export async function sendApprovalEmail(userEmail: string, userName: string) {
  await send(
    userEmail,
    "Your account has been approved — Finance Reports Portal",
    baseTemplate(`
      <p>Hi <strong>${escHtml(userName)}</strong>,</p>
      <p>Great news! Your account on the <strong>DriveU Finance Reports Portal</strong> has been <strong style="color:#16a34a">approved</strong>.</p>
      <p>You can now log in and download the reports you have been granted access to.</p>
      <br/>
      <a href="${APP_URL}/login" style="display:inline-block;background:#1e3a8a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
        Login to Portal
      </a>
      <br/><br/>
      <p>Best regards,<br/><strong>DriveU Finance Team</strong></p>
    `)
  );
}

export async function sendRejectionEmail(userEmail: string, userName: string) {
  await send(
    userEmail,
    "Your access request — Finance Reports Portal",
    baseTemplate(`
      <p>Hi <strong>${escHtml(userName)}</strong>,</p>
      <p>We regret to inform you that your access request to the <strong>DriveU Finance Reports Portal</strong> has been <strong style="color:#dc2626">rejected</strong>.</p>
      <p>If you believe this is a mistake or have questions, please contact your Finance team manager.</p>
      <br/>
      <p>Best regards,<br/><strong>DriveU Finance Team</strong></p>
    `)
  );
}

export async function sendReportAccessRequestEmail(
  userEmail: string,
  userName: string,
  reportName: string
) {
  await send(
    ADMIN_EMAIL,
    `Report Access Request: ${escHtml(reportName)}`,
    baseTemplate(`
      <p>Hi Admin,</p>
      <p><strong>${escHtml(userName)}</strong> (<a href="mailto:${escHtml(userEmail)}">${escHtml(userEmail)}</a>) has requested access to the <strong>${escHtml(reportName)}</strong>.</p>
      <p>Please log in to the admin panel to review and grant or deny access.</p>
      <br/>
      <a href="${APP_URL}/admin" style="display:inline-block;background:#1e3a8a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
        Open Admin Panel
      </a>
      <br/><br/>
      <p>Best regards,<br/><strong>DriveU Finance Reports System</strong></p>
    `)
  );
}

export async function sendAccessGrantedEmail(
  userEmail: string,
  userName: string,
  reportName: string
) {
  await send(
    userEmail,
    `Access granted: ${escHtml(reportName)}`,
    baseTemplate(`
      <p>Hi <strong>${escHtml(userName)}</strong>,</p>
      <p>Your request for access to the <strong>${escHtml(reportName)}</strong> has been <strong style="color:#16a34a">approved</strong>.</p>
      <p>You can now log in and download this report.</p>
      <br/>
      <a href="${APP_URL}/dashboard" style="display:inline-block;background:#1e3a8a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
        Go to Dashboard
      </a>
      <br/><br/>
      <p>Best regards,<br/><strong>DriveU Finance Team</strong></p>
    `)
  );
}
