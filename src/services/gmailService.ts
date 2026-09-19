import { MainOrder } from '../types';
import { getAccessToken, getCurrentUser } from './googleAuthService';
import { populateJobOrderExcel } from './excelService';
import { convertExcelWorkbookToPDF } from './pdfService';
import { StorageService } from './storageService';

export interface SendGmailOptions {
  order: MainOrder;
  recipientEmail: string;
  subject?: string;
  customNotes?: string;
}

export interface SendGmailResult {
  success: boolean;
  messageId?: string;
  recipient: string;
  subject: string;
  error?: string;
}

/**
 * Format subject line based on the user requirement:
 * "to send each job order in mail to on address with subject car numer"
 */
export function formatEmailSubject(order: MainOrder, pattern?: string): string {
  if (!pattern || pattern.trim() === '' || pattern === '{carNumber}') {
    // Exact user requirement: subject is car number
    return order.carNumber || `Car #${order.carCode}`;
  }
  return pattern
    .replace(/{carNumber}/g, order.carNumber || '')
    .replace(/{carCode}/g, order.carCode || '')
    .replace(/{orderNumber}/g, String(order.orderNumber))
    .replace(/{employeeName}/g, order.employeeName || '')
    .replace(/{agency}/g, order.agency || '');
}

/**
 * Ensures the order has a valid base64 PDF string attached.
 */
export async function ensureOrderPdf(order: MainOrder): Promise<string> {
  if (order.pdfBase64 && order.pdfBase64.length > 100) {
    return order.pdfBase64;
  }

  // Generate on demand using current official template
  const settings = StorageService.getSettings();
  const templateBuffer = await StorageService.getOfficialTemplateBuffer();
  const excelRes = await populateJobOrderExcel(templateBuffer, order, settings.templateMapping);
  const pdfFileName = `Job_Order_${order.orderNumber}_${order.carCode}.pdf`;
  const pdfRes = await convertExcelWorkbookToPDF(excelRes.workbook, pdfFileName);

  // Cache back to order
  order.pdfBase64 = pdfRes.base64;
  order.excelBase64 = excelRes.base64;
  StorageService.updateMainOrder(order);

  return pdfRes.base64;
}

/**
 * Chunk a base64 string into RFC 2045 compliant lines (max 76 chars per line)
 * CRITICAL: Lines exceeding 998/1000 octets violate SMTP RFC 5321 and cause
 * receiving mail servers (Exchange, Outlook, Gmail MTA) to reject or drop emails!
 */
function chunkBase64(b64: string): string {
  const clean = b64.replace(/[\r\n\s]+/g, '');
  return clean.replace(/(.{76})/g, '$1\r\n');
}

/**
 * Encodes a UTF-8 string into base64 and breaks into 76-character lines
 */
function utf8ToBase64Chunked(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.byteLength;
  const CHUNK_SIZE = 0x8000;
  for (let i = 0; i < len; i += CHUNK_SIZE) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, Math.min(i + CHUNK_SIZE, len)))
    );
  }
  const rawBase64 = btoa(binary);
  return chunkBase64(rawBase64);
}

/**
 * Base64URL encoder conforming to RFC 4648 § 5 for Gmail REST API
 */
function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.byteLength;
  const CHUNK_SIZE = 0x8000;
  for (let i = 0; i < len; i += CHUNK_SIZE) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, Math.min(i + CHUNK_SIZE, len)))
    );
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate clean HTML email body for Job Order transmission
 */
