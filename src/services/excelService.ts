import ExcelJS from 'exceljs';
import {
  FMSVehicleRecord,
  MainOrder,
  TemplateMapping,
} from '../types';

export const DEFAULT_TEMPLATE_MAPPING: TemplateMapping = {
  orderNumber: { sheet: 'JobOrder', cell: 'G4', label: 'Order Number' },
  date: { sheet: 'JobOrder', cell: 'G5', label: 'Order Date' },
  status: { sheet: 'JobOrder', cell: 'G6', label: 'Status' },
  carCode: { sheet: 'JobOrder', cell: 'B8', label: 'Car Code' },
  carNumber: { sheet: 'JobOrder', cell: 'D8', label: 'Car Number' },
  employeeName: { sheet: 'JobOrder', cell: 'B9', label: 'Employee Name / Owner' },
  staffId: { sheet: 'JobOrder', cell: 'D9', label: 'Staff ID' },
  employeeEmail: { sheet: 'JobOrder', cell: 'B10', label: 'Employee Email' },
  makeModelYear: { sheet: 'JobOrder', cell: 'D10', label: 'Make / Model / Year' },
  chassisNumber: { sheet: 'JobOrder', cell: 'B11', label: 'Chassis Number' },
  motorNumber: { sheet: 'JobOrder', cell: 'D11', label: 'Motor Number' },
  mileage: { sheet: 'JobOrder', cell: 'B13', label: 'Current Mileage (KM)' },
  agency: { sheet: 'JobOrder', cell: 'D13', label: 'Assigned Agency' },
  maintenanceType: { sheet: 'JobOrder', cell: 'B14', label: 'Maintenance Type' },
  maintenanceDetails: { sheet: 'JobOrder', cell: 'A17', label: 'Maintenance Details' },
};

/**
 * Creates the official baseline Job Order Excel template.
 * This is saved and preserved untouched.
 */
export async function createOfficialBaselineTemplate(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Fleet Maintenance System';
  wb.created = new Date();

  const ws = wb.addWorksheet('JobOrder', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      },
    },
  });

  // Set column widths
  ws.columns = [
    { width: 22 }, // A - Field Labels Left
    { width: 26 }, // B - Field Values Left
    { width: 22 }, // C - Field Labels Right
    { width: 26 }, // D - Field Values Right
    { width: 4 },  // E - Spacer
    { width: 16 }, // F - Order Meta Labels
    { width: 18 }, // G - Order Meta Values
  ];

  // Helper styles
  const navyFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Slate 800
  };

  const sectionFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' }, // Slate 100
  };

  const labelFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' },
  };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  const mediumBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'medium', color: { argb: 'FF94A3B8' } },
    left: { style: 'medium', color: { argb: 'FF94A3B8' } },
    bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
    right: { style: 'medium', color: { argb: 'FF94A3B8' } },
  };

  // Row 1: Header Banner
  ws.mergeCells('A1:G1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'OFFICIAL FLEET MAINTENANCE JOB ORDER';
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = navyFill;
  ws.getRow(1).height = 32;

  // Row 2: Subtitle
  ws.mergeCells('A2:G2');
  const subtitleCell = ws.getCell('A2');
  subtitleCell.value = 'Fleet Operations Department • Authorized Work Order Authorization';
  subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(2).height = 18;

  // Row 3: Spacer
  ws.getRow(3).height = 8;

  // Row 4-6: Order Details Box (Right side) & Top Section
  ws.mergeCells('A4:D4');
  const sec1 = ws.getCell('A4');
  sec1.value = 'JOB ORDER REGISTRATION';
  sec1.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  sec1.fill = sectionFill;
  sec1.border = thinBorder;
  ws.getCell('B4').border = thinBorder;
  ws.getCell('C4').border = thinBorder;
  ws.getCell('D4').border = thinBorder;

  // G4: Order Number
  const f4 = ws.getCell('F4');
  f4.value = 'Job Order No:';
  f4.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  f4.border = thinBorder;
  f4.fill = labelFill;

  const g4 = ws.getCell('G4');
  g4.value = ''; // Will be populated
  g4.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFB91C1C' } };
  g4.alignment = { horizontal: 'center', vertical: 'middle' };
  g4.border = mediumBorder;

  // G5: Date
  const f5 = ws.getCell('F5');
  f5.value = 'Issue Date:';
  f5.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1E293B' } };
  f5.border = thinBorder;
  f5.fill = labelFill;

  const g5 = ws.getCell('G5');
  g5.value = '';
  g5.font = { name: 'Arial', size: 9 };
  g5.alignment = { horizontal: 'center', vertical: 'middle' };
  g5.border = thinBorder;

  // G6: Status
  const f6 = ws.getCell('F6');
  f6.value = 'Status:';
  f6.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1E293B' } };
  f6.border = thinBorder;
  f6.fill = labelFill;

  const g6 = ws.getCell('G6');
  g6.value = '';
  g6.font = { name: 'Arial', size: 9, bold: true };
  g6.alignment = { horizontal: 'center', vertical: 'middle' };
  g6.border = thinBorder;

  // Row 7: Section Header - Vehicle & Employee
  ws.mergeCells('A7:G7');
  const sec2 = ws.getCell('A7');
  sec2.value = '1. VEHICLE & EMPLOYEE INFORMATION (FROM FMS)';
  sec2.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  sec2.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF334155' },
  };
  sec2.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(7).height = 22;

  // Row 8: Car Code & Car Plate
  const setupRow = (
    rowNum: number,
    label1: string,
    cell1Key: string,
    label2: string,
    cell2Key: string
  ) => {
    ws.getRow(rowNum).height = 20;

    const l1 = ws.getCell(`A${rowNum}`);
    l1.value = label1;
    l1.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF334155' } };
    l1.fill = labelFill;
    l1.border = thinBorder;

    const v1 = ws.getCell(cell1Key);
    v1.value = '';
    v1.font = { name: 'Arial', size: 9 };
    v1.border = thinBorder;

    const l2 = ws.getCell(`C${rowNum}`);
    l2.value = label2;
    l2.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF334155' } };
    l2.fill = labelFill;
    l2.border = thinBorder;

    const v2 = ws.getCell(cell2Key);
    v2.value = '';
    v2.font = { name: 'Arial', size: 9 };
    v2.border = thinBorder;
  };

  setupRow(8, 'Car Code:', 'B8', 'Car Plate Number:', 'D8');
  setupRow(9, 'Employee / Owner:', 'B9', 'Staff ID:', 'D9');
  setupRow(10, 'Employee Email:', 'B10', 'Make / Model / Year:', 'D10');
  setupRow(11, 'Chassis Number:', 'B11', 'Motor / Engine No:', 'D11');

  // Row 12: Section Header - Maintenance & Agency
  ws.mergeCells('A12:G12');
  const sec3 = ws.getCell('A12');
  sec3.value = '2. MAINTENANCE CLASSIFICATION & ASSIGNED AGENCY';
  sec3.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  sec3.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF334155' },
  };
  sec3.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(12).height = 22;

  setupRow(13, 'Current Mileage (KM):', 'B13', 'Assigned Agency:', 'D13');
  setupRow(14, 'Maintenance Type:', 'B14', '', 'D14');

  // Row 16: Maintenance Details Header
  ws.mergeCells('A16:G16');
  const sec4 = ws.getCell('A16');
  sec4.value = '3. MAINTENANCE SPECIFICATIONS & SCOPE OF WORK';
  sec4.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  sec4.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF334155' },
  };
  sec4.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(16).height = 22;

  // Row 17-20: Maintenance Details Box
  ws.mergeCells('A17:G20');
  const detailsCell = ws.getCell('A17');
  detailsCell.value = '';
  detailsCell.font = { name: 'Arial', size: 9.5 };
  detailsCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
  detailsCell.border = mediumBorder;

  // Row 21: Section Header - Authorization & Sign-off
  ws.mergeCells('A21:G21');
  const sec5 = ws.getCell('A21');
  sec5.value = '4. AUTHORIZATION & SERVICE ACKNOWLEDGMENT';
  sec5.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  sec5.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF334155' },
  };
  sec5.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(21).height = 22;

  // Row 22-24: Signature Blocks
  ws.mergeCells('A22:C22');
  ws.getCell('A22').value = 'Fleet Coordinator Authorization';
  ws.getCell('A22').font = { name: 'Arial', size: 9, bold: true };
  ws.getCell('A22').fill = labelFill;
  ws.getCell('A22').border = thinBorder;

  ws.mergeCells('D22:G22');
  ws.getCell('D22').value = 'Workshop / Agency Reception';
  ws.getCell('D22').font = { name: 'Arial', size: 9, bold: true };
  ws.getCell('D22').fill = labelFill;
  ws.getCell('D22').border = thinBorder;

  ws.mergeCells('A23:C24');
  const sign1 = ws.getCell('A23');
  sign1.value = 'Approved by: Fleet Operations\nStatus: Authorized\nDate: ________________________';
  sign1.font = { name: 'Arial', size: 8.5, color: { argb: 'FF64748B' } };
  sign1.alignment = { vertical: 'bottom', wrapText: true };
  sign1.border = thinBorder;

  ws.mergeCells('D23:G24');
  const sign2 = ws.getCell('D23');
  sign2.value = 'Received by (Agent Name): ________________________\nSignature: __________________ Date: ________________';
  sign2.font = { name: 'Arial', size: 8.5, color: { argb: 'FF64748B' } };
  sign2.alignment = { vertical: 'bottom', wrapText: true };
  sign2.border = thinBorder;

  // Row 26: Official Footer
  ws.mergeCells('A26:G26');
  const footerCell = ws.getCell('A26');
  footerCell.value = 'Notice: This official Job Order must accompany the vehicle upon delivery to the authorized service workshop.';
  footerCell.font = { name: 'Arial', size: 8, italic: true, color: { argb: 'FF94A3B8' } };
  footerCell.alignment = { horizontal: 'center', vertical: 'middle' };

  return await wb.xlsx.writeBuffer();
}

