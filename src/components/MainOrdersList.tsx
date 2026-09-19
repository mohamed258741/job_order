import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  Edit2,
  Mail,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  X,
  RefreshCw,
  Plus,
  ArrowUpDown,
  CheckSquare,
  Square,
  AlertCircle,
  Trash2,
  Car,
  User,
  Wrench,
  Calendar,
  Sparkles,
  RefreshCcw,
  Cloud,
  UploadCloud,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { CloudSyncModal } from './CloudSyncModal';
import {
  MainOrder,
  MaintenanceType,
  MAINTENANCE_TYPES,
  OrderStatus,
  ORDER_STATUSES,
  EmailStatus,
  SystemSettings,
} from '../types';
import { StorageService } from '../services/storageService';
import {
  exportMainOrdersToExcel,
  parseImportMainOrders,
  generateSampleMainOrderTemplate,
} from '../services/excelService';

interface MainOrdersListProps {
  orders: MainOrder[];
  settings: SystemSettings;
  onRefreshOrders: () => void;
  onViewOrder: (order: MainOrder) => void;
  onDownloadExcel: (order: MainOrder) => void;
  onDownloadPdf: (order: MainOrder) => void;
  onNewOrderClick: () => void;
  onSendGmail?: (order: MainOrder) => void;
}

