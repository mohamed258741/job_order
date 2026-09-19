import {
  AuditLogEntry,
  FMSVehicleRecord,
  MainOrder,
  MaintenanceType,
  OrderStatus,
  SystemSettings,
} from '../types';
import {
  DEFAULT_TEMPLATE_MAPPING,
  createOfficialBaselineTemplate,
  bufferToBase64,
  base64ToBuffer,
} from './excelService';
import {
  idbGetAllMainOrders,
  idbSaveAllMainOrders,
  idbGetAllVehicles,
  idbSaveAllVehicles,
} from './dbService';

const STORAGE_KEYS = {
  FMS_DATA: 'fleet_fms_vehicles_v1',
  FMS_META: 'fleet_fms_metadata_v1',
  MAIN_ORDERS: 'fleet_main_orders_v1',
  SETTINGS: 'fleet_system_settings_v1',
  TEMPLATE_BASE64: 'fleet_official_template_b64_v1',
};

// In-memory cache for instant synchronous access (0ms latency, zero quota limitations)
let memoryMainOrders: MainOrder[] | null = null;
let memoryVehicles: FMSVehicleRecord[] | null = null;
let isDbInitialized = false;
let dbInitListeners: Array<() => void> = [];

// Initialize background storage from IndexedDB
async function initStorageFromIndexedDB(): Promise<void> {
  if (isDbInitialized || typeof window === 'undefined') return;
  try {
    const [dbOrders, dbVehicles] = await Promise.all([
      idbGetAllMainOrders().catch(() => []),
      idbGetAllVehicles().catch(() => []),
    ]);

    let changed = false;
    if (dbOrders && dbOrders.length > 0) {
      memoryMainOrders = dbOrders;
      changed = true;
    }
    if (dbVehicles && dbVehicles.length > 0) {
      memoryVehicles = dbVehicles;
      changed = true;
    }
    isDbInitialized = true;
    if (changed) {
      dbInitListeners.forEach((cb) => {
        try {
          cb();
        } catch {}
      });
    }
  } catch (err) {
    console.warn('IndexedDB initial sync error:', err);
  }
}

// Trigger background initialization immediately
if (typeof window !== 'undefined') {
  initStorageFromIndexedDB();
}

export const INITIAL_AGENCIES = [
  'Al-Futtaim Auto Center',
  'Bosch Car Service',
  'Alghanim Service Center',
  'National Agency Workshop',
  'QuickLube Express',
  'Zayani Motors Service',
];