/**
 * Copies the template without modifying the original, populates the mapped cells,
 * and saves the completed Job Order file.
 */
export async function populateJobOrderExcel(
  templateBuffer: ArrayBuffer,
  order: MainOrder,
  mapping: TemplateMapping
): Promise<{ buffer: ArrayBuffer; base64: string; workbook: ExcelJS.Workbook }> {
  // Load into a fresh workbook instance (original buffer remains intact)
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(templateBuffer);

  const valuesToFill: Record<string, string | number> = {
    orderNumber: order.orderNumber,
    date: order.date,
    status: order.status,
    carCode: order.carCode,
    carNumber: order.carNumber,
    employeeName: order.employeeName,
    staffId: order.staffId,
    employeeEmail: order.employeeEmail,
    makeModelYear: `${order.make} ${order.model} (${order.year})`,
    chassisNumber: order.chassisNumber,
    motorNumber: order.motorNumber,
    mileage: `${order.mileage.toLocaleString()} KM`,
    agency: order.agency,
    maintenanceType: order.maintenanceType,
    maintenanceDetails: order.maintenanceDetails,
  };

  for (const [key, mapConfig] of Object.entries(mapping)) {
    if (!mapConfig || !mapConfig.sheet || !mapConfig.cell) continue;

    let ws = wb.getWorksheet(mapConfig.sheet);
    if (!ws) {
      // Fallback to first worksheet if sheet name changed
      ws = wb.worksheets[0];
    }
    if (!ws) continue;

    const cell = ws.getCell(mapConfig.cell);
    const val = valuesToFill[key];
    if (val !== undefined) {
      cell.value = val;
    }
  }

  const generatedBuffer = await wb.xlsx.writeBuffer();
  const base64 = bufferToBase64(generatedBuffer);

  return {
    buffer: generatedBuffer,
    base64,
    workbook: wb,
  };
}

/**
 * Parses uploaded FMS Excel file and extracts structured vehicle records.
 */
