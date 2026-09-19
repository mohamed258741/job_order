import { MainOrder, FMSVehicleRecord } from '../types';
import { StorageService } from './storageService';

export interface CloudSyncResult {
  success: boolean;
  spreadsheetId: string;
  spreadsheetUrl: string;
  ordersSynced: number;
  fleetSynced: number;
  timestamp: string;
  driveFileUrl?: string;
  error?: string;
}

export interface DriveFolderInfo {
  id: string;
  name: string;
}

/**
 * Validates or initializes the master Google Spreadsheet in Google Drive.
 * Automatically finds "Fleet Maintenance Master Register" or creates it.
 */
export async function getOrCreateMasterSpreadsheet(
  accessToken: string,
  existingId?: string
): Promise<{ id: string; url: string; createdNew: boolean }> {
  // 1. If explicit ID provided in settings, check if valid and accessible
  if (existingId && existingId.trim().length > 10) {
    try {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${existingId.trim()}?fields=spreadsheetId,spreadsheetUrl,properties.title`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        return {
          id: data.spreadsheetId,
          url: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
          createdNew: false,
        };
      }
    } catch {
      // Fall through to search/create
    }
  }

  // 2. Search user's Google Drive for an existing spreadsheet named "Fleet Maintenance Master Register"
  try {
    const query = encodeURIComponent(
      "name = 'Fleet Maintenance Master Register' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false"
    );
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const existing = searchData.files[0];
        return {
          id: existing.id,
          url: existing.webViewLink || `https://docs.google.com/spreadsheets/d/${existing.id}/edit`,
          createdNew: false,
        };
      }
    }
  } catch (err) {
    console.warn('Drive search error, proceeding to create new sheet:', err);
  }

  // 3. Create a brand new Google Spreadsheet with tabs: "Main Orders" and "FMS Vehicles"
  const createPayload = {
    properties: {
      title: 'Fleet Maintenance Master Register',
    },
    sheets: [
      {
        properties: {
          title: 'Main Orders',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          title: 'FMS Vehicles',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const errorJson = await createRes.json().catch(() => ({}));
    throw new Error(
      errorJson.error?.message || `Failed to create Google Spreadsheet (HTTP ${createRes.status})`
    );
  }

  const newSheetData = await createRes.json();
  const spreadsheetId = newSheetData.spreadsheetId;
  const spreadsheetUrl =
    newSheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return {
    id: spreadsheetId,
    url: spreadsheetUrl,
    createdNew: true,
  };
}

/**
 * Ensures tab exists in spreadsheet, creates if missing
 */
async function ensureSheetTab(
  accessToken: string,
  spreadsheetId: string,
  tabTitle: string
): Promise<void> {
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!metaRes.ok) return;

  const metaData = await metaRes.json();
  const existingTitles = (metaData.sheets || []).map((s: any) => s.properties?.title);

  if (!existingTitles.includes(tabTitle)) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: tabTitle,
                gridProperties: { frozenRowCount: 1 },
              },
            },
          },
        ],
      }),
    });
  }
}

/**
 * Syncs all Main Orders to Google Sheets (Tab: "Main Orders")
 * Clears old contents and writes all orders in a single atomic high-performance request
 */
