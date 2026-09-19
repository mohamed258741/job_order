export interface FMSVehicleRecord {
  carCode: string;
  carNumber: string;
  chassisNumber: string;
  motorNumber: string;
  make: string;
  model: string;
  year: number | string;
  employeeName: string;
  staffId: string;
  employeeEmail: string;
  [key: string]: any;
}

export type MaintenanceType =
  | 'Preventive Maintenance'
  | 'Corrective Maintenance'
  | 'Tire Change'
  | 'Accident';

export const MAINTENANCE_TYPES: MaintenanceType[] = [
  'Preventive Maintenance',
  'Corrective Maintenance',
  'Tire Change',
  'Accident',
];

export type OrderStatus =
  | 'Request Received'
  | 'Job Order Created'
  | 'Sent to Employee'
  | 'Completed'
  | 'Closed';

export const ORDER_STATUSES: OrderStatus[] = [
  'Request Received',
  'Job Order Created',
  'Sent to Employee',
  'Completed',
  'Closed',
];

export type EmailStatus = 'Not Sent' | 'Sent' | 'Failed';

export interface AuditLogEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  orderNumber: number;
  details?: string;
}

export interface MainOrder {
  orderNumber: number;
  date: string;
  carCode: string;
  carNumber: string;
  chassisNumber: string;
  motorNumber: string;
  make: string;
  model: string;
  year: number | string;
  employeeName: string;
  staffId: string;
  employeeEmail: string;
  mileage: number;
  agency: string;
  maintenanceType: MaintenanceType;
  maintenanceDetails: string;
  jobOrderExcelPath: string;
  jobOrderPdfPath: string;
  excelBase64?: string;
  pdfBase64?: string;
  emailStatus: EmailStatus;
  emailDate?: string;
  emailFailureReason?: string;
  status: OrderStatus;
  createdDate: string;
  updatedDate: string;
  fmsSnapshot: Partial<FMSVehicleRecord>;
  auditHistory: AuditLogEntry[];
}

export interface FieldMapping {
  sheet: string;
  cell: string;
  label: string;
}

export type TemplateMapping = Record<string, FieldMapping>;

export interface SystemSettings {
  startingOrderNumber: number;
  nextOrderNumber: number;
  agencies: string[];
  maintenanceTypes: MaintenanceType[];
  templateMapping: TemplateMapping;
  templateFileName: string;
  templateBase64?: string;
  // Gmail integration & dispatch configuration
  centralRecipientEmail?: string;
  sendToCentralEmail?: boolean;
  sendToEmployee?: boolean;
  emailSubjectPattern?: string; // Default "{carNumber}" as requested
  // Google Sheets & Drive Cloud Sync configuration
  googleSpreadsheetId?: string;
  googleSpreadsheetUrl?: string;
  lastCloudSyncTimestamp?: string;
  autoCloudSync?: boolean;
}

export type ActiveTab =
  | 'dashboard'
  | 'new-order'
  | 'main-orders'
  | 'fms-upload'
  | 'settings';