export async function parseFMSExcel(fileBuffer: ArrayBuffer): Promise<FMSVehicleRecord[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(fileBuffer);

  const ws = wb.worksheets[0];
  if (!ws) {
    throw new Error('The uploaded Excel file does not contain any sheets.');
  }

  const records: FMSVehicleRecord[] = [];
  const headerMap: Record<string, number> = {};

  // Find header row (usually row 1, or first non-empty row)
  let headerRowNumber = 1;
  for (let r = 1; r <= 10; r++) {
    const row = ws.getRow(r);
    let hasCarCode = false;
    row.eachCell((cell, colNumber) => {
      const val = String(cell.value || '').trim().toLowerCase();
      if (val.includes('car code') || val.includes('carcode') || val.includes('vehicle code') || val === 'code') {
        hasCarCode = true;
      }
    });
    if (hasCarCode) {
      headerRowNumber = r;
      break;
    }
  }

  const headerRow = ws.getRow(headerRowNumber);
  headerRow.eachCell((cell, colNumber) => {
    const cleanHeader = String(cell.value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    headerMap[cleanHeader] = colNumber;
  });

  const getCol = (possibleNames: string[]): number | undefined => {
    // 1. Exact match first across all possible names
    for (const name of possibleNames) {
      const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (headerMap[clean] !== undefined) return headerMap[clean];
    }
    // 2. Strict startsWith or endsWith
    for (const name of possibleNames) {
      const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const [key, col] of Object.entries(headerMap)) {
        if (key === clean || key.startsWith(clean) || key.endsWith(clean)) return col;
      }
    }
    // 3. Substring match as fallback
    for (const name of possibleNames) {
      const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const [key, col] of Object.entries(headerMap)) {
        if (key.includes(clean)) return col;
      }
    }
    return undefined;
  };

  const colCarCode = getCol(['car code', 'carcode', 'vehicle code', 'code', 'car_code']);
  const colCarNumber = getCol(['car number', 'plate', 'plate number', 'car plate', 'carnumber', 'reg number', 'registration number']);
  const colChassis = getCol(['chassis number', 'chassis', 'vin', 'chassis no', 'chassisnum', 'vin number']);
  const colMotor = getCol(['motor number', 'motor', 'engine', 'engine number', 'motornumber', 'engine no']);
  // Distinct separated Make, Model, Year columns
  const colMake = getCol(['make', 'brand', 'vehicle make', 'carmake', 'manufacturer', 'car brand']);
  const colModel = getCol(['model', 'vehicle model', 'car model', 'cartype', 'model name']);
  const colYear = getCol(['year', 'model year', 'manufacturing year', 'production year', 'mfgyear', 'yr']);
  const colCombinedMakeModel = getCol(['make and model', 'make / model', 'make model', 'vehicle make model', 'description', 'vehicle description']);
  const colEmployee = getCol(['employee name', 'car owner', 'employee', 'driver name', 'staff name', 'owner']);
  const colStaffId = getCol(['staff id', 'employee id', 'staffid', 'employee no', 'staff number']);
  const colEmail = getCol(['employee email', 'email', 'staff email', 'driver email']);

  if (!colCarCode) {
    throw new Error('Required column "Car Code" was not found in the uploaded FMS sheet.');
  }

  // Known automotive multi-word makes for clean separation
  const multiWordMakes = ['land rover', 'mercedes benz', 'mercedes-benz', 'alfa romeo', 'aston martin', 'rolls royce'];

  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) return;

    const carCodeRaw = row.getCell(colCarCode).value;
    const carCode = String(carCodeRaw || '').trim();
    if (!carCode) return; // Skip empty rows

    const getVal = (col?: number) => {
      if (!col) return '';
      const cell = row.getCell(col);
      if (cell.value === null || cell.value === undefined) return '';
      if (cell.value instanceof Date) {
        return String(cell.value.getFullYear());
      }
      if (typeof cell.value === 'object') {
        return (cell.value as any).text || (cell.value as any).result || String(cell.value);
      }
      return String(cell.value).trim();
    };

    let rawMake = getVal(colMake);
    let rawModel = getVal(colModel);
    let rawYear = getVal(colYear);

    // If separate Make/Model was not found, check combined column
    if ((!rawMake || !rawModel) && colCombinedMakeModel) {
      const combined = getVal(colCombinedMakeModel);
      if (combined) {
        // Check if combined has year (e.g. "Toyota Hilux 2023")
        const yearMatch = combined.match(/\b(19\d\d|20\d\d)\b/);
        if (yearMatch && !rawYear) {
          rawYear = yearMatch[1];
        }
        const cleanedCombined = combined.replace(/\b(19\d\d|20\d\d)\b/g, '').trim();

        // Check multi-word makes
        let matchedMake = '';
        const lowerComb = cleanedCombined.toLowerCase();
        for (const mwm of multiWordMakes) {
          if (lowerComb.startsWith(mwm)) {
            matchedMake = cleanedCombined.slice(0, mwm.length).trim();
            if (!rawMake) rawMake = matchedMake;
            if (!rawModel) rawModel = cleanedCombined.slice(mwm.length).replace(/^[\s\-_/]+/, '').trim();
            break;
          }
        }

        if (!matchedMake) {
          const parts = cleanedCombined.split(/[\s\-_/]+/);
          if (parts.length > 0) {
            if (!rawMake) rawMake = parts[0];
            if (!rawModel && parts.length > 1) rawModel = parts.slice(1).join(' ');
          }
        }
      }
    }

    // Clean up Year
    let parsedYear: number = new Date().getFullYear();
    if (rawYear) {
      const match = String(rawYear).match(/\b(19\d\d|20\d\d)\b/);
      if (match) {
        parsedYear = parseInt(match[1], 10);
      } else {
        const num = parseInt(String(rawYear), 10);
        if (!isNaN(num) && num >= 1970 && num <= 2050) {
          parsedYear = num;
        }
      }
    } else {
      // Check if Model has year embedded (e.g. "Hilux 2023")
      const modelYearMatch = rawModel.match(/\b(19\d\d|20\d\d)\b/);
      if (modelYearMatch) {
        parsedYear = parseInt(modelYearMatch[1], 10);
        rawModel = rawModel.replace(/\b(19\d\d|20\d\d)\b/g, '').trim();
      }
    }

    // Clean up Make and Model if Make and Model were identical or mixed
    if (rawMake && rawModel && rawMake.trim().toLowerCase() === rawModel.trim().toLowerCase()) {
      rawModel = '';
    }

    records.push({
      carCode,
      carNumber: getVal(colCarNumber) || 'N/A',
      chassisNumber: getVal(colChassis) || 'N/A',
      motorNumber: getVal(colMotor) || 'N/A',
      make: rawMake || 'Toyota',
      model: rawModel || 'Standard',
      year: parsedYear,
      employeeName: getVal(colEmployee) || 'Company Pool',
      staffId: getVal(colStaffId) || 'EMP-000',
      employeeEmail: getVal(colEmail) || 'fleet@company.com',
    });
  });

  return records;
}