export async function syncOrdersToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  orders: MainOrder[]
): Promise<number> {
  await ensureSheetTab(accessToken, spreadsheetId, 'Main Orders');

  const headers = [
    'Order #',
    'Date',
    'Status',
    'Car Code',
    'Car Number (Plate)',
    'Chassis Number',
    'Motor Number',
    'Make',
    'Model',
    'Year',
    'Driver / Employee',
    'Staff ID',
    'Employee Email',
    'Mileage (KM)',
    'Assigned Agency',
    'Maintenance Type',
    'Maintenance Scope',
    'Email Status',
    'Email Sent Date',
    'Created At',
    'Last Updated At',
  ];

  const rows = orders.map((o) => [
    o.orderNumber,
    o.date,
    o.status,
    o.carCode,
    o.carNumber,
    o.chassisNumber || '',
    o.motorNumber || '',
    o.make || '',
    o.model || '',
    o.year || '',
    o.employeeName,
    o.staffId || '',
    o.employeeEmail || '',
    o.mileage || 0,
    o.agency,
    o.maintenanceType,
    o.maintenanceDetails || '',
    o.emailStatus || 'Not Sent',
    o.emailDate || '',
    o.createdDate || '',
    o.updatedDate || '',
  ]);

  const allValues = [headers, ...rows];

  // 1. Clear sheet
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Main Orders'!A1:U:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  // 2. Put all rows in bulk
  const putRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Main Orders'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: "'Main Orders'!A1",
        majorDimension: 'ROWS',
        values: allValues,
      }),
    }
  );

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to update Main Orders tab in Google Sheets');
  }

  return orders.length;
}

/**
 * Syncs full FMS fleet (2000+ vehicles) to Google Sheets (Tab: "FMS Vehicles")
 * Ultra-fast bulk write that avoids browser lag completely.
 */
export async function syncFleetToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  vehicles: FMSVehicleRecord[]
): Promise<number> {
  await ensureSheetTab(accessToken, spreadsheetId, 'FMS Vehicles');

  const headers = [
    'Car Code',
    'Car Number (Plate)',
    'Chassis Number',
    'Motor Number',
    'Make',
    'Model',
    'Year',
    'Employee Name',
    'Staff ID',
    'Employee Email',
  ];

  const rows = vehicles.map((v) => [
    v.carCode || '',
    v.carNumber || '',
    v.chassisNumber || '',
    v.motorNumber || '',
    v.make || '',
    v.model || '',
    v.year || '',
    v.employeeName || '',
    v.staffId || '',
    v.employeeEmail || '',
  ]);

  const allValues = [headers, ...rows];

  // 1. Clear sheet
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'FMS Vehicles'!A1:J:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  // 2. Put bulk values
  const putRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'FMS Vehicles'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: "'FMS Vehicles'!A1",
        majorDimension: 'ROWS',
        values: allValues,
      }),
    }
  );

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to update FMS Vehicles tab in Google Sheets');
  }

  return vehicles.length;
}

/**
 * Loads FMS Vehicles directly from Google Sheets into the application
 * (Perfect for pulling updated 2,000+ vehicle registers without re-uploading files)
 */