export function generateJobOrderHtmlBody(order: MainOrder, customNotes?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5; padding: 20px; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #1e3a8a; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
    .badge { display: inline-block; background: #3b82f6; color: #fff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-top: 10px; }
    .content { padding: 24px; font-size: 14px; }
    .specs-grid { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .specs-grid td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .specs-grid td.label { color: #64748b; font-weight: 600; width: 38%; }
    .specs-grid td.value { color: #0f172a; font-weight: 500; }
    .work-box { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px; margin: 16px 0; border-radius: 4px; }
    .work-box h4 { margin: 0 0 6px; font-size: 13px; color: #1e3a8a; }
    .work-box p { margin: 0; font-size: 13px; color: #334155; white-space: pre-wrap; }
    .footer { background: #f1f5f9; padding: 16px 24px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Fleet Maintenance Job Order #${order.orderNumber}</h1>
      <p>Vehicle Car Number: <strong>${order.carNumber}</strong></p>
      <div class="badge">${order.maintenanceType}</div>
    </div>
    
    <div class="content">
      <p>Dear Colleague,</p>
      <p>Please find attached the official maintenance Job Order for vehicle <strong>${order.carNumber}</strong> (${order.make} ${order.model}).</p>

      ${customNotes ? `<div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px; border-radius: 8px; margin: 12px 0; font-size: 13px; color: #1d4ed8;"><strong>Coordinator Note:</strong> ${customNotes}</div>` : ''}

      <table class="specs-grid">
        <tr>
          <td class="label">Job Order #</td>
          <td class="value">#${order.orderNumber}</td>
        </tr>
        <tr>
          <td class="label">Car Number / Plate</td>
          <td class="value"><strong>${order.carNumber}</strong></td>
        </tr>
        <tr>
          <td class="label">Car Code</td>
          <td class="value">${order.carCode}</td>
        </tr>
        <tr>
          <td class="label">Vehicle Model</td>
          <td class="value">${order.make} ${order.model} (${order.year})</td>
        </tr>
        <tr>
          <td class="label">Driver / Custody</td>
          <td class="value">${order.employeeName} (Staff ID: ${order.staffId || 'N/A'})</td>
        </tr>
        <tr>
          <td class="label">Current Odometer</td>
          <td class="value">${order.mileage.toLocaleString()} KM</td>
        </tr>
        <tr>
          <td class="label">Assigned Agency</td>
          <td class="value"><strong>${order.agency}</strong></td>
        </tr>
        <tr>
          <td class="label">Issue Date</td>
          <td class="value">${order.date}</td>
        </tr>
      </table>

      <div class="work-box">
        <h4>Authorized Scope of Maintenance:</h4>
        <p>${order.maintenanceDetails}</p>
      </div>

      <p style="margin-top: 20px; font-size: 13px; color: #64748b;">
        The official signed PDF Job Order (<code>Job_Order_${order.orderNumber}_${order.carNumber}.pdf</code>) is attached to this email. Please print or present this document upon arrival at the agency workshop.
      </p>
    </div>

    <div class="footer">
      Fleet Maintenance Job Order Management System &bull; Auto-dispatched via Gmail
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Plain text alternative for email clients and spam filter anti-penalty
 */
export function generateJobOrderPlainText(order: MainOrder, customNotes?: string): string {
  const lines = [
    `FLEET MAINTENANCE JOB ORDER #${order.orderNumber}`,
    `Vehicle Car Number: ${order.carNumber}`,
    `Maintenance Type: ${order.maintenanceType}`,
    ``,
    `Dear Colleague,`,
    ``,
    `Please find attached the official maintenance Job Order for vehicle ${order.carNumber} (${order.make} ${order.model}).`,
    ``,
  ];

  if (customNotes) {
    lines.push(`COORDINATOR NOTE: ${customNotes}`, ``);
  }

  lines.push(
    `--------------------------------------------------`,
    `Job Order #: #${order.orderNumber}`,
    `Car Number / Plate: ${order.carNumber}`,
    `Car Code: ${order.carCode}`,
    `Vehicle Model: ${order.make} ${order.model} (${order.year})`,
    `Driver / Custody: ${order.employeeName} (Staff ID: ${order.staffId || 'N/A'})`,
    `Current Odometer: ${order.mileage.toLocaleString()} KM`,
    `Assigned Agency: ${order.agency}`,
    `Issue Date: ${order.date}`,
    `--------------------------------------------------`,
    ``,
    `AUTHORIZED SCOPE OF MAINTENANCE:`,
    order.maintenanceDetails,
    ``,
    `The official signed PDF Job Order (Job_Order_${order.orderNumber}_${order.carNumber}.pdf) is attached to this email. Please print or present this document upon arrival at the agency workshop.`,
    ``,
    `Fleet Maintenance Job Order Management System • Auto-dispatched via Gmail`
  );

  return lines.join('\r\n');
}

/**
 * Builds a 100% compliant RFC 5322 / RFC 2045 multipart message:
 * - Includes mandatory From:, To:, Subject:, Date:, Message-ID: headers
 * - Uses multipart/alternative for text/plain + text/html to eliminate spam scoring
 * - Uses multipart/mixed for the application/pdf attachment
 * - All base64 content is chunked at 76 characters per line to strictly prevent SMTP line-length rejection (>998 chars)
 */
export async function buildRfc2822Message(
  order: MainOrder,
  recipientEmail: string,
  subject: string,
  customNotes?: string
): Promise<string> {
  const user = getCurrentUser();
  const senderEmail = user?.email || 'me';
  const senderName = user?.displayName ? `"${user.displayName.replace(/"/g, '')}" ` : '';

  const pdfBase64 = await ensureOrderPdf(order);
  const chunkedPdf = chunkBase64(pdfBase64);

  const mixedBoundary = `====_Fleet_Mixed_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_====`;
  const altBoundary = `====_Fleet_Alt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_====`;

  const htmlContent = generateJobOrderHtmlBody(order, customNotes);
  const plainTextContent = generateJobOrderPlainText(order, customNotes);

  const chunkedHtml = utf8ToBase64Chunked(htmlContent);
  const chunkedText = utf8ToBase64Chunked(plainTextContent);

  const sanitizedCarNumber = (order.carNumber || order.carCode).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Job_Order_${order.orderNumber}_${sanitizedCarNumber}.pdf`;

  // Encode subject with UTF-8 RFC 2047 to support Arabic and international characters
  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

  const rawMessage = [
    `From: ${senderName}<${senderEmail}>`,
    `To: ${recipientEmail.trim()}`,
    `Reply-To: <${senderEmail}>`,
    `Subject: ${encodedSubject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <order-${order.orderNumber}-${Date.now()}@fleet-joborder.internal>`,
    `MIME-Version: 1.0`,
    `X-Mailer: Fleet Maintenance Job Order Dispatcher`,
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    ``,
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    ``,
    `--${altBoundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    chunkedText,
    ``,
    `--${altBoundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    chunkedHtml,
    ``,
    `--${altBoundary}--`,
    ``,
    `--${mixedBoundary}`,
    `Content-Type: application/pdf; name="${filename}"`,
    `Content-Description: Job Order ${order.orderNumber} PDF`,
    `Content-Disposition: attachment; filename="${filename}"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    chunkedPdf,
    ``,
    `--${mixedBoundary}--`,
  ].join('\r\n');

  return base64UrlEncode(rawMessage);
}

/**
 * Sends a Job Order email via the authenticated user's Gmail account.
 * Subject defaults to the car number as requested by the user.
 */
export async function sendJobOrderViaGmail(options: SendGmailOptions): Promise<SendGmailResult> {
  const { order, recipientEmail, subject, customNotes } = options;
  const token = await getAccessToken();

  if (!token) {
    throw new Error(
      'Not authenticated with Gmail. Please sign in with your Google account first.'
    );
  }

  if (!recipientEmail || !recipientEmail.trim()) {
    throw new Error('Recipient email address is required.');
  }

  const finalSubject = subject || formatEmailSubject(order);
  const rawBase64Url = await buildRfc2822Message(order, recipientEmail.trim(), finalSubject, customNotes);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: rawBase64Url,
    }),
  });

  if (!response.ok) {
    let errorDetail = 'Failed to send email via Gmail';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || errorDetail;
    } catch {
      errorDetail = `${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  const result = await response.json();

  return {
    success: true,
    messageId: result.id,
    recipient: recipientEmail.trim(),
    subject: finalSubject,
  };
}