/**
 * Generates a ready-to-use sample FMS file for coordinators to test or reference.
 */
export async function generateSampleFMSFile(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Fleet_Master_Sheet');

  ws.columns = [
    { header: 'Car Code', key: 'carCode', width: 14 },
    { header: 'Car Number', key: 'carNumber', width: 16 },
    { header: 'Chassis Number', key: 'chassisNumber', width: 22 },
    { header: 'Motor Number', key: 'motorNumber', width: 18 },
    { header: 'Make', key: 'make', width: 14 },
    { header: 'Model', key: 'model', width: 16 },
    { header: 'Year', key: 'year', width: 10 },
    { header: 'Employee Name / Car Owner', key: 'employeeName', width: 26 },
    { header: 'Staff ID', key: 'staffId', width: 14 },
    { header: 'Employee Email', key: 'employeeEmail', width: 28 },
  ];

  // Header row style
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };

  const sampleVehicles: FMSVehicleRecord[] = [
    {
      carCode: 'FLT-001',
      carNumber: 'DXB-84920',
      chassisNumber: 'JT112HK4982130',
      motorNumber: '2TR-849122',
      make: 'Toyota',
      model: 'Hilux Double Cab',
      year: 2023,
      employeeName: 'Ahmed Mansoor',
      staffId: 'EMP-1042',
      employeeEmail: 'ahmed.mansoor@company.com',
    },
    {
      carCode: 'FLT-002',
      carNumber: 'DXB-19482',
      chassisNumber: '1FTFW1ED4MFA19',
      motorNumber: 'ECO-948123',
      make: 'Ford',
      model: 'Ranger XLT',
      year: 2022,
      employeeName: 'Sarah Jenkins',
      staffId: 'EMP-1089',
      employeeEmail: 'sarah.jenkins@company.com',
    },
    {
      carCode: 'FLT-003',
      carNumber: 'AUH-55210',
      chassisNumber: 'JN1TBNY61Z0039',
      motorNumber: 'VK56-918231',
      make: 'Nissan',
      model: 'Patrol XE',
      year: 2024,
      employeeName: 'Khalid Al-Hashemi',
      staffId: 'EMP-1104',
      employeeEmail: 'khalid.hashemi@company.com',
    },
    {
      carCode: 'FLT-004',
      carNumber: 'SHJ-74912',
      chassisNumber: 'KMHD841CLNU842',
      motorNumber: 'G4NL-104928',
      make: 'Hyundai',
      model: 'Tucson GLS',
      year: 2023,
      employeeName: 'Mohamed Ahmed',
      staffId: 'EMP-1150',
      employeeEmail: 'mohamed.ahmed39675@gmail.com',
    },
    {
      carCode: 'FLT-005',
      carNumber: 'DXB-33918',
      chassisNumber: 'JTDBT9230M2910',
      motorNumber: 'M20A-841920',
      make: 'Toyota',
      model: 'Corolla Cross',
      year: 2023,
      employeeName: 'Fatima Al-Zahra',
      staffId: 'EMP-1205',
      employeeEmail: 'fatima.zahra@company.com',
    },
    {
      carCode: 'FLT-006',
      carNumber: 'DXB-60481',
      chassisNumber: 'SALWA2V42KA918',
      motorNumber: 'PT204-749182',
      make: 'Land Rover',
      model: 'Defender 110',
      year: 2024,
      employeeName: 'David Sterling',
      staffId: 'EMP-1008',
      employeeEmail: 'david.sterling@company.com',
    },
    {
      carCode: 'FLT-007',
      carNumber: 'AUH-88419',
      chassisNumber: 'WAUZZZF28MA019',
      motorNumber: 'DKNA-491820',
      make: 'Audi',
      model: 'A6 S-Line',
      year: 2022,
      employeeName: 'Elena Rostova',
      staffId: 'EMP-1220',
      employeeEmail: 'elena.rostova@company.com',
    },
    {
      carCode: 'FLT-008',
      carNumber: 'SHJ-40192',
      chassisNumber: 'MMFB3192004918',
      motorNumber: '4N15-849182',
      make: 'Mitsubishi',
      model: 'L200 Sportero',
      year: 2021,
      employeeName: 'Tariq Mahmoud',
      staffId: 'EMP-1245',
      employeeEmail: 'tariq.mahmoud@company.com',
    },
    {
      carCode: 'FLT-009',
      carNumber: 'DXB-91823',
      chassisNumber: '4T1B11HK5MU918',
      motorNumber: 'A25A-918293',
      make: 'Toyota',
      model: 'Camry Hybrid',
      year: 2023,
      employeeName: 'Zainab Qureshi',
      staffId: 'EMP-1290',
      employeeEmail: 'zainab.qureshi@company.com',
    },
    {
      carCode: 'FLT-010',
      carNumber: 'DXB-10294',
      chassisNumber: 'VF1RFA00863910',
      motorNumber: 'M9R-918234',
      make: 'Renault',
      model: 'Master Cargo Van',
      year: 2022,
      employeeName: 'Logistics Team Pool',
      staffId: 'DEPT-LOG',
      employeeEmail: 'logistics@company.com',
    },
  ];

  sampleVehicles.forEach((v) => {
    ws.addRow(v);
  });

  return await wb.xlsx.writeBuffer();
}

/**
 * Exports Main Orders to a formatted Excel file.
 */