export async function loadFleetFromGoogleSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<FMSVehicleRecord[]> {
  const getRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'FMS Vehicles'!A1:J?majorDimension=ROWS`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!getRes.ok) {
    const err = await getRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to read FMS Vehicles from Google Sheets');
  }

  const data = await getRes.json();
  const rows: any[][] = data.values || [];
  if (rows.length <= 1) {
    return [];
  }

  // Row 0 is header, rows 1..N are data
  const headerRow = rows[0] || [];
  const headerMap: { [key: string]: number } = {};
  headerRow.forEach((colName: any, idx: number) => {
    const clean = String(colName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    headerMap[clean] = idx;
  });

  const getIdx = (candidates: string[], fallbackIdx: number): number => {
    for (const c of candidates) {
      const clean = c.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (headerMap[clean] !== undefined) return headerMap[clean];
    }
    return fallbackIdx;
  };

  const idxCarCode = getIdx(['carcode', 'vehiclecode', 'code'], 0);
  const idxCarNumber = getIdx(['carnumber', 'plate', 'platenumber', 'regnumber'], 1);
  const idxChassis = getIdx(['chassisnumber', 'chassis', 'vin'], 2);
  const idxMotor = getIdx(['motornumber', 'motor', 'engine'], 3);
  const idxMake = getIdx(['make', 'brand', 'vehiclemake', 'manufacturer'], 4);
  const idxModel = getIdx(['model', 'vehiclemodel', 'carmodel'], 5);
  const idxYear = getIdx(['year', 'modelyear', 'mfgyear'], 6);
  const idxEmployee = getIdx(['employeename', 'carowner', 'employee', 'drivername'], 7);
  const idxStaffId = getIdx(['staffid', 'employeeid'], 8);
  const idxEmail = getIdx(['employeeemail', 'email', 'staffemail'], 9);

  const vehicles: FMSVehicleRecord[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0 || !r[idxCarCode]) continue;
    const rawYear = r[idxYear];
    let parsedYear = new Date().getFullYear();
    if (rawYear) {
      const match = String(rawYear).match(/\b(19\d\d|20\d\d)\b/);
      if (match) parsedYear = parseInt(match[1], 10);
      else {
        const num = parseInt(String(rawYear), 10);
        if (!isNaN(num)) parsedYear = num;
      }
    }

    vehicles.push({
      carCode: String(r[idxCarCode] || '').trim(),
      carNumber: String(r[idxCarNumber] || '').trim(),
      chassisNumber: String(r[idxChassis] || '').trim(),
      motorNumber: String(r[idxMotor] || '').trim(),
      make: String(r[idxMake] || '').trim(),
      model: String(r[idxModel] || '').trim(),
      year: parsedYear,
      employeeName: String(r[idxEmployee] || '').trim(),
      staffId: String(r[idxStaffId] || '').trim(),
      employeeEmail: String(r[idxEmail] || '').trim(),
    });
  }

  return vehicles;
}

/**
 * Master sync function: Saves both Main Orders and FMS Vehicles to Cloud Google Sheets
 */
export async function performFullCloudSync(
  accessToken: string,
  preferredSheetId?: string
): Promise<CloudSyncResult> {
  const orders = StorageService.getMainOrders();
  const fleet = StorageService.getFMSVehicles();

  // 1. Get or create spreadsheet
  const sheetInfo = await getOrCreateMasterSpreadsheet(accessToken, preferredSheetId);

  // 2. Sync Orders
  const ordersCount = await syncOrdersToGoogleSheet(accessToken, sheetInfo.id, orders);

  // 3. Sync Fleet
  const fleetCount = await syncFleetToGoogleSheet(accessToken, sheetInfo.id, fleet);

  const timestamp = new Date().toLocaleString();

  // 4. Save synced spreadsheet ID and URL to local settings
  const settings = StorageService.getSettings();
  settings.googleSpreadsheetId = sheetInfo.id;
  settings.googleSpreadsheetUrl = sheetInfo.url;
  settings.lastCloudSyncTimestamp = timestamp;
  StorageService.saveSettings(settings);

  return {
    success: true,
    spreadsheetId: sheetInfo.id,
    spreadsheetUrl: sheetInfo.url,
    ordersSynced: ordersCount,
    fleetSynced: fleetCount,
    timestamp,
  };
}

/**
 * Helper to upload a Job Order PDF directly to user's Google Drive
 */
export async function uploadOrderPdfToDrive(
  accessToken: string,
  order: MainOrder,
  pdfBase64: string
): Promise<{ fileId: string; webViewLink: string }> {
  const sanitizedCar = (order.carNumber || order.carCode).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Job_Order_${order.orderNumber}_${sanitizedCar}.pdf`;

  // Binary blob from base64
  const byteChars = atob(pdfBase64);
  const byteNumbers = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([byteNumbers], { type: 'application/pdf' });

  // Multipart upload to Google Drive v3
  const metadata = {
    name: filename,
    mimeType: 'application/pdf',
    description: `Fleet Maintenance Job Order #${order.orderNumber} for Vehicle ${order.carNumber}`,
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', blob);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to upload PDF to Google Drive');
  }

  const fileData = await uploadRes.json();
  return {
    fileId: fileData.id,
    webViewLink: fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`,
  };
}