export const INITIAL_VEHICLES: FMSVehicleRecord[] = [
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

const INITIAL_ORDERS: MainOrder[] = [
  {
    orderNumber: 1248,
    date: '2026-09-15',
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
    mileage: 45200,
    agency: 'Al-Futtaim Auto Center',
    maintenanceType: 'Preventive Maintenance',
    maintenanceDetails: '45,000 KM Periodic Maintenance: Engine oil & filter change, brake pad inspection, AC filter replacement, multi-point chassis safety inspection.',
    jobOrderExcelPath: 'Orders/1248/Job_Order_1248.xlsx',
    jobOrderPdfPath: 'Orders/1248/Job_Order_1248_FLT001.pdf',
    emailStatus: 'Sent',
    emailDate: '2026-09-15 10:15 AM',
    status: 'Completed',
    createdDate: '2026-09-15T10:14:00.000Z',
    updatedDate: '2026-09-15T16:30:00.000Z',
    fmsSnapshot: {
      carCode: 'FLT-001',
      carNumber: 'DXB-84920',
      employeeName: 'Ahmed Mansoor',
      staffId: 'EMP-1042',
      employeeEmail: 'ahmed.mansoor@company.com',
    },
    auditHistory: [
      {
        id: 'aud-1248-1',
        action: 'Order Created',
        user: 'Fleet Coordinator',
        timestamp: '2026-09-15T10:14:00.000Z',
        orderNumber: 1248,
        details: 'Initial order creation and FMS data retrieval',
      },
      {
        id: 'aud-1248-2',
        action: 'Job Order Excel Generated',
        user: 'System',
        timestamp: '2026-09-15T10:14:15.000Z',
        orderNumber: 1248,
        details: 'Excel file populated from official template',
      },
      {
        id: 'aud-1248-3',
        action: 'PDF Generated',
        user: 'System',
        timestamp: '2026-09-15T10:14:25.000Z',
        orderNumber: 1248,
        details: 'Converted Excel to official vector PDF',
      },
      {
        id: 'aud-1248-4',
        action: 'Email Sent',
        user: 'System',
        timestamp: '2026-09-15T10:15:00.000Z',
        orderNumber: 1248,
        details: 'Dispatched to ahmed.mansoor@company.com with PDF attached',
      },
      {
        id: 'aud-1248-5',
        action: 'Status Changed',
        user: 'Fleet Coordinator',
        timestamp: '2026-09-15T16:30:00.000Z',
        orderNumber: 1248,
        details: 'Changed status to Completed upon agency signoff',
      },
    ],
  },
  {
    orderNumber: 1249,
    date: '2026-09-17',
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
    mileage: 28400,
    agency: 'Bosch Car Service',
    maintenanceType: 'Tire Change',
    maintenanceDetails: 'Replacement of 4 all-terrain tires (265/70 R18), wheel alignment, dynamic balancing, and tire pressure monitoring system recalibration.',
    jobOrderExcelPath: 'Orders/1249/Job_Order_1249.xlsx',
    jobOrderPdfPath: 'Orders/1249/Job_Order_1249_FLT003.pdf',
    emailStatus: 'Sent',
    emailDate: '2026-09-17 02:40 PM',
    status: 'Sent to Employee',
    createdDate: '2026-09-17T14:38:00.000Z',
    updatedDate: '2026-09-17T14:40:00.000Z',
    fmsSnapshot: {
      carCode: 'FLT-003',
      carNumber: 'AUH-55210',
      employeeName: 'Khalid Al-Hashemi',
      staffId: 'EMP-1104',
      employeeEmail: 'khalid.hashemi@company.com',
    },
    auditHistory: [
      {
        id: 'aud-1249-1',
        action: 'Order Created',
        user: 'Fleet Coordinator',
        timestamp: '2026-09-17T14:38:00.000Z',
        orderNumber: 1249,
        details: 'Initial order creation and FMS data retrieval',
      },
      {
        id: 'aud-1249-2',
        action: 'Job Order Excel Generated',
        user: 'System',
        timestamp: '2026-09-17T14:38:10.000Z',
        orderNumber: 1249,
        details: 'Excel file populated from official template',
      },
      {
        id: 'aud-1249-3',
        action: 'PDF Generated',
        user: 'System',
        timestamp: '2026-09-17T14:38:15.000Z',
        orderNumber: 1249,
        details: 'Converted Excel to official vector PDF',
      },
      {
        id: 'aud-1249-4',
        action: 'Email Sent',
        user: 'System',
        timestamp: '2026-09-17T14:40:00.000Z',
        orderNumber: 1249,
        details: 'Dispatched to khalid.hashemi@company.com with PDF attached',
      },
    ],
  },
];

export interface FMSMetadata {
  fileName: string;
  uploadedAt: string;
  totalVehicles: number;
}

/**
 * Storage Service for managing persistence across all components
 */
export const StorageService = {
  // --- Storage Ready Listeners ---
  onStorageReady(callback: () => void): () => void {
    dbInitListeners.push(callback);
    if (isDbInitialized) {
      try {
        callback();
      } catch {}
    }
    return () => {
      dbInitListeners = dbInitListeners.filter((cb) => cb !== callback);
    };
  },

  // --- FMS Data ---
  getFMSVehicles(): FMSVehicleRecord[] {
    if (memoryVehicles !== null) {
      return memoryVehicles;
    }
    const raw = localStorage.getItem(STORAGE_KEYS.FMS_DATA);
    if (!raw) {
      memoryVehicles = INITIAL_VEHICLES;
      idbSaveAllVehicles(INITIAL_VEHICLES).catch(() => {});
      return INITIAL_VEHICLES;
    }
    try {
      memoryVehicles = JSON.parse(raw);
      return memoryVehicles!;
    } catch {
      memoryVehicles = INITIAL_VEHICLES;
      return INITIAL_VEHICLES;
    }
  },

  setFMSVehicles(vehicles: FMSVehicleRecord[], fileName: string = 'Uploaded_FMS.xlsx'): void {
    memoryVehicles = vehicles;
    // Persist full vehicle fleet in IndexedDB (supports 20,000+ vehicles with no quota crash)
    idbSaveAllVehicles(vehicles).catch((err) => {
      console.warn('Failed saving FMS vehicles to IndexedDB:', err);
    });

    const meta: FMSMetadata = {
      fileName,
      uploadedAt: new Date().toISOString(),
      totalVehicles: vehicles.length,
    };

    try {
      localStorage.setItem(STORAGE_KEYS.FMS_META, JSON.stringify(meta));
      const str = JSON.stringify(vehicles);
      if (str.length < 2.5 * 1024 * 1024) {
        localStorage.setItem(STORAGE_KEYS.FMS_DATA, str);
      } else {
        // Quota guard: store top 50 in localStorage as emergency fast fallback
        localStorage.setItem(STORAGE_KEYS.FMS_DATA, JSON.stringify(vehicles.slice(0, 50)));
      }
    } catch (quotaErr) {
      console.warn('localStorage quota reached for FMS vehicles; stored safely in IndexedDB.', quotaErr);
    }
  },

  getFMSMetadata(): FMSMetadata {
    const raw = localStorage.getItem(STORAGE_KEYS.FMS_META);
    const count = memoryVehicles ? memoryVehicles.length : INITIAL_VEHICLES.length;
    if (!raw) {
      return {
        fileName: 'Default_FMS_Fleet.xlsx',
        uploadedAt: new Date().toISOString(),
        totalVehicles: count,
      };
    }
    try {
      const parsed = JSON.parse(raw);
      return { ...parsed, totalVehicles: memoryVehicles ? memoryVehicles.length : parsed.totalVehicles };
    } catch {
      return {
        fileName: 'Default_FMS_Fleet.xlsx',
        uploadedAt: new Date().toISOString(),
        totalVehicles: count,
      };
    }
  },

  deleteFMSVehicle(identifier: string): boolean {
    if (!identifier || !identifier.trim()) return false;
    const clean = identifier.trim().toLowerCase();
    const cleanNorm = clean.replace(/[\s\-_./\\]/g, '');
    const current = this.getFMSVehicles();
    const filtered = current.filter((v) => {
      const code = (v.carCode || '').toLowerCase().trim();
      const codeNorm = code.replace(/[\s\-_./\\]/g, '');
      const num = (v.carNumber || '').toLowerCase().trim();
      const numNorm = num.replace(/[\s\-_./\\]/g, '');
      return code !== clean && codeNorm !== cleanNorm && num !== clean && numNorm !== cleanNorm;
    });
    if (filtered.length !== current.length) {
      this.setFMSVehicles(filtered, this.getFMSMetadata().fileName);
      return true;
    }
    return false;
  },

  deleteFMSVehicles(carCodes: string[]): number {
    if (!carCodes || carCodes.length === 0) return 0;
    const targets = new Set(carCodes.map((c) => c.trim().toLowerCase()));
    const targetsNorm = new Set(carCodes.map((c) => c.trim().toLowerCase().replace(/[\s\-_./\\]/g, '')));
    const current = this.getFMSVehicles();
    const filtered = current.filter((v) => {
      const code = (v.carCode || '').toLowerCase().trim();
      const codeNorm = code.replace(/[\s\-_./\\]/g, '');
      const num = (v.carNumber || '').toLowerCase().trim();
      const numNorm = num.replace(/[\s\-_./\\]/g, '');
      return !targets.has(code) && !targetsNorm.has(codeNorm) && !targets.has(num) && !targetsNorm.has(numNorm);
    });
    const removedCount = current.length - filtered.length;
    if (removedCount > 0) {
      this.setFMSVehicles(filtered, this.getFMSMetadata().fileName);
    }
    return removedCount;
  },

  clearAllFMSVehicles(): void {
    this.setFMSVehicles([], 'Empty_Fleet');
  },

  upsertFMSVehicle(record: FMSVehicleRecord): void {
    const current = this.getFMSVehicles();
    const cleanCode = (record.carCode || '').trim().toLowerCase();
    const cleanCodeNorm = cleanCode.replace(/[\s\-_./\\]/g, '');
    const idx = current.findIndex((v) => {
      const code = (v.carCode || '').toLowerCase().trim();
      const codeNorm = code.replace(/[\s\-_./\\]/g, '');
      return code === cleanCode || codeNorm === cleanCodeNorm;
    });
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...record };
    } else {
      current.unshift(record);
    }
    this.setFMSVehicles(current, this.getFMSMetadata().fileName);
  },

  lookupCarCode(carCode: string): FMSVehicleRecord | null {
    if (!carCode || !carCode.trim()) return null;
    const clean = carCode.trim().toLowerCase();
    const cleanNormalized = clean.replace(/[\s\-_./\\]/g, '');
    const vehicles = this.getFMSVehicles();
    return (
      vehicles.find((v) => {
        const vCode = (v.carCode || '').toLowerCase().trim();
        const vCodeNorm = vCode.replace(/[\s\-_./\\]/g, '');
        return vCode === clean || vCodeNorm === cleanNormalized;
      }) || null
    );
  },

  lookupAllCarNumbers(carNumber: string): FMSVehicleRecord[] {
    if (!carNumber || !carNumber.trim()) return [];
    const clean = carNumber.trim().toLowerCase();
    const cleanNormalized = clean.replace(/[\s\-_./\\]/g, '');
    const vehicles = this.getFMSVehicles();

    // 1. Exact match on Car Number
    const exact = vehicles.filter((v) => {
      const vNum = (v.carNumber || '').toLowerCase().trim();
      const vNumNorm = vNum.replace(/[\s\-_./\\]/g, '');
      return vNum === clean || vNumNorm === cleanNormalized;
    });
    if (exact.length > 0) return exact;

    // 2. Partial match (suffix or substring) on Car Number only
    if (cleanNormalized.length >= 3) {
      const partial = vehicles.filter((v) => {
        const vNum = (v.carNumber || '').toLowerCase().trim();
        const vNumNorm = vNum.replace(/[\s\-_./\\]/g, '');
        return vNumNorm.endsWith(cleanNormalized) || vNumNorm.includes(cleanNormalized);
      });
      if (partial.length > 0) return partial;
    }

    return [];
  },

  lookupCarNumber(carNumber: string): FMSVehicleRecord | null {
    const matches = this.lookupAllCarNumbers(carNumber);
    return matches.length > 0 ? matches[0] : null;
  },

  lookupVehicle(query: string, searchMode: 'any' | 'carNumber' | 'carCode' = 'any'): {
    vehicle: FMSVehicleRecord | null;
    matchedBy?: 'carNumber' | 'carCode';
    allMatches?: FMSVehicleRecord[];
  } {
    if (!query || !query.trim()) return { vehicle: null };
    const trimmed = query.trim();

    if (searchMode === 'carNumber') {
      const matches = this.lookupAllCarNumbers(trimmed);
      return {
        vehicle: matches.length > 0 ? matches[0] : null,
        matchedBy: matches.length > 0 ? 'carNumber' : undefined,
        allMatches: matches,
      };
    }

    if (searchMode === 'carCode') {
      const v = this.lookupCarCode(trimmed);
      return {
        vehicle: v,
        matchedBy: v ? 'carCode' : undefined,
        allMatches: v ? [v] : [],
      };
    }

    // Auto / Any mode: check Car Number first, then Car Code
    const byNumber = this.lookupAllCarNumbers(trimmed);
    if (byNumber.length > 0) {
      return { vehicle: byNumber[0], matchedBy: 'carNumber', allMatches: byNumber };
    }

    const byCode = this.lookupCarCode(trimmed);
    if (byCode) {
      return { vehicle: byCode, matchedBy: 'carCode', allMatches: [byCode] };
    }

    return { vehicle: null };
  },

  // --- Main Orders ---
  getMainOrders(): MainOrder[] {
    if (memoryMainOrders !== null) {
      return memoryMainOrders;
    }
    const raw = localStorage.getItem(STORAGE_KEYS.MAIN_ORDERS);
    if (!raw) {
      memoryMainOrders = INITIAL_ORDERS;
      idbSaveAllMainOrders(INITIAL_ORDERS).catch(() => {});
      return INITIAL_ORDERS;
    }
    try {
      memoryMainOrders = JSON.parse(raw);
      return memoryMainOrders!;
    } catch {
      memoryMainOrders = INITIAL_ORDERS;
      return INITIAL_ORDERS;
    }
  },

  async saveMainOrders(orders: MainOrder[]): Promise<void> {
    // 1. Immediately update synchronous in-memory cache
    memoryMainOrders = orders;

    // 2. Persist to IndexedDB (supports 20,000+ records, 50MB+ without quota crashes)
    try {
      await idbSaveAllMainOrders(orders);
    } catch (idbErr) {
      console.warn('Failed saving orders to IndexedDB:', idbErr);
    }

    // 3. Quota-safe sync to localStorage (only if dataset fits within safe bounds)
    try {
      if (orders.length <= 500) {
        const jsonStr = JSON.stringify(orders);
        if (jsonStr.length < 2.5 * 1024 * 1024) {
          localStorage.setItem(STORAGE_KEYS.MAIN_ORDERS, jsonStr);
        } else {
          localStorage.setItem(STORAGE_KEYS.MAIN_ORDERS, JSON.stringify(orders.slice(0, 50)));
        }
      } else {
        // High-scale dataset: avoid stringifying 13,000+ objects into memory.
        // Save first 50 as lightweight recovery stub for localStorage,
        // while IndexedDB stores the full multi-thousand dataset.
        localStorage.setItem(STORAGE_KEYS.MAIN_ORDERS, JSON.stringify(orders.slice(0, 50)));
      }
    } catch (quotaErr) {
      console.warn('localStorage quota reached for Main Orders; stored safely in IndexedDB.', quotaErr);
    }
  },

  addMainOrder(order: MainOrder): void {
    const orders = this.getMainOrders();
    // Prevent duplicate order numbers
    const existingIndex = orders.findIndex((o) => o.orderNumber === order.orderNumber);
    if (existingIndex >= 0) {
      throw new Error(`Order Number ${order.orderNumber} already exists in the Main Orders register.`);
    }
    orders.unshift(order);
    this.saveMainOrders(orders);

    // Update nextOrderNumber in settings if equal or greater
    const settings = this.getSettings();
    if (order.orderNumber >= settings.nextOrderNumber) {
      settings.nextOrderNumber = order.orderNumber + 1;
      this.saveSettings(settings);
    }
  },

  updateMainOrder(updatedOrder: MainOrder, originalOrderNumber?: number): void {
    const orders = this.getMainOrders();
    const targetNumber = originalOrderNumber ?? updatedOrder.orderNumber;
    const idx = orders.findIndex((o) => o.orderNumber === targetNumber);
    if (idx >= 0) {
      // If orderNumber was modified, ensure it does not collide with another order
      if (originalOrderNumber && originalOrderNumber !== updatedOrder.orderNumber) {
        const duplicate = orders.find((o) => o.orderNumber === updatedOrder.orderNumber);
        if (duplicate) {
          throw new Error(`Order Number #${updatedOrder.orderNumber} already exists in the register.`);
        }
      }
      updatedOrder.updatedDate = new Date().toISOString();
      orders[idx] = updatedOrder;
      this.saveMainOrders(orders);
    }
  },

  deleteMainOrder(orderNumber: number): void {
    const orders = this.getMainOrders();
    const filtered = orders.filter((o) => o.orderNumber !== orderNumber);
    this.saveMainOrders(filtered);
  },

  deleteMainOrders(orderNumbers: number[]): void {
    const toRemove = new Set(orderNumbers);
    const orders = this.getMainOrders();
    const filtered = orders.filter((o) => !toRemove.has(o.orderNumber));
    this.saveMainOrders(filtered);
  },

  getOrder(orderNumber: number): MainOrder | null {
    const orders = this.getMainOrders();
    return orders.find((o) => o.orderNumber === orderNumber) || null;
  },

  // --- Settings ---
  getSettings(): SystemSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const defaults: SystemSettings = {
      startingOrderNumber: 1250,
      nextOrderNumber: 1250,
      agencies: INITIAL_AGENCIES,
      maintenanceTypes: [
        'Preventive Maintenance',
        'Corrective Maintenance',
        'Tire Change',
        'Accident',
      ],
      templateMapping: DEFAULT_TEMPLATE_MAPPING,
      templateFileName: 'Official_Job_Order_Template.xlsx',
      centralRecipientEmail: 'mohamed.ahmed39675@gmail.com',
      sendToCentralEmail: true,
      sendToEmployee: true,
      emailSubjectPattern: '{carNumber}',
      googleSpreadsheetId: '',
      googleSpreadsheetUrl: '',
      lastCloudSyncTimestamp: '',
      autoCloudSync: true,
    };

    if (!raw) {
      this.saveSettings(defaults);
      return defaults;
    }
    try {
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  },

  saveSettings(settings: SystemSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  updateSettings(partial: Partial<SystemSettings>): SystemSettings {
    const current = this.getSettings();
    const updated = { ...current, ...partial };
    this.saveSettings(updated);
    return updated;
  },

  getNextOrderNumber(): number {
    const settings = this.getSettings();
    const orders = this.getMainOrders();
    const maxExisting = orders.reduce((max, o) => Math.max(max, o.orderNumber), 0);
    const candidate = Math.max(settings.nextOrderNumber, settings.startingOrderNumber, maxExisting + 1);
    return candidate;
  },

  // --- Official Job Order Template Storage ---
  async getOfficialTemplateBuffer(): Promise<ArrayBuffer> {
    const base64 = localStorage.getItem(STORAGE_KEYS.TEMPLATE_BASE64);
    if (base64) {
      try {
        return base64ToBuffer(base64);
      } catch (err) {
        console.warn('Failed to parse saved template base64, regenerating default:', err);
      }
    }

    // Generate factory default baseline template
    const defaultBuffer = await createOfficialBaselineTemplate();
    const newBase64 = bufferToBase64(defaultBuffer);
    localStorage.setItem(STORAGE_KEYS.TEMPLATE_BASE64, newBase64);
    return defaultBuffer;
  },

  saveOfficialTemplate(buffer: ArrayBuffer, fileName: string): void {
    const base64 = bufferToBase64(buffer);
    localStorage.setItem(STORAGE_KEYS.TEMPLATE_BASE64, base64);
    const settings = this.getSettings();
    settings.templateFileName = fileName;
    this.saveSettings(settings);
  },

  async resetOfficialTemplateToDefault(): Promise<ArrayBuffer> {
    const defaultBuffer = await createOfficialBaselineTemplate();
    const base64 = bufferToBase64(defaultBuffer);
    localStorage.setItem(STORAGE_KEYS.TEMPLATE_BASE64, base64);
    const settings = this.getSettings();
    settings.templateFileName = 'Official_Job_Order_Template.xlsx';
    settings.templateMapping = DEFAULT_TEMPLATE_MAPPING;
    this.saveSettings(settings);
    return defaultBuffer;
  },

  // --- Audit History Helper ---
  appendAuditLog(
    orderNumber: number,
    action: string,
    details?: string,
    user: string = 'Fleet Coordinator'
  ): void {
    const orders = this.getMainOrders();
    const order = orders.find((o) => o.orderNumber === orderNumber);
    if (!order) return;

    const entry: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action,
      user,
      timestamp: new Date().toISOString(),
      orderNumber,
      details,
    };

    if (!order.auditHistory) order.auditHistory = [];
    order.auditHistory.push(entry);
    order.updatedDate = new Date().toISOString();
    this.saveMainOrders(orders);
  },
};