export async function exportMainOrdersToExcel(orders: MainOrder[]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Main_Orders_Register');

  ws.columns = [
    { header: 'Order Number', key: 'orderNumber', width: 14 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Car Code', key: 'carCode', width: 14 },
    { header: 'Car Number', key: 'carNumber', width: 16 },
    { header: 'Make & Model', key: 'vehicle', width: 22 },
    { header: 'Year', key: 'year', width: 10 },
    { header: 'Employee Name', key: 'employeeName', width: 22 },
    { header: 'Staff ID', key: 'staffId', width: 14 },
    { header: 'Employee Email', key: 'employeeEmail', width: 26 },
    { header: 'Current Mileage (KM)', key: 'mileage', width: 20 },
    { header: 'Assigned Agency', key: 'agency', width: 24 },
    { header: 'Maintenance Type', key: 'maintenanceType', width: 22 },
    { header: 'Maintenance Details', key: 'maintenanceDetails', width: 35 },
    { header: 'Email Status', key: 'emailStatus', width: 14 },
    { header: 'Email Date', key: 'emailDate', width: 20 },
    { header: 'Chassis Number', key: 'chassisNumber', width: 22 },
    { header: 'Motor Number', key: 'motorNumber', width: 18 },
    { header: 'Created Date', key: 'createdDate', width: 20 },
    { header: 'Updated Date', key: 'updatedDate', width: 20 },
  ];

  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };

  orders.forEach((o) => {
    ws.addRow({
      orderNumber: o.orderNumber,
      date: o.date,
      status: o.status,
      carCode: o.carCode,
      carNumber: o.carNumber,
      vehicle: `${o.make} ${o.model}`,
      year: o.year,
      employeeName: o.employeeName,
      staffId: o.staffId,
      employeeEmail: o.employeeEmail,
      mileage: o.mileage,
      agency: o.agency,
      maintenanceType: o.maintenanceType,
      maintenanceDetails: o.maintenanceDetails,
      emailStatus: o.emailStatus,
      emailDate: o.emailDate || 'N/A',
      chassisNumber: o.chassisNumber,
      motorNumber: o.motorNumber,
      createdDate: o.createdDate,
      updatedDate: o.updatedDate,
    });
  });

  return await wb.xlsx.writeBuffer();
}

/**
 * Generates an official sample Excel template for importing/uploading Main Orders.
 * Pre-formatted with exact column headers, styling, and sample rows.
 */