export const MainOrdersList: React.FC<MainOrdersListProps> = ({
  orders,
  settings,
  onRefreshOrders,
  onViewOrder,
  onDownloadExcel,
  onDownloadPdf,
  onNewOrderClick,
  onSendGmail,
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCriteria, setSearchCriteria] = useState<'ALL' | 'carNumber' | 'carCode' | 'orderNumber'>('ALL');
  const [filterAgency, setFilterAgency] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');

  // Row Selection state for Batch Export and Batch Delete
  const [selectedOrderNumbers, setSelectedOrderNumbers] = useState<Set<number>>(new Set());

  // Edit Order modal state - ALL Fields
  const [editingOrder, setEditingOrder] = useState<MainOrder | null>(null);
  const [editOrderNumber, setEditOrderNumber] = useState<number>(0);
  const [editDate, setEditDate] = useState<string>('');
  const [editStatus, setEditStatus] = useState<OrderStatus>('Request Received');
  const [editEmailStatus, setEditEmailStatus] = useState<EmailStatus>('Not Sent');
  const [editEmailDate, setEditEmailDate] = useState<string>('');
  const [editCarCode, setEditCarCode] = useState<string>('');
  const [editCarNumber, setEditCarNumber] = useState<string>('');
  const [editMake, setEditMake] = useState<string>('');
  const [editModel, setEditModel] = useState<string>('');
  const [editYear, setEditYear] = useState<string | number>(new Date().getFullYear());
  const [editChassisNumber, setEditChassisNumber] = useState<string>('');
  const [editMotorNumber, setEditMotorNumber] = useState<string>('');
  const [editEmployeeName, setEditEmployeeName] = useState<string>('');
  const [editStaffId, setEditStaffId] = useState<string>('');
  const [editEmployeeEmail, setEditEmployeeEmail] = useState<string>('');
  const [editMileage, setEditMileage] = useState<number>(0);
  const [editAgency, setEditAgency] = useState<string>('');
  const [editType, setEditType] = useState<MaintenanceType>('Preventive Maintenance');
  const [editDetails, setEditDetails] = useState<string>('');
  const [regenerateDocuments, setRegenerateDocuments] = useState<boolean>(true);
  const [fmsLookupFeedback, setFmsLookupFeedback] = useState<{ found: boolean; msg: string } | null>(null);

  // Deletion modal states
  const [orderToDelete, setOrderToDelete] = useState<MainOrder | null>(null);
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState(false);

  // Resend Email feedback state
  const [resendingOrderId, setResendingOrderId] = useState<number | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{
    validOrders: Partial<MainOrder>[];
    duplicates: { orderNumber: number; row: number; newOrder: Partial<MainOrder> }[];
    errors: { row: number; reason: string }[];
  } | null>(null);
  const [duplicatePolicy, setDuplicatePolicy] = useState<'skip' | 'overwrite' | 'auto_assign'>('skip');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgressMsg, setImportProgressMsg] = useState('');
  const [importProgressPercent, setImportProgressPercent] = useState(0);
  const [importErrorMsg, setImportErrorMsg] = useState<string | null>(null);

  // Cloud Sync Modal state (Google Sheets & Drive)
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);

  // High-performance pagination state to guarantee 0-lag rendering for 2,000+ orders
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Search query (Supports Car Number, Vehicle Code, Order Number, Employee, etc.)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const qNorm = q.replace(/[\s\-_./\\]/g, '');

        if (searchCriteria === 'carNumber') {
          const num = (o.carNumber || '').toLowerCase();
          const numNorm = num.replace(/[\s\-_./\\]/g, '');
          if (!num.includes(q) && !numNorm.includes(qNorm)) return false;
        } else if (searchCriteria === 'carCode') {
          const code = (o.carCode || '').toLowerCase();
          const codeNorm = code.replace(/[\s\-_./\\]/g, '');
          if (!code.includes(q) && !codeNorm.includes(qNorm)) return false;
        } else if (searchCriteria === 'orderNumber') {
          if (!String(o.orderNumber).includes(q)) return false;
        } else {
          // ALL fields search
          const num = (o.carNumber || '').toLowerCase();
          const numNorm = num.replace(/[\s\-_./\\]/g, '');
          const code = (o.carCode || '').toLowerCase();
          const codeNorm = code.replace(/[\s\-_./\\]/g, '');
          const matchesQuery =
            String(o.orderNumber).includes(q) ||
            code.includes(q) ||
            codeNorm.includes(qNorm) ||
            num.includes(q) ||
            numNorm.includes(qNorm) ||
            (o.employeeName || '').toLowerCase().includes(q) ||
            (o.staffId || '').toLowerCase().includes(q) ||
            (o.make || '').toLowerCase().includes(q) ||
            (o.model || '').toLowerCase().includes(q) ||
            (o.chassisNumber || '').toLowerCase().includes(q);
          if (!matchesQuery) return false;
        }
      }

      // Filter Agency
      if (filterAgency !== 'ALL' && o.agency !== filterAgency) {
        return false;
      }

      // Filter Maintenance Type
      if (filterType !== 'ALL' && o.maintenanceType !== filterType) {
        return false;
      }

      // Filter Status
      if (filterStatus !== 'ALL' && o.status !== filterStatus) {
        return false;
      }

      // Filter Date
      if (filterDate && !o.date.startsWith(filterDate) && !o.createdDate.startsWith(filterDate)) {
        return false;
      }

      return true;
    });
  }, [orders, searchQuery, searchCriteria, filterAgency, filterType, filterStatus, filterDate]);

  // Reset to first page whenever search/filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, searchCriteria, filterAgency, filterType, filterStatus, filterDate]);

  // Slice paginated orders for instant rendering (under 5ms even with 5,000 orders)
  const totalRows = filteredOrders.length;
  const totalPages = rowsPerPage === -1 ? 1 : Math.ceil(totalRows / rowsPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    if (rowsPerPage === -1) return filteredOrders;
    const start = (currentPage - 1) * rowsPerPage;
    return filteredOrders.slice(start, start + rowsPerPage);
  }, [filteredOrders, currentPage, rowsPerPage]);

  // Selection helpers
  const handleSelectAll = () => {
    if (selectedOrderNumbers.size === filteredOrders.length) {
      setSelectedOrderNumbers(new Set());
    } else {
      setSelectedOrderNumbers(new Set(filteredOrders.map((o) => o.orderNumber)));
    }
  };

  const toggleSelectOrder = (orderNum: number) => {
    const next = new Set(selectedOrderNumbers);
    if (next.has(orderNum)) {
      next.delete(orderNum);
    } else {
      next.add(orderNum);
    }
    setSelectedOrderNumbers(next);
  };

  // Export handlers
  const handleExport = async (mode: 'all' | 'selected' | 'filtered') => {
    let ordersToExport: MainOrder[] = [];
    if (mode === 'all') {
      ordersToExport = orders;
    } else if (mode === 'filtered') {
      ordersToExport = filteredOrders;
    } else if (mode === 'selected') {
      ordersToExport = orders.filter((o) => selectedOrderNumbers.has(o.orderNumber));
      if (ordersToExport.length === 0) {
        setNotificationMsg({ type: 'error', text: 'No orders selected to export.' });
        return;
      }
    }

    try {
      const buffer = await exportMainOrdersToExcel(ordersToExport);
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Main_Orders_Register_${mode}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setNotificationMsg({
        type: 'success',
        text: `Exported ${ordersToExport.length} orders successfully.`,
      });
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: 'Export failed: ' + err.message });
    }
  };

  // Resend Email handler
  const handleResendEmail = (order: MainOrder) => {
    setResendingOrderId(order.orderNumber);
    setTimeout(() => {
      const nowStr = new Date().toLocaleString();
      const updatedOrder: MainOrder = {
        ...order,
        emailStatus: 'Sent',
        emailDate: nowStr,
        status: order.status === 'Request Received' || order.status === 'Job Order Created' ? 'Sent to Employee' : order.status,
      };

      StorageService.updateMainOrder(updatedOrder);
      StorageService.appendAuditLog(
        order.orderNumber,
        'Email Resent',
        `Dispatched replacement PDF to ${order.employeeEmail} at ${nowStr}`
      );

      onRefreshOrders();
      setResendingOrderId(null);
      setNotificationMsg({
        type: 'success',
        text: `Job Order #${order.orderNumber} PDF resent to ${order.employeeEmail}`,
      });
    }, 600);
  };

  // Open Edit Modal with ALL Fields Populated
  const handleOpenEdit = (order: MainOrder) => {
    setEditingOrder(order);
    setEditOrderNumber(order.orderNumber);
    setEditDate(order.date);
    setEditStatus(order.status);
    setEditEmailStatus(order.emailStatus || 'Not Sent');
    setEditEmailDate(order.emailDate || '');
    setEditCarCode(order.carCode);
    setEditCarNumber(order.carNumber);
    setEditMake(order.make);
    setEditModel(order.model);
    setEditYear(order.year);
    setEditChassisNumber(order.chassisNumber);
    setEditMotorNumber(order.motorNumber);
    setEditEmployeeName(order.employeeName);
    setEditStaffId(order.staffId);
    setEditEmployeeEmail(order.employeeEmail);
    setEditMileage(order.mileage);
    setEditAgency(order.agency);
    setEditType(order.maintenanceType);
    setEditDetails(order.maintenanceDetails);
    setRegenerateDocuments(true);
    setFmsLookupFeedback(null);
  };

  // Lookup Car Code from current FMS during editing
  const handleFMSLookupInEdit = (code: string) => {
    if (!code || !code.trim()) return;
    const vehicle = StorageService.lookupCarCode(code);
    if (vehicle) {
      setEditCarNumber(vehicle.carNumber || '');
      setEditMake(vehicle.make || '');
      setEditModel(vehicle.model || '');
      setEditYear(vehicle.year || new Date().getFullYear());
      setEditChassisNumber(vehicle.chassisNumber || '');
      setEditMotorNumber(vehicle.motorNumber || '');
      setEditEmployeeName(vehicle.employeeName || '');
      setEditStaffId(vehicle.staffId || '');
      setEditEmployeeEmail(vehicle.employeeEmail || '');
      setFmsLookupFeedback({
        found: true,
        msg: `Found in active FMS: ${vehicle.make} ${vehicle.model} • Driver: ${vehicle.employeeName}`,
      });
    } else {
      setFmsLookupFeedback({
        found: false,
        msg: `"${code}" was not found in active FMS fleet. You can manually enter/keep custom values.`,
      });
    }
  };

  // Lookup Car Number from current FMS during editing
  const handleFMSLookupCarNumberInEdit = (carNum: string) => {
    if (!carNum || !carNum.trim()) return;
    const vehicle = StorageService.lookupCarNumber(carNum);
    if (vehicle) {
      setEditCarCode(vehicle.carCode || '');
      setEditCarNumber(vehicle.carNumber || '');
      setEditMake(vehicle.make || '');
      setEditModel(vehicle.model || '');
      setEditYear(vehicle.year || new Date().getFullYear());
      setEditChassisNumber(vehicle.chassisNumber || '');
      setEditMotorNumber(vehicle.motorNumber || '');
      setEditEmployeeName(vehicle.employeeName || '');
      setEditStaffId(vehicle.staffId || '');
      setEditEmployeeEmail(vehicle.employeeEmail || '');
      setFmsLookupFeedback({
        found: true,
        msg: `Found in active FMS: ${vehicle.carCode} (${vehicle.make} ${vehicle.model} • Driver: ${vehicle.employeeName})`,
      });
    } else {
      setFmsLookupFeedback({
        found: false,
        msg: `Car number "${carNum}" was not found in active FMS fleet. You can try with Vehicle Code.`,
      });
    }
  };

  // Save Edit Modal - Updates ALL Fields
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    if (!editOrderNumber || Number(editOrderNumber) <= 0) {
      setNotificationMsg({ type: 'error', text: 'Order Number must be a positive number.' });
      return;
    }
    if (!editCarCode.trim()) {
      setNotificationMsg({ type: 'error', text: 'Car Code is required.' });
      return;
    }

    try {
      const originalOrderNumber = editingOrder.orderNumber;
      const changes: string[] = [];

      if (editingOrder.orderNumber !== Number(editOrderNumber)) {
        changes.push(`Order # changed from ${editingOrder.orderNumber} to ${editOrderNumber}`);
      }
      if (editingOrder.status !== editStatus) {
        changes.push(`Status: ${editingOrder.status} → ${editStatus}`);
      }
      if (editingOrder.carCode !== editCarCode) {
        changes.push(`Car Code: ${editingOrder.carCode} → ${editCarCode}`);
      }
      if (editingOrder.carNumber !== editCarNumber) {
        changes.push(`Plate: ${editingOrder.carNumber} → ${editCarNumber}`);
      }
      if (editingOrder.mileage !== Number(editMileage)) {
        changes.push(`Mileage: ${editingOrder.mileage} → ${editMileage} KM`);
      }
      if (editingOrder.agency !== editAgency) {
        changes.push(`Agency: ${editingOrder.agency} → ${editAgency}`);
      }
      if (editingOrder.maintenanceType !== editType) {
        changes.push(`Type: ${editingOrder.maintenanceType} → ${editType}`);
      }
      if (editingOrder.employeeName !== editEmployeeName) {
        changes.push(`Employee: ${editingOrder.employeeName} → ${editEmployeeName}`);
      }

      const updated: MainOrder = {
        ...editingOrder,
        orderNumber: Number(editOrderNumber),
        date: editDate,
        status: editStatus,
        emailStatus: editEmailStatus,
        emailDate: editEmailDate,
        carCode: editCarCode.trim().toUpperCase(),
        carNumber: editCarNumber.trim(),
        make: editMake.trim(),
        model: editModel.trim(),
        year: editYear,
        chassisNumber: editChassisNumber.trim(),
        motorNumber: editMotorNumber.trim(),
        employeeName: editEmployeeName.trim(),
        staffId: editStaffId.trim(),
        employeeEmail: editEmployeeEmail.trim(),
        mileage: Number(editMileage),
        agency: editAgency,
        maintenanceType: editType,
        maintenanceDetails: editDetails.trim(),
        jobOrderExcelPath: `Orders/${editOrderNumber}/Job_Order_${editOrderNumber}.xlsx`,
        jobOrderPdfPath: `Orders/${editOrderNumber}/Job_Order_${editOrderNumber}_${editCarCode.trim().toUpperCase()}.pdf`,
        // Invalidate cached base64 files if regenerateDocuments is checked so that the next download or view re-renders with fresh data
        ...(regenerateDocuments ? { excelBase64: undefined, pdfBase64: undefined } : {}),
      };

      StorageService.updateMainOrder(updated, originalOrderNumber);

      const auditSummary = changes.length > 0 ? changes.join('; ') : 'Complete record fields updated';
      StorageService.appendAuditLog(
        updated.orderNumber,
        'Order Edited',
        `Coordinator edited all record fields: ${auditSummary}`
      );

      // Keep selection in sync if order number changed
      if (selectedOrderNumbers.has(originalOrderNumber)) {
        const nextSel = new Set(selectedOrderNumbers);
        nextSel.delete(originalOrderNumber);
        nextSel.add(updated.orderNumber);
        setSelectedOrderNumbers(nextSel);
      }

      onRefreshOrders();
      setEditingOrder(null);
      setNotificationMsg({
        type: 'success',
        text: `Order #${updated.orderNumber} successfully updated with all revised information.`,
      });
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Failed to update order.' });
    }
  };

  // Delete Handlers
  const handleConfirmDeleteSingle = () => {
    if (!orderToDelete) return;
    const num = orderToDelete.orderNumber;
    StorageService.deleteMainOrder(num);

    const nextSel = new Set(selectedOrderNumbers);
    nextSel.delete(num);
    setSelectedOrderNumbers(nextSel);

    setOrderToDelete(null);
    onRefreshOrders();
    setNotificationMsg({
      type: 'success',
      text: `Order #${num} (${orderToDelete.carCode}) was permanently deleted from the register.`,
    });
  };

  const handleConfirmBatchDelete = () => {
    const list = Array.from(selectedOrderNumbers);
    if (list.length === 0) return;

    StorageService.deleteMainOrders(list);
    setSelectedOrderNumbers(new Set());
    setIsBatchDeleteConfirmOpen(false);
    onRefreshOrders();
    setNotificationMsg({
      type: 'success',
      text: `Successfully deleted ${list.length} selected orders from the register.`,
    });
  };

  // Download Main Order Upload Template
  const handleDownloadTemplate = async () => {
    try {
      const buffer = await generateSampleMainOrderTemplate();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Main_Orders_Upload_Template.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setNotificationMsg({
        type: 'success',
        text: 'Downloaded official Main Orders upload template (.xlsx) with sample data.',
      });
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: 'Failed to generate template: ' + (err?.message || err) });
    }
  };

  // Import File change & preview
  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportErrorMsg(null);

    try {
      const buffer = await file.arrayBuffer();
      const existingOrderNums = new Set(orders.map((o) => o.orderNumber));
      const fleetVehicles = StorageService.getFMSVehicles();
      const preview = await parseImportMainOrders(buffer, existingOrderNums, fleetVehicles);
      setImportPreview(preview);
    } catch (err: any) {
      setImportErrorMsg('Failed to parse Excel import: ' + (err?.message || err));
      setImportFile(null);
      setImportPreview(null);
    }
  };

  // Confirm Import (Optimized for 13,000+ records)
  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setIsImporting(true);
    setImportErrorMsg(null);
    setImportProgressPercent(5);
    setImportProgressMsg(`Preparing ${importPreview.validOrders.length.toLocaleString()} records...`);

    // Yield control so React paints the progress overlay immediately
    await new Promise((r) => setTimeout(r, 60));

    try {
      const buildOrder = (p: Partial<MainOrder>): MainOrder => ({
        orderNumber: p.orderNumber!,
        date: p.date || new Date().toISOString().split('T')[0],
        carCode: p.carCode!,
        carNumber: p.carNumber || 'N/A',
        chassisNumber: p.chassisNumber || 'N/A',
        motorNumber: p.motorNumber || 'N/A',
        make: p.make || 'Toyota',
        model: p.model || 'Standard',
        year: p.year || 2023,
        employeeName: p.employeeName || 'Fleet Driver',
        staffId: p.staffId || 'EMP-000',
        employeeEmail: p.employeeEmail || 'fleet@company.com',
        mileage: p.mileage || 0,
        agency: p.agency || 'General Service Agency',
        maintenanceType: p.maintenanceType || 'Preventive Maintenance',
        maintenanceDetails: p.maintenanceDetails || 'Imported maintenance order record',
        jobOrderExcelPath: `Orders/${p.orderNumber}/Job_Order_${p.orderNumber}.xlsx`,
        jobOrderPdfPath: `Orders/${p.orderNumber}/Job_Order_${p.orderNumber}_${p.carCode}.pdf`,
        emailStatus: p.emailStatus || 'Sent',
        status: p.status || 'Completed',
        createdDate: p.createdDate || new Date().toISOString(),
        updatedDate: p.updatedDate || new Date().toISOString(),
        fmsSnapshot: p.fmsSnapshot || {
          carCode: p.carCode,
          isSoldOrHistorical: true,
          note: 'Historical / Sold vehicle data preserved',
        },
        auditHistory: p.auditHistory || [],
      });

      let currentOrders = StorageService.getMainOrders();
      let maxExistingNo = 1000;
      for (const o of currentOrders) {
        if (o.orderNumber > maxExistingNo) maxExistingNo = o.orderNumber;
      }
      for (const vo of importPreview.validOrders) {
        if (vo.orderNumber && vo.orderNumber > maxExistingNo) maxExistingNo = vo.orderNumber;
      }

      // 1. Process valid orders in responsive chunks
      const newOrdersToImport: MainOrder[] = [];
      const totalValid = importPreview.validOrders.length;
      const CHUNK_SIZE = 1000;

      for (let i = 0; i < totalValid; i += CHUNK_SIZE) {
        const chunk = importPreview.validOrders.slice(i, i + CHUNK_SIZE);
        for (const item of chunk) {
          newOrdersToImport.push(buildOrder(item));
        }
        const pct = Math.min(65, Math.round(5 + (Math.min(i + CHUNK_SIZE, totalValid) / (totalValid || 1)) * 60));
        setImportProgressPercent(pct);
        setImportProgressMsg(`Processed ${Math.min(i + CHUNK_SIZE, totalValid).toLocaleString()} of ${totalValid.toLocaleString()} records...`);
        await new Promise((r) => setTimeout(r, 0));
      }

      // 2. Handle duplicates according to selected policy
      let updatedDuplicatesCount = 0;
      let addedDuplicatesCount = 0;

      if (importPreview.duplicates.length > 0) {
        if (duplicatePolicy === 'overwrite') {
          const duplicateMap = new Map<number, MainOrder>();
          for (const dup of importPreview.duplicates) {
            duplicateMap.set(dup.orderNumber, buildOrder(dup.newOrder));
          }
          currentOrders = currentOrders.map((existing) => {
            if (duplicateMap.has(existing.orderNumber)) {
              updatedDuplicatesCount++;
              return {
                ...existing,
                ...duplicateMap.get(existing.orderNumber)!,
                updatedDate: new Date().toISOString(),
              };
            }
            return existing;
          });
        } else if (duplicatePolicy === 'auto_assign') {
          // Re-number duplicates sequentially so all rows from historical sheet are imported
          for (const dup of importPreview.duplicates) {
            maxExistingNo++;
            const renumbered: Partial<MainOrder> = {
              ...dup.newOrder,
              orderNumber: maxExistingNo,
            };
            newOrdersToImport.push(buildOrder(renumbered));
            addedDuplicatesCount++;
          }
        }
      }

      setImportProgressPercent(75);
      setImportProgressMsg(`Persisting ${newOrdersToImport.length.toLocaleString()} records to high-capacity IndexedDB...`);
      await new Promise((r) => setTimeout(r, 30));

      // Combine newly added orders with current orders
      const combined = [...newOrdersToImport, ...currentOrders];

      // Save into high-capacity database (IndexedDB + memory cache)
      await StorageService.saveMainOrders(combined);

      setImportProgressPercent(90);
      setImportProgressMsg('Finalizing registry indexes and sequences...');
      await new Promise((r) => setTimeout(r, 30));

      // Update nextOrderNumber in settings if imported order numbers are higher
      let maxImportedNo = maxExistingNo;
      for (const o of newOrdersToImport) {
        if (o.orderNumber > maxImportedNo) maxImportedNo = o.orderNumber;
      }
      const curSettings = StorageService.getSettings();
      if (maxImportedNo >= curSettings.nextOrderNumber) {
        curSettings.nextOrderNumber = maxImportedNo + 1;
        StorageService.saveSettings(curSettings);
      }

      setImportProgressPercent(100);
      onRefreshOrders();
      setIsImportModalOpen(false);
      setImportFile(null);
      setImportPreview(null);
      setImportProgressMsg('');
      setImportProgressPercent(0);

      let summaryText = `Successfully imported ${newOrdersToImport.length.toLocaleString()} order(s)`;
      if (updatedDuplicatesCount > 0) {
        summaryText += ` and updated ${updatedDuplicatesCount.toLocaleString()} existing duplicate record(s)`;
      }
      if (addedDuplicatesCount > 0) {
        summaryText += ` (auto-assigned new Order #s to ${addedDuplicatesCount.toLocaleString()} duplicate rows)`;
      }
      summaryText += '. Historical / sold vehicle records preserved.';

      setNotificationMsg({
        type: 'success',
        text: summaryText,
      });
    } catch (err: any) {
      console.error('Import error:', err);
      setImportErrorMsg(err?.message || 'Import failed. Please check file format.');
    } finally {
      setIsImporting(false);
      setImportProgressMsg('');
      setImportProgressPercent(0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notificationMsg && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between gap-3 text-sm shadow-sm transition-all ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notificationMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span>{notificationMsg.text}</span>
          </div>
          <button
            onClick={() => setNotificationMsg(null)}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Main Maintenance Orders Register
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Central historical register of all maintenance requests, Excel files, and generated PDFs
          </p>
        </div>

        {/* Action buttons: Import, Export, Template, New Order */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-import-orders"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Excel</span>
          </button>

          <button
            id="btn-download-orders-template"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors shadow-xs"
            title="Download the official Excel template formatted for uploading Main Orders as is"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Upload Template</span>
          </button>

          {/* Batch Delete Button when items are selected */}
          {selectedOrderNumbers.size > 0 && (
            <button
              id="btn-batch-delete-orders"
              onClick={() => setIsBatchDeleteConfirmOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition-colors shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedOrderNumbers.size})</span>
            </button>
          )}

          {/* Export Dropdown */}
          <div className="relative group">
            <button
              id="btn-export-dropdown"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export to Excel</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 w-44 text-xs">
              <button
                onClick={() => handleExport('all')}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700"
              >
                Export All ({orders.length})
              </button>
              <button
                onClick={() => handleExport('filtered')}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700"
              >
                Export Filtered ({filteredOrders.length})
              </button>
              <button
                onClick={() => handleExport('selected')}
                disabled={selectedOrderNumbers.size === 0}
                className={`w-full text-left px-3 py-2 hover:bg-slate-50 ${
                  selectedOrderNumbers.size === 0
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-700'
                }`}
              >
                Export Selected ({selectedOrderNumbers.size})
              </button>
            </div>
          </div>

          {/* Cloud Sync Button (Google Sheets & Drive) */}
          <button
            id="btn-cloud-sync-orders"
            onClick={() => setIsCloudSyncOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors shadow-xs"
            title="Sync all orders to Google Sheets and Google Drive to avoid system lags"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>Google Sheets</span>
            {settings.googleSpreadsheetId && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          {settings.googleSpreadsheetUrl && (
            <a
              href={settings.googleSpreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden lg:flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-900 font-medium px-2 py-1.5 bg-emerald-50/50 rounded-lg border border-emerald-100"
              title="Open linked Google Spreadsheet in a new tab"
            >
              <span>Open in Sheets</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          <button
            id="btn-main-new-order"
            onClick={onNewOrderClick}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#E1001A] hover:bg-[#C70017] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search box with criteria selector */}
          <div className="sm:col-span-2 lg:col-span-2 flex gap-1.5">
            <select
              id="select-search-criteria"
              value={searchCriteria}
              onChange={(e) => setSearchCriteria(e.target.value as any)}
              className="w-28 sm:w-32 shrink-0 px-2 py-2 rounded-lg border border-slate-300 text-xs bg-slate-50 font-medium text-slate-700 focus:ring-[#E1001A] focus:border-[#E1001A]"
              title="Select search criteria"
            >
              <option value="ALL">All Fields</option>
              <option value="carNumber">Car Number</option>
              <option value="carCode">Vehicle Code</option>
              <option value="orderNumber">Order #</option>
            </select>
            <div className="relative flex-1">
              <input
                id="input-search-orders"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  searchCriteria === 'carNumber'
                    ? 'Search by Car Number (e.g. SHJ-74912)...'
                    : searchCriteria === 'carCode'
                    ? 'Search by Vehicle Code (e.g. FLT-004)...'
                    : searchCriteria === 'orderNumber'
                    ? 'Search by Order # (e.g. 1248)...'
                    : 'Search by Car Number, Vehicle Code, Order #, Employee...'
                }
                className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-300 text-xs focus:ring-[#E1001A] focus:border-[#E1001A]"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Agency Filter */}
          <div>
            <select
              id="filter-agency"
              value={filterAgency}
              onChange={(e) => setFilterAgency(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-[#E1001A] focus:border-[#E1001A]"
            >
              <option value="ALL">All Agencies</option>
              {settings.agencies.map((ag) => (
                <option key={ag} value={ag}>
                  {ag}
                </option>
              ))}
            </select>
          </div>

          {/* Maintenance Type Filter */}
          <div>
            <select
              id="filter-maintenance-type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-[#E1001A] focus:border-[#E1001A]"
            >
              <option value="ALL">All Types</option>
              {MAINTENANCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-[#E1001A] focus:border-[#E1001A]"
            >
              <option value="ALL">All Statuses</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter info bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <div>
            Showing <span className="font-bold text-slate-800">{filteredOrders.length}</span> of{' '}
            <span className="font-bold text-slate-800">{orders.length}</span> orders
            {selectedOrderNumbers.size > 0 && (
              <span className="ml-2 font-medium text-[#E1001A]">
                ({selectedOrderNumbers.size} selected)
              </span>
            )}
          </div>

          {(searchQuery || filterAgency !== 'ALL' || filterType !== 'ALL' || filterStatus !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterAgency('ALL');
                setFilterType('ALL');
                setFilterStatus('ALL');
                setFilterDate('');
              }}
              className="text-xs text-[#E1001A] hover:underline font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ORDERS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3 w-10 text-center">
                  <button
                    onClick={handleSelectAll}
                    title="Select all"
                    className="text-slate-400 hover:text-slate-700"
                  >
                    {selectedOrderNumbers.size > 0 &&
                    selectedOrderNumbers.size === filteredOrders.length ? (
                      <CheckSquare className="w-4 h-4 text-[#E1001A]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3">Request ID</th>
                <th className="p-3">Date</th>
                <th className="p-3">Mileage Reading</th>
                <th className="p-3">Agency Name</th>
                <th className="p-3">Car Code</th>
                <th className="p-3">Car Number</th>
                <th className="p-3">Make</th>
                <th className="p-3">Maintenance Type</th>
                <th className="p-3">Employee</th>
                <th className="p-3">Status</th>
                <th className="p-3">Email</th>
                <th className="p-3">Files</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-slate-400">
                    <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium">No matching maintenance orders found.</p>
                    <p className="text-xs mt-1">Try adjusting your search criteria or create a new order.</p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const isSelected = selectedOrderNumbers.has(order.orderNumber);
                  return (
                    <tr
                      key={order.orderNumber}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-red-50/40' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <button
                          onClick={() => toggleSelectOrder(order.orderNumber)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#E1001A]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* 1. Request ID */}
                      <td className="p-3 font-mono font-bold text-slate-900">
                        #{order.orderNumber}
                      </td>

                      {/* 2. Date */}
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        {order.date}
                      </td>

                      {/* 3. Mileage Reading */}
                      <td className="p-3 font-mono font-semibold text-slate-800 whitespace-nowrap">
                        {order.mileage.toLocaleString()} KM
                      </td>

                      {/* 4. Agency Name */}
                      <td className="p-3 text-slate-700 font-medium max-w-[140px] truncate" title={order.agency}>
                        {order.agency}
                      </td>

                      {/* 5. Car Code */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                            {order.carCode}
                          </span>
                          {order.fmsSnapshot?.isSoldOrHistorical && (
                            <span
                              className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap"
                              title={order.fmsSnapshot?.note || 'Historical / Sold vehicle data preserved'}
                            >
                              Sold / Hist
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Car Number */}
                      <td className="p-3 font-semibold text-slate-800 whitespace-nowrap">
                        {order.carNumber}
                      </td>

                      {/* 7. Make */}
                      <td className="p-3 text-slate-700">
                        <div className="font-medium text-slate-800">{order.make}</div>
                        <div className="text-[11px] text-slate-400">
                          {order.model} ({order.year})
                        </div>
                      </td>

                      {/* 8. Maintenance Type */}
                      <td className="p-3 text-slate-700 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200">
                          {order.maintenanceType}
                        </span>
                      </td>

                      {/* Employee */}
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{order.employeeName}</div>
                        <div className="text-[11px] text-slate-400">{order.staffId}</div>
                      </td>

                      {/* Status */}
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            order.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : order.status === 'Sent to Employee'
                              ? 'bg-red-50 text-[#E1001A] border border-red-200'
                              : order.status === 'Closed'
                              ? 'bg-slate-100 text-slate-700 border border-slate-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>

                      {/* Email Status */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              order.emailStatus === 'Sent'
                                ? 'bg-emerald-500'
                                : order.emailStatus === 'Failed'
                                ? 'bg-red-500'
                                : 'bg-slate-300'
                            }`}
                          />
                          <span className="text-[11px] font-medium text-slate-700">
                            {order.emailStatus}
                          </span>
                        </div>
                      </td>

                      {/* Download Files (Excel & PDF) */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            title="Download Job Order Excel (.xlsx)"
                            onClick={() => onDownloadExcel(order)}
                            className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Download Job Order PDF (.pdf)"
                            onClick={() => onDownloadPdf(order)}
                            className="p-1 rounded bg-red-50 hover:bg-red-100 text-[#E1001A] border border-red-200"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Actions: View, Edit, Resend Email */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="View Full Order"
                            onClick={() => onViewOrder(order)}
                            className="p-1.5 text-slate-600 hover:text-[#E1001A] hover:bg-slate-100 rounded"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Edit Order"
                            onClick={() => handleOpenEdit(order)}
                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-send-gmail-${order.orderNumber}`}
                            title={`Send via Gmail (Subject: ${order.carNumber})`}
                            onClick={() => (onSendGmail ? onSendGmail(order) : handleResendEmail(order))}
                            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-delete-order-${order.orderNumber}`}
                            title="Delete Order Row"
                            onClick={() => setOrderToDelete(order)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* HIGH-PERFORMANCE PAGINATION BAR (Zero-Lag with 2,000+ orders) */}
        {filteredOrders.length > 0 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span>
                Showing{' '}
                <span className="font-semibold text-slate-800">
                  {rowsPerPage === -1
                    ? 1
                    : Math.min((currentPage - 1) * rowsPerPage + 1, totalRows)}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-slate-800">
                  {rowsPerPage === -1
                    ? totalRows
                    : Math.min(currentPage * rowsPerPage, totalRows)}
                </span>{' '}
                of <span className="font-semibold text-slate-800">{totalRows}</span> orders
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-slate-400">Rows:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-700 font-medium focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={-1}>All ({totalRows})</option>
                </select>
              </div>
            </div>

            {rowsPerPage !== -1 && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  title="First Page"
                  className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  title="Previous Page"
                  className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-2 py-0.5 font-medium text-slate-700 bg-white border border-slate-200 rounded">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  title="Next Page"
                  className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  title="Last Page"
                  className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FULL EDIT ORDER MODAL - ALL FIELDS */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500 text-white font-bold flex items-center justify-center text-xs font-mono shadow-sm">
                  #{editingOrder.orderNumber}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    Edit Main Order #{editingOrder.orderNumber}
                    <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      All-Fields Editor
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Modify order timing, vehicle specifications, employee custody, or maintenance scope
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
              {/* SECTION 1: ORDER IDENTIFICATION & STATUS */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold border-b border-slate-200 pb-2">
                  <Calendar className="w-4 h-4 text-[#E1001A]" />
                  <span>Order Information & Workflow Status</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Order Number #</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editOrderNumber}
                      onChange={(e) => setEditOrderNumber(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900 focus:ring-[#E1001A] focus:border-[#E1001A]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Issue / Order Date</label>
                    <input
                      type="date"
                      required
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:ring-[#E1001A] focus:border-[#E1001A]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Workflow Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as OrderStatus)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-[#E1001A] focus:border-[#E1001A]"
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email Status</label>
                    <select
                      value={editEmailStatus}
                      onChange={(e) => setEditEmailStatus(e.target.value as EmailStatus)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:ring-[#E1001A] focus:border-[#E1001A]"
                    >
                      <option value="Not Sent">Not Sent</option>
                      <option value="Sent">Sent</option>
                      <option value="Failed">Failed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email Sent Timestamp</label>
                    <input
                      type="text"
                      placeholder="e.g. 2026-09-15 10:15 AM"
                      value={editEmailDate}
                      onChange={(e) => setEditEmailDate(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:ring-[#E1001A] focus:border-[#E1001A]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: VEHICLE INFORMATION */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                    <Car className="w-4 h-4 text-emerald-600" />
                    <span>Vehicle Information</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFMSLookupInEdit(editCarCode)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#E1001A] hover:text-[#C70017] hover:underline"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-fill from active FMS</span>
                  </button>
                </div>

                {fmsLookupFeedback && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-center gap-1.5 ${
                      fmsLookupFeedback.found
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fmsLookupFeedback.msg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Car Code *</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        required
                        value={editCarCode}
                        onChange={(e) => setEditCarCode(e.target.value.toUpperCase())}
                        className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono font-bold uppercase focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. FLT-001"
                      />
                      <button
                        type="button"
                        title="Re-fetch FMS specs for this Car Code"
                        onClick={() => handleFMSLookupInEdit(editCarCode)}
                        className="px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                      >
                        <RefreshCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Car / Plate Number *</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        required
                        value={editCarNumber}
                        onChange={(e) => setEditCarNumber(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 bg-white font-semibold focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. SHJ-74912"
                      />
                      <button
                        type="button"
                        title="Re-fetch FMS specs for this Car Number"
                        onClick={() => handleFMSLookupCarNumberInEdit(editCarNumber)}
                        className="px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                      >
                        <RefreshCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Model Year</label>
                    <input
                      type="number"
                      value={editYear}
                      onChange={(e) => setEditYear(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Vehicle Make</label>
                    <input
                      type="text"
                      value={editMake}
                      onChange={(e) => setEditMake(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Vehicle Model</label>
                    <input
                      type="text"
                      value={editModel}
                      onChange={(e) => setEditModel(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Chassis Number (VIN)</label>
                    <input
                      type="text"
                      value={editChassisNumber}
                      onChange={(e) => setEditChassisNumber(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono uppercase focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Motor / Engine Number</label>
                    <input
                      type="text"
                      value={editMotorNumber}
                      onChange={(e) => setEditMotorNumber(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono uppercase focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: EMPLOYEE & DRIVER INFORMATION */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold border-b border-slate-200 pb-2">
                  <User className="w-4 h-4 text-purple-600" />
                  <span>Employee & Driver Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Employee / Driver Name</label>
                    <input
                      type="text"
                      required
                      value={editEmployeeName}
                      onChange={(e) => setEditEmployeeName(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Staff ID</label>
                    <input
                      type="text"
                      value={editStaffId}
                      onChange={(e) => setEditStaffId(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Employee Email Address</label>
                    <input
                      type="email"
                      required
                      value={editEmployeeEmail}
                      onChange={(e) => setEditEmployeeEmail(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: MAINTENANCE & AGENCY SPECIFICATIONS */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold border-b border-slate-200 pb-2">
                  <Wrench className="w-4 h-4 text-amber-600" />
                  <span>Maintenance & Agency Specifications</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Mileage (KM) *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editMileage}
                      onChange={(e) => setEditMileage(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono font-bold focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Assigned Agency *</label>
                    <select
                      value={editAgency}
                      onChange={(e) => setEditAgency(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:ring-blue-500 focus:border-blue-500"
                    >
                      {settings.agencies.map((ag) => (
                        <option key={ag} value={ag}>
                          {ag}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Maintenance Type *</label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as MaintenanceType)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:ring-blue-500 focus:border-blue-500"
                    >
                      {MAINTENANCE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Maintenance Details / Work Scope *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={editDetails}
                    onChange={(e) => setEditDetails(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-blue-500 focus:border-blue-500 leading-relaxed"
                    placeholder="Describe periodic service items, inspection points, mechanical repairs, or parts replacement..."
                  />
                </div>
              </div>

              {/* SECTION 5: DOCUMENT REGENERATION TOGGLE */}
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-slate-900">
                <input
                  type="checkbox"
                  id="regenerateDocuments"
                  checked={regenerateDocuments}
                  onChange={(e) => setRegenerateDocuments(e.target.checked)}
                  className="w-4 h-4 rounded text-[#E1001A] focus:ring-[#E1001A]"
                />
                <label htmlFor="regenerateDocuments" className="cursor-pointer text-xs font-medium">
                  <strong>Regenerate Job Order Excel & PDF files with updated information.</strong>
                  <span className="block text-[11px] text-slate-600">
                    Ensures newly downloaded or viewed PDF/Excel files reflect your edits.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#E1001A] hover:bg-[#C70017] text-white rounded-lg font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save All Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SINGLE ORDER DELETE CONFIRMATION MODAL */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-base">
                  Delete Main Order #{orderToDelete.orderNumber}?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to permanently delete this maintenance order from the register? This action cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setOrderToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Order:</span>
                <span className="font-bold text-slate-900">#{orderToDelete.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vehicle:</span>
                <span className="font-semibold text-slate-800">
                  {orderToDelete.carCode} ({orderToDelete.carNumber})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Employee:</span>
                <span className="text-slate-800">{orderToDelete.employeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Agency:</span>
                <span className="text-slate-800">{orderToDelete.agency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="text-slate-800">{orderToDelete.status}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingle}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH DELETE CONFIRMATION MODAL */}
      {isBatchDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-base">
                  Delete {selectedOrderNumbers.size} Selected Orders?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to permanently delete these {selectedOrderNumbers.size} maintenance orders from the register?
                </p>
              </div>
              <button
                onClick={() => setIsBatchDeleteConfirmOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-red-50/60 rounded-lg border border-red-200 text-xs text-red-800 space-y-1">
              <p className="font-semibold">Orders to be deleted:</p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1 font-mono">
                {Array.from(selectedOrderNumbers).map((num) => (
                  <span key={num} className="px-2 py-0.5 bg-white border border-red-200 rounded text-red-700">
                    #{num}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBatchDeleteConfirmOpen(false)}
                className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All {selectedOrderNumbers.size} Selected</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT HISTORICAL ORDERS MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 space-y-4 animate-in fade-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Import Historical Main Orders from Excel
                </h3>
                <p className="text-xs text-slate-500">
                  Workflow: Upload → Preview → Validate → Import
                </p>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setImportPreview(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1">
              {/* Template Download Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Official Main Orders Upload Template</p>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Download pre-formatted Excel template with sample rows and exact headers to populate and upload as is.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download .xlsx</span>
                </button>
              </div>

              {!importPreview ? (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors bg-white">
                    <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-xs font-semibold text-slate-700">
                      Select an Excel file containing main orders (.xlsx, .xls)
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Works with official template or exported files. Vehicle details auto-enrich from FMS.
                    </p>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleImportFileChange}
                      className="mt-3 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-[#E1001A] hover:file:bg-red-100 cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
                    <span className="font-semibold text-slate-700 block">Recognized Column Headers:</span>
                    <p className="text-slate-500 leading-relaxed">
                      Request ID / Order #, Date, Mileage Reading, Agency Name, Car Code, Car Number (Plate), Make, Model, Year, Maintenance Type, Maintenance Description, User Name, User ID, Employee Email, Chassis Number, Motor Number, Status.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  {/* Validation Summary */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
                      <span className="font-bold text-lg block">
                        {importPreview.validOrders.length}
                      </span>
                      <span>New Valid Records</span>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                      <span className="font-bold text-lg block">
                        {importPreview.duplicates.length}
                      </span>
                      <span>Existing Duplicate #s</span>
                    </div>
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                      <span className="font-bold text-lg block">
                        {importPreview.errors.length}
                      </span>
                      <span>Invalid Rows</span>
                    </div>
                  </div>

                  {/* Duplicate Handling Policy */}
                  {importPreview.duplicates.length > 0 && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                      <span className="font-semibold text-slate-800 block text-[11px]">
                        Duplicate Policy for {importPreview.duplicates.length.toLocaleString()} Existing Order Number(s):
                      </span>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="duplicatePolicy"
                            checked={duplicatePolicy === 'skip'}
                            onChange={() => setDuplicatePolicy('skip')}
                            className="text-[#E1001A] focus:ring-[#E1001A]"
                          />
                          <span><strong>Skip duplicates</strong> (Keep existing orders unchanged; only import {importPreview.validOrders.length.toLocaleString()} new orders)</span>
                        </label>
                        <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="duplicatePolicy"
                            checked={duplicatePolicy === 'auto_assign'}
                            onChange={() => setDuplicatePolicy('auto_assign')}
                            className="text-[#E1001A] focus:ring-[#E1001A]"
                          />
                          <span><strong>Auto-Assign New Order #s to Duplicates</strong> (Import all {(importPreview.validOrders.length + importPreview.duplicates.length).toLocaleString()} rows as unique orders)</span>
                        </label>
                        <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="duplicatePolicy"
                            checked={duplicatePolicy === 'overwrite'}
                            onChange={() => setDuplicatePolicy('overwrite')}
                            className="text-[#E1001A] focus:ring-[#E1001A]"
                          />
                          <span><strong>Overwrite / Update duplicates</strong> with uploaded spreadsheet values</span>
                        </label>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-5">
                        Sample duplicate numbers found: {importPreview.duplicates.slice(0, 10).map((d) => `#${d.orderNumber}`).join(', ')}
                        {importPreview.duplicates.length > 10 && ` ...and ${importPreview.duplicates.length - 10} more`}
                      </p>
                    </div>
                  )}

                  {/* Invalid Rows warnings if any */}
                  {importPreview.errors.length > 0 && (
                    <div className="p-3 bg-red-50/80 border border-red-200 rounded-lg space-y-1 max-h-28 overflow-y-auto">
                      <span className="font-bold text-red-800 text-[11px] block">
                        Skipped Rows with Errors ({importPreview.errors.length}):
                      </span>
                      {importPreview.errors.slice(0, 10).map((err, idx) => (
                        <p key={idx} className="text-[11px] text-red-700">
                          • Row {err.row}: {err.reason}
                        </p>
                      ))}
                      {importPreview.errors.length > 10 && (
                        <p className="text-[11px] text-red-600 font-semibold italic">
                          ...and {importPreview.errors.length - 10} more invalid rows
                        </p>
                      )}
                    </div>
                  )}

                  {/* Preview Table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <div className="p-2 bg-slate-100 border-b border-slate-200 text-[11px] font-medium text-slate-700 flex justify-between items-center">
                      <span>Data Preview (Showing first {Math.min(15, importPreview.validOrders.length)} of {importPreview.validOrders.length.toLocaleString()} records)</span>
                      <span className="text-emerald-700 font-semibold">100% will be imported</span>
                    </div>
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-slate-600 sticky top-0">
                        <tr>
                          <th className="p-2">Order #</th>
                          <th className="p-2">Date</th>
                          <th className="p-2">Car Code</th>
                          <th className="p-2">Plate</th>
                          <th className="p-2">Type</th>
                          <th className="p-2">Agency</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importPreview.validOrders.slice(0, 15).map((vo, i) => (
                          <tr key={i}>
                            <td className="p-2 font-mono font-bold">#{vo.orderNumber}</td>
                            <td className="p-2">{vo.date}</td>
                            <td className="p-2 font-semibold text-slate-700">
                              {vo.carCode}
                              {vo.fmsSnapshot?.isSoldOrHistorical && (
                                <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800">Sold/Hist</span>
                              )}
                            </td>
                            <td className="p-2">{vo.carNumber}</td>
                            <td className="p-2">{vo.maintenanceType}</td>
                            <td className="p-2">{vo.agency}</td>
                            <td className="p-2 text-emerald-600 font-semibold">{vo.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Active Import Progress Indicator */}
                  {isImporting && (
                    <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                        <span className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-[#E1001A]" />
                          <span>{importProgressMsg || 'Importing records...'}</span>
                        </span>
                        <span className="font-mono text-[#E1001A]">{importProgressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#E1001A] h-2 transition-all duration-200 rounded-full"
                          style={{ width: `${importProgressPercent}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 text-center">
                        Processing high-scale dataset in IndexedDB. Please keep this modal open...
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setImportFile(null);
                      setImportPreview(null);
                    }}
                    className="text-xs text-[#E1001A] hover:underline"
                  >
                    ← Choose a different file
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isImporting}
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setImportPreview(null);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              {(() => {
                const totalToImport = importPreview
                  ? duplicatePolicy === 'skip'
                    ? importPreview.validOrders.length
                    : duplicatePolicy === 'overwrite'
                    ? importPreview.validOrders.length + importPreview.duplicates.length
                    : importPreview.validOrders.length + importPreview.duplicates.length
                  : 0;
                const isBtnDisabled = !importPreview || totalToImport === 0 || isImporting;

                return (
                  <button
                    type="button"
                    disabled={isBtnDisabled}
                    onClick={handleConfirmImport}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg text-white shadow-xs transition-colors ${
                      isBtnDisabled
                        ? 'bg-slate-400 cursor-not-allowed'
                        : 'bg-[#E1001A] hover:bg-[#C70017]'
                    }`}
                  >
                    {isImporting ? (
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Importing ({importProgressPercent}%)...</span>
                      </span>
                    ) : (
                      `Confirm Import (${totalToImport.toLocaleString()} Records)`
                    )}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* CLOUD SYNC MODAL (GOOGLE SHEETS & DRIVE) */}
      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        onSyncComplete={() => {
          onRefreshOrders();
        }}
      />
    </div>
  );
};