export async function generateSampleMainOrderTemplate(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Fleet Maintenance System';
  wb.created = new Date();

  const ws = wb.addWorksheet('Main_Orders_Upload', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = [
    { header: 'Request ID', key: 'orderNumber', width: 14 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Mileage Reading', key: 'mileage', width: 18 },
    { header: 'Agency Name', key: 'agency', width: 24 },
    { header: 'Car Code', key: 'carCode', width: 14 },
    { header: 'Car Number', key: 'carNumber', width: 16 },
    { header: 'Make', key: 'make', width: 14 },
    { header: 'Model', key: 'model', width: 18 },
    { header: 'Year', key: 'year', width: 10 },
    { header: 'Maintenance Type', key: 'maintenanceType', width: 26 },
    { header: 'Maintenance Description', key: 'maintenanceDetails', width: 38 },
    { header: 'User Name', key: 'employeeName', width: 22 },
    { header: 'User ID', key: 'staffId', width: 14 },
    { header: 'Employee Email', key: 'employeeEmail', width: 28 },
    { header: 'Chassis Number', key: 'chassisNumber', width: 22 },
    { header: 'Motor Number', key: 'motorNumber', width: 18 },
    { header: 'Status', key: 'status', width: 18 },
  ];

  // Header row formatting
  const headerRow = ws.getRow(1);
  headerRow.height = 28;
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Slate 800
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  const sampleOrders = [
    {
      orderNumber: 1001,
      date: '2026-09-15',
      mileage: 45000,
      agency: 'Al-Futtaim Auto Center',
      carCode: 'FLT-001',
      carNumber: 'DXB-84920',
      make: 'Toyota',
      model: 'Hilux Double Cab',
      year: 2023,
      maintenanceType: 'Preventive Maintenance',
      maintenanceDetails: 'Periodic 10,000 KM service, synthetic oil change, genuine oil filter, and air filter replacement',
      employeeName: 'Ahmed Mansoor',
      staffId: 'EMP-1042',
      employeeEmail: 'ahmed.mansoor@company.com',
      chassisNumber: 'JT112HK4982130',
      motorNumber: '2TR-849122',
      status: 'Completed',
    },
    {
      orderNumber: 1002,
      date: '2026-09-16',
      mileage: 62400,
      agency: 'Bosch Car Service',
      carCode: 'FLT-002',
      carNumber: 'DXB-19482',
      make: 'Ford',
      model: 'Ranger XLT',
      year: 2022,
      maintenanceType: 'Corrective Maintenance',
      maintenanceDetails: 'Front brake rotor resurfacing, ceramic brake pad replacement, brake fluid flush',
      employeeName: 'Sarah Jenkins',
      staffId: 'EMP-1089',
      employeeEmail: 'sarah.jenkins@company.com',
      chassisNumber: '1FTFW1ED4MFA19',
      motorNumber: 'ECO-948123',
      status: 'Completed',
    },
    {
      orderNumber: 1003,
      date: '2026-09-17',
      mileage: 38200,
      agency: 'QuickLube Express',
      carCode: 'FLT-003',
      carNumber: 'AUH-55210',
      make: 'Nissan',
      model: 'Patrol XE',
      year: 2024,
      maintenanceType: 'Tire Change',
      maintenanceDetails: 'All 4 tires replacement (Michelin 275/60R20), computerized wheel alignment and balancing',
      employeeName: 'Khalid Al-Hashemi',
      staffId: 'EMP-1104',
      employeeEmail: 'khalid.hashemi@company.com',
      chassisNumber: 'JN1TBNY61Z0039',
      motorNumber: 'VK56-918231',
      status: 'Completed',
    },
    {
      orderNumber: 1004,
      date: '2026-09-18',
      mileage: 21500,
      agency: 'Alghanim Service Center',
      carCode: 'FLT-004',
      carNumber: 'SHJ-74912',
      make: 'Hyundai',
      model: 'Tucson GLS',
      year: 2023,
      maintenanceType: 'Preventive Maintenance',
      maintenanceDetails: '20,000 KM major maintenance inspection, spark plugs replacement, AC cabin filter renewal',
      employeeName: 'Mohamed Ahmed',
      staffId: 'EMP-1150',
      employeeEmail: 'mohamed.ahmed39675@gmail.com',
      chassisNumber: 'KMHD841CLNU842',
      motorNumber: 'G4NL-104928',
      status: 'Request Received',
    },
    {
      orderNumber: 1005,
      date: '2026-09-19',
      mileage: 15300,
      agency: 'National Agency Workshop',
      carCode: 'FLT-005',
      carNumber: 'DXB-33918',
      make: 'Toyota',
      model: 'Corolla Cross',
      year: 2023,
      maintenanceType: 'Accident',
      maintenanceDetails: 'Rear bumper repaint and bracket alignment following minor parking scrape',
      employeeName: 'Fatima Al-Zahra',
      staffId: 'EMP-1205',
      employeeEmail: 'fatima.zahra@company.com',
      chassisNumber: 'JTDBT9230M2910',
      motorNumber: 'M20A-841920',
      status: 'Job Order Created',
    },
  ];

  sampleOrders.forEach((item) => {
    const row = ws.addRow(item);
    row.height = 20;
    row.alignment = { vertical: 'middle' };
  });

  return await wb.xlsx.writeBuffer();
}

/**
 * Parses uploaded Excel file for importing existing historical Main Orders.
 * Supports flexible headers, robust value types, auto-enrichment from FMS,
 * and duplicate detection.
 */
export async function parseImportMainOrders(
  fileBuffer: ArrayBuffer,
  existingOrderNumbers: Set<number>,
  fleetVehicles?: FMSVehicleRecord[]
): Promise<{
  validOrders: Partial<MainOrder>[];
  duplicates: { orderNumber: number; row: number; newOrder: Partial<MainOrder> }[];
  errors: { row: number; reason: string }[];
}> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(fileBuffer);
  const ws = wb.worksheets[0];

  if (!ws || ws.rowCount === 0) {
    throw new Error('Uploaded Excel sheet is empty.');
  }

  // 1. Locate header row (search rows 1 to 15 for matching column keywords)
  let headerRowNumber = 1;
  let bestHeaderScore = 0;
  const keySearchWords = [
    'order', 'request', 'car', 'code', 'plate', 'vehicle', 'mileage', 'agency', 'make', 'type',
    'vin', 'chassis', 'motor', 'engine', 'driver', 'employee', 'date', 'km',
    'طلب', 'سيارة', 'مركبة', 'لوحة', 'شاسيه', 'محرك', 'عداد', 'وكالة', 'صيانة'
  ];

  for (let r = 1; r <= Math.min(ws.rowCount, 15); r++) {
    const row = ws.getRow(r);
    let score = 0;
    row.eachCell((cell) => {
      const txt = String(cell.value || '').toLowerCase();
      if (keySearchWords.some((w) => txt.includes(w))) {
        score++;
      }
    });
    if (score > bestHeaderScore) {
      bestHeaderScore = score;
      headerRowNumber = r;
    }
  }

  const headerRow = ws.getRow(headerRowNumber);
  const headerMap: Record<string, number> = {};
  headerRow.eachCell((cell, col) => {
    let rawVal = cell.value;
    if (rawVal && typeof rawVal === 'object') {
      rawVal = (rawVal as any).text || (rawVal as any).result || String(rawVal);
    }
    const key = String(rawVal || '').trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '');
    if (key) {
      headerMap[key] = col;
    }
  });

  const getCol = (aliases: string[]) => {
    for (const alias of aliases) {
      const clean = alias.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '');
      if (headerMap[clean] !== undefined) return headerMap[clean];
      for (const [k, col] of Object.entries(headerMap)) {
        if (k.includes(clean) || clean.includes(k)) return col;
      }
    }
    return undefined;
  };

  // Resolve columns flexibly across all naming variants (English, Arabic, abbreviations)
  const cOrderNo = getCol([
    'requestid', 'maintenancerequestid', 'requestno', 'reqid', 'reqno',
    'ordernumber', 'orderno', 'orderid', 'joborderno', 'jobordernumber',
    'joborder', 'order', 'request', 'id', 'no', 'num', 'رقمطلب', 'رقم', 'طلب'
  ]);
  const cDate = getCol([
    'date', 'daydate', 'orderdate', 'requestdate', 'day', 'createddate', 'entrydate', 'تاريخ', 'يوم'
  ]);
  const cMileage = getCol([
    'mileagereading', 'mileage', 'currentmileage', 'currentmileagekm', 'kmreading', 'km', 'reading', 'odometer',
    'عداد', 'قراءةالعداد', 'كيلومتر'
  ]);
  const cAgency = getCol([
    'agencyname', 'agency', 'assignedagency', 'serviceprovider', 'workshop', 'garage', 'dealer', 'vendor',
    'وكالة', 'الورشة', 'مركزخدمة'
  ]);
  const cCarCode = getCol([
    'carcode', 'vehiclecode', 'fltcode', 'fleetcode', 'code', 'vehicleid', 'carid', 'flt', 'asset', 'assetid',
    'assetno', 'equipment', 'unit', 'unitno', 'internalcode', 'كودسيارة', 'رمزسيارة', 'كود', 'رمز'
  ]);
  const cCarNumber = getCol([
    'carnumber', 'platenumber', 'plate', 'plateno', 'carno', 'registration', 'regno', 'licenseplate',
    'vehicleno', 'trafficplate', 'لوحة', 'رقملوحة', 'رقمسيارة', 'اللوحة'
  ]);
  const cMake = getCol([
    'make', 'brand', 'carmake', 'vehiclemake', 'manufacturer', 'ماركة', 'النوع', 'الصانع'
  ]);
  const cModel = getCol([
    'model', 'carmodel', 'vehiclemodel', 'موديل', 'طراز'
  ]);
  const cYear = getCol([
    'year', 'modelyear', 'mfgyear', 'سنة', 'سنةالصنع', 'عام'
  ]);
  const cCombinedVehicle = getCol([
    'vehicle', 'vehicledescription', 'car', 'makemodelyear', 'makemodel', 'المركبة', 'السيارة'
  ]);
  const cType = getCol([
    'maintenancetype', 'mainttype', 'servicetype', 'type', 'worktype', 'jobtype', 'category', 'نوعصيانة', 'نوعالخدمة'
  ]);
  const cDetails = getCol([
    'maintenancedescription', 'maintenancedetails', 'description', 'details', 'workdescription',
    'faultdescription', 'notes', 'workrequired', 'scopeofwork', 'issue', 'remarks', 'وصفصيانة', 'ملاحظات', 'تفاصيل'
  ]);
  const cEmployee = getCol([
    'username', 'employeename', 'drivername', 'user', 'driver', 'owner', 'employee', 'carowner', 'staffname',
    'سائق', 'موظف', 'اسم'
  ]);
  const cStaffId = getCol([
    'userid', 'staffid', 'employeeid', 'userno', 'staffno', 'empid', 'رقموظيفي'
  ]);
  const cEmail = getCol([
    'employeeemail', 'useremail', 'email', 'driveremail', 'emailaddress', 'owneremail', 'بريد'
  ]);
  const cChassis = getCol([
    'chassis', 'chassisnumber', 'chassisno', 'vin', 'vinnumber', 'frameno', 'شاسيه', 'رقمشاسيه'
  ]);
  const cMotor = getCol([
    'engine', 'motor', 'motornumber', 'enginenumber', 'engineno', 'motorno', 'محرك', 'رقمالمحرك'
  ]);
  const cStatus = getCol([
    'status', 'orderstatus', 'jobstatus', 'state', 'carstatus', 'حالة'
  ]);

  // Ensure at least one vehicle column or order column exists
  if (!cCarCode && !cCarNumber && !cOrderNo) {
    throw new Error(
      'Could not identify vehicle or order columns in the Excel file. Please ensure columns include "Car Code", "Car Number", or "Request ID".'
    );
  }

  // Safe cell value extractor
  const getVal = (row: ExcelJS.Row, col?: number): string => {
    if (!col) return '';
    const cell = row.getCell(col);
    const val = cell.value;
    if (val === null || val === undefined) return '';

    if (val instanceof Date) {
      return val.toISOString().split('T')[0];
    }
    if (typeof val === 'object') {
      if ('richText' in val && Array.isArray((val as any).richText)) {
        return (val as any).richText.map((t: any) => t.text || '').join('').trim();
      }
      if ('result' in val) {
        const res = (val as any).result;
        if (res instanceof Date) return res.toISOString().split('T')[0];
        return String(res ?? '').trim();
      }
      if ('text' in val) {
        return String((val as any).text || '').trim();
      }
      return String(val).trim();
    }
    return String(val).trim();
  };

  const parseDateValue = (raw: string): string => {
    if (!raw) return new Date().toISOString().split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const num = Number(raw);
    if (!isNaN(num) && num > 20000 && num < 70000) {
      const d = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    return raw;
  };

  const parseMaintenanceType = (raw: string): any => {
    const l = (raw || '').toLowerCase();
    if (l.includes('corrective') || l.includes('repair') || l.includes('breakdown')) {
      return 'Corrective Maintenance';
    }
    if (l.includes('tire') || l.includes('tyre') || l.includes('wheel')) {
      return 'Tire Change';
    }
    if (l.includes('accident') || l.includes('body') || l.includes('crash')) {
      return 'Accident';
    }
    return 'Preventive Maintenance';
  };

  const parseOrderStatus = (raw: string): any => {
    const l = (raw || '').toLowerCase();
    if (l.includes('receive') || l.includes('pending') || l.includes('open')) {
      return 'Request Received';
    }
    if (l.includes('create') || l.includes('process')) {
      return 'Job Order Created';
    }
    if (l.includes('sent')) {
      return 'Sent to Employee';
    }
    if (l.includes('close')) {
      return 'Closed';
    }
    return 'Completed';
  };

  // Find highest existing order number for auto-assignment fallback
  let maxOrderNo = 1000;
  for (const n of existingOrderNumbers) {
    if (typeof n === 'number' && !isNaN(n) && n > maxOrderNo) maxOrderNo = n;
  }

  const validOrders: Partial<MainOrder>[] = [];
  const duplicates: { orderNumber: number; row: number; newOrder: Partial<MainOrder> }[] = [];
  const errors: { row: number; reason: string }[] = [];
  const seenInFile = new Set<number>();

  // Pre-index fleet vehicles for instant O(1) lookup across tens of thousands of rows
  const fleetByCodeMap = new Map<string, FMSVehicleRecord>();
  const fleetByPlateMap = new Map<string, FMSVehicleRecord>();
  if (fleetVehicles && fleetVehicles.length > 0) {
    for (const v of fleetVehicles) {
      if (v.carCode) {
        fleetByCodeMap.set(v.carCode.trim().toUpperCase(), v);
      }
      if (v.carNumber) {
        fleetByPlateMap.set(v.carNumber.toLowerCase().replace(/[\s\-_./\\]/g, ''), v);
      }
    }
  }

  ws.eachRow((row, rowNum) => {
    if (rowNum <= headerRowNumber) return;

    // Check if entire row is empty
    let hasAnyValue = false;
    row.eachCell((c) => {
      if (c.value !== null && c.value !== undefined && String(c.value).trim() !== '') {
        hasAnyValue = true;
      }
    });
    if (!hasAnyValue) return;

    // Determine Order Number first (or auto-assign if omitted/invalid)
    let orderNo: number = 0;
    const rawOrderStr = getVal(row, cOrderNo);
    const numericOnly = rawOrderStr.replace(/\D/g, '');
    if (numericOnly) {
      const parsedNum = parseInt(numericOnly, 10);
      if (!isNaN(parsedNum) && parsedNum > 0 && parsedNum < 1e12) {
        orderNo = parsedNum;
      }
    }
    if (!orderNo) {
      maxOrderNo++;
      orderNo = maxOrderNo;
    }

    let rawCarCode = getVal(row, cCarCode).trim();
    let carCode = rawCarCode.toUpperCase();
    let carNumber = getVal(row, cCarNumber).trim();
    const chassisVal = getVal(row, cChassis).trim();
    const motorVal = getVal(row, cMotor).trim();
    let make = getVal(row, cMake).trim();
    let model = getVal(row, cModel).trim();
    const rawYear = getVal(row, cYear).trim();

    // Fast O(1) FMS fleet auto-enrichment lookup
    let fmsVehicle: FMSVehicleRecord | undefined;
    if (carCode) {
      fmsVehicle = fleetByCodeMap.get(carCode);
    }
    if (!fmsVehicle && carNumber) {
      const normPlate = carNumber.toLowerCase().replace(/[\s\-_./\\]/g, '');
      fmsVehicle = fleetByPlateMap.get(normPlate);
      if (fmsVehicle && !carCode) {
        carCode = fmsVehicle.carCode;
      }
    }

    // SOLD / HISTORICAL VEHICLE SUPPORT:
    // If the vehicle does not exist in FMS (sold, decommissioned, or historical),
    // it is 100% permitted to be saved and never rejected.
    const isSoldOrHistorical = !fmsVehicle;

    // Robust graceful fallbacks if carCode or carNumber were not explicitly in row
    if (!carCode && carNumber) {
      carCode = `CAR-${carNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`;
    } else if (!carCode && chassisVal) {
      carCode = `SOLD-VIN-${chassisVal.slice(-8).toUpperCase()}`;
    } else if (!carCode && make) {
      carCode = `SOLD-${make.slice(0, 4).toUpperCase()}-${orderNo}`;
    } else if (!carCode) {
      carCode = `HIST-${orderNo}`;
    }

    if (!carNumber) {
      if (fmsVehicle?.carNumber) {
        carNumber = fmsVehicle.carNumber;
      } else if (chassisVal) {
        carNumber = `SOLD (VIN: ${chassisVal.slice(-6)})`;
      } else if (carCode && !carCode.startsWith('HIST-') && !carCode.startsWith('SOLD-')) {
        carNumber = carCode;
      } else {
        carNumber = 'SOLD / HISTORICAL';
      }
    }

    // Extract Make, Model, Year
    if ((!make || !model) && cCombinedVehicle) {
      const combined = getVal(row, cCombinedVehicle);
      if (combined) {
        const parts = combined.split(/\s+/);
        if (!make && parts.length > 0) make = parts[0];
        if (!model && parts.length > 1) model = parts.slice(1).join(' ');
      }
    }

    if (!make && fmsVehicle?.make) make = fmsVehicle.make;
    if (!model && fmsVehicle?.model) model = fmsVehicle.model;
    if (!make) make = isSoldOrHistorical ? 'Historical Vehicle' : 'Toyota';
    if (!model) model = isSoldOrHistorical ? 'Fleet Unit' : 'Standard';

    let parsedYear: number = new Date().getFullYear();
    if (rawYear) {
      const yNum = parseInt(rawYear.replace(/\D/g, ''), 10);
      if (!isNaN(yNum) && yNum >= 1970 && yNum <= 2050) parsedYear = yNum;
    } else if (fmsVehicle?.year) {
      parsedYear = Number(fmsVehicle.year) || parsedYear;
    }

    // Extract Mileage
    const rawMileage = getVal(row, cMileage);
    const mileageNum = parseInt(rawMileage.replace(/\D/g, ''), 10) || 0;

    const orderData: Partial<MainOrder> = {
      orderNumber: orderNo,
      date: parseDateValue(getVal(row, cDate)),
      carCode,
      carNumber: carNumber || fmsVehicle?.carNumber || 'N/A',
      make,
      model,
      year: parsedYear,
      chassisNumber: chassisVal || fmsVehicle?.chassisNumber || 'N/A',
      motorNumber: motorVal || fmsVehicle?.motorNumber || 'N/A',
      employeeName: getVal(row, cEmployee) || fmsVehicle?.employeeName || (isSoldOrHistorical ? 'Historical Driver' : 'Fleet Driver'),
      staffId: getVal(row, cStaffId) || fmsVehicle?.staffId || (isSoldOrHistorical ? 'HISTORICAL' : 'EMP-000'),
      employeeEmail: getVal(row, cEmail) || fmsVehicle?.employeeEmail || 'fleet@company.com',
      mileage: mileageNum,
      agency: getVal(row, cAgency) || 'General Service Agency',
      maintenanceType: parseMaintenanceType(getVal(row, cType)),
      maintenanceDetails: getVal(row, cDetails) || 'Historical maintenance order record',
      status: parseOrderStatus(getVal(row, cStatus)),
      emailStatus: 'Sent',
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      jobOrderExcelPath: `Orders/${orderNo}/Job_Order_${orderNo}.xlsx`,
      jobOrderPdfPath: `Orders/${orderNo}/Job_Order_${orderNo}_${carCode}.pdf`,
      fmsSnapshot: {
        carCode,
        carNumber,
        isSoldOrHistorical,
        note: isSoldOrHistorical ? 'Historical / Sold Vehicle - Preserved with full database permissions' : undefined,
      },
      auditHistory: [
        {
          id: `audit-${Date.now()}-${rowNum}`,
          action: 'Order Imported from Excel',
          user: 'Fleet Coordinator',
          timestamp: new Date().toISOString(),
          orderNumber: orderNo,
          details: `Imported via Main Orders Excel Sheet (row ${rowNum})${isSoldOrHistorical ? ' [Historical / Sold Vehicle]' : ''}`,
        },
      ],
    };

    if (existingOrderNumbers.has(orderNo) || seenInFile.has(orderNo)) {
      duplicates.push({ orderNumber: orderNo, row: rowNum, newOrder: orderData });
    } else {
      seenInFile.add(orderNo);
      validOrders.push(orderData);
    }
  });

  return { validOrders, duplicates, errors };
}

// Utility: ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Utility: Base64 to ArrayBuffer
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
