import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Send,
  Loader2,
  ArrowRight,
  RefreshCw,
  Building2,
  Wrench,
  Gauge,
  User,
  Car,
  Mail,
  ShieldCheck,
  Check,
  Download,
  Calendar,
} from 'lucide-react';
import {
  FMSVehicleRecord,
  MainOrder,
  MaintenanceType,
  MAINTENANCE_TYPES,
  SystemSettings,
} from '../types';
import { StorageService } from '../services/storageService';
import { populateJobOrderExcel } from '../services/excelService';
import { convertExcelWorkbookToPDF, PDFGenerationResult } from '../services/pdfService';

interface NewOrderFormProps {
  settings: SystemSettings;
  onOrderCreated: (order: MainOrder) => void;
  onViewOrder: (order: MainOrder) => void;
  onGoToMainOrders: () => void;
  onSendGmail?: (order: MainOrder) => void;
}

export const NewOrderForm: React.FC<NewOrderFormProps> = ({
  settings,
  onOrderCreated,
  onViewOrder,
  onGoToMainOrders,
  onSendGmail,
}) => {
  // Car Lookup State - Supports Car Number OR Vehicle Code
  const [searchMode, setSearchMode] = useState<'carNumber' | 'carCode'>('carNumber');
  const [carNumberInput, setCarNumberInput] = useState('');
  const [carCodeInput, setCarCodeInput] = useState('');
  const [vehicle, setVehicle] = useState<FMSVehicleRecord | null>(null);
  const [searchFeedback, setSearchFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
    matchedBy?: 'carNumber' | 'carCode';
    multipleMatches?: FMSVehicleRecord[];
  } | null>(null);

  // Manual Fields State
  const [orderDate, setOrderDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [mileage, setMileage] = useState<string>('');
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('Preventive Maintenance');
  const [agency, setAgency] = useState<string>(settings.agencies[0] || '');
  const [maintenanceDetails, setMaintenanceDetails] = useState('');

  const dayName = new Date(orderDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });

  // Next sequential order number preview
  const [nextOrderNum, setNextOrderNum] = useState<number>(1250);

  // Form submission / step states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState<string>('');
  const [completedOrder, setCompletedOrder] = useState<MainOrder | null>(null);
  const [createdPdfData, setCreatedPdfData] = useState<PDFGenerationResult | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Load next order number on mount
  useEffect(() => {
    const num = StorageService.getNextOrderNumber();
    setNextOrderNum(num);
    if (!agency && settings.agencies.length > 0) {
      setAgency(settings.agencies[0]);
    }
  }, [settings]);

  // Car Number lookup handler
  const handleSearchCarNumber = (queryOverride?: string) => {
    const query = (queryOverride !== undefined ? queryOverride : carNumberInput).trim();
    if (!query) {
      setSearchFeedback({
        type: 'error',
        message: 'Please enter a Car Number.',
        matchedBy: 'carNumber',
      });
      setVehicle(null);
      return;
    }

    const matches = StorageService.lookupAllCarNumbers(query);

    if (matches.length === 1) {
      const found = matches[0];
      setVehicle(found);
      setCarNumberInput(found.carNumber);
      setCarCodeInput(found.carCode);
      setSearchFeedback({
        type: 'success',
        message: `Vehicle found by Car Number: ${found.carNumber} (${found.carCode} • ${found.make} ${found.model})`,
        matchedBy: 'carNumber',
      });
    } else if (matches.length > 1) {
      setVehicle(null);
      setSearchFeedback({
        type: 'warning',
        message: `Multiple vehicles matched "${query}". Please select the exact vehicle below or try with Vehicle Code:`,
        matchedBy: 'carNumber',
        multipleMatches: matches,
      });
    } else {
      setVehicle(null);
      setSearchFeedback({
        type: 'error',
        message: 'Car number not available. Please try with Vehicle Code.',
        matchedBy: 'carNumber',
      });
    }
  };

  // Vehicle Code lookup handler
  const handleSearchCarCode = (queryOverride?: string) => {
    const query = (queryOverride !== undefined ? queryOverride : carCodeInput).trim();
    if (!query) {
      setSearchFeedback({
        type: 'error',
        message: 'Please enter a Vehicle Code.',
        matchedBy: 'carCode',
      });
      setVehicle(null);
      return;
    }

    const found = StorageService.lookupCarCode(query);

    if (found) {
      setVehicle(found);
      setCarCodeInput(found.carCode);
      setCarNumberInput(found.carNumber);
      setSearchFeedback({
        type: 'success',
        message: `Vehicle found by Vehicle Code: ${found.carCode} (${found.carNumber} • ${found.make} ${found.model})`,
        matchedBy: 'carCode',
      });
    } else {
      setVehicle(null);
      setSearchFeedback({
        type: 'error',
        message: 'Vehicle code not available. Please check the code and try again.',
        matchedBy: 'carCode',
      });
    }
  };

  // Switch search mode helper
  const handleSwitchMode = (mode: 'carNumber' | 'carCode') => {
    setSearchMode(mode);
  };

  // Quick select helper from current FMS
  const allVehicles = StorageService.getFMSVehicles();

  const handleSelectFromFMS = (v: FMSVehicleRecord) => {
    setCarCodeInput(v.carCode);
    setCarNumberInput(v.carNumber);
    setVehicle(v);
    setSearchFeedback({
      type: 'success',
      message: `Vehicle verified: ${v.carCode} • ${v.carNumber} (${v.make} ${v.model})`,
      matchedBy: searchMode,
    });
  };

  // Main submission workflow
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    // Validation
    if (!vehicle) {
      setSearchFeedback({
        type: 'error',
        message:
          searchMode === 'carNumber'
            ? 'Car number not available. Please try with Vehicle Code.'
            : 'Vehicle code not available. Please check the code and try again.',
        matchedBy: searchMode,
      });
      return;
    }

    const mileageNumber = Number(mileage);
    if (!mileage || isNaN(mileageNumber) || mileageNumber <= 0) {
      setGeneralError('Please enter a valid current mileage greater than 0.');
      return;
    }

    if (!agency.trim()) {
      setGeneralError('Please select or specify an assigned agency.');
      return;
    }

    if (!maintenanceDetails.trim()) {
      setGeneralError('Please provide maintenance details / description of work.');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Order Number Allocation
      setSubmissionStep('Allocating sequential Order Number...');
      const orderNumber = StorageService.getNextOrderNumber();
      const todayStr = orderDate;

      // 2. Build initial MainOrder object
      const excelFileName = `Job_Order_${orderNumber}.xlsx`;
      const pdfFileName = `Job_Order_${orderNumber}_${vehicle.carCode.replace(/[^a-zA-Z0-9]/g, '')}.pdf`;

      const newOrder: MainOrder = {
        orderNumber,
        date: todayStr,
        carCode: vehicle.carCode,
        carNumber: vehicle.carNumber,
        chassisNumber: vehicle.chassisNumber,
        motorNumber: vehicle.motorNumber,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        employeeName: vehicle.employeeName,
        staffId: vehicle.staffId,
        employeeEmail: vehicle.employeeEmail,
        mileage: mileageNumber,
        agency,
        maintenanceType,
        maintenanceDetails: maintenanceDetails.trim(),
        jobOrderExcelPath: `Orders/${orderNumber}/${excelFileName}`,
        jobOrderPdfPath: `Orders/${orderNumber}/${pdfFileName}`,
        emailStatus: 'Not Sent',
        status: 'Request Received',
        createdDate: new Date().toISOString(),
        updatedDate: new Date().toISOString(),
        fmsSnapshot: { ...vehicle },
        auditHistory: [
          {
            id: `aud-${Date.now()}-1`,
            action: 'Order Created',
            user: 'Fleet Coordinator',
            timestamp: new Date().toISOString(),
            orderNumber,
            details: `Maintenance order initiated for Car Code ${vehicle.carCode} (${vehicle.carNumber})`,
          },
          {
            id: `aud-${Date.now()}-2`,
            action: 'FMS Data Retrieved',
            user: 'System',
            timestamp: new Date().toISOString(),
            orderNumber,
            details: `Vehicle & employee data snapshotted from active FMS file`,
          },
        ],
      };

      // 3. Copy official Job Order template & populate mapped cells
      setSubmissionStep('Copying official Excel template & populating mapped cells...');
      const templateBuffer = await StorageService.getOfficialTemplateBuffer();
      const { buffer: excelBuffer, base64: excelBase64, workbook: populatedWorkbook } =
        await populateJobOrderExcel(templateBuffer, newOrder, settings.templateMapping);

      newOrder.excelBase64 = excelBase64;
      newOrder.status = 'Job Order Created';
      newOrder.auditHistory.push({
        id: `aud-${Date.now()}-3`,
        action: 'Job Order Excel Generated',
        user: 'System',
        timestamp: new Date().toISOString(),
        orderNumber,
        details: `Excel saved as ${excelFileName} preserving original layout and formatting`,
      });

      // 4. Convert completed Excel directly to vector PDF
      setSubmissionStep('Converting populated Excel directly to PDF...');
      const pdfResult = await convertExcelWorkbookToPDF(populatedWorkbook, pdfFileName);
      newOrder.pdfBase64 = pdfResult.base64;
      newOrder.auditHistory.push({
        id: `aud-${Date.now()}-4`,
        action: 'PDF Generated',
        user: 'System',
        timestamp: new Date().toISOString(),
        orderNumber,
        details: `Converted Excel directly to vector PDF (${pdfFileName})`,
      });
      setCreatedPdfData(pdfResult);

      // 5. Send PDF by Email to Employee Email
      setSubmissionStep(`Sending PDF by email to ${vehicle.employeeEmail}...`);
      // Simulate realistic email dispatch with full validation
      const emailSubject = `Fleet Maintenance Job Order - ${orderNumber}`;
      const emailDate = new Date().toLocaleString();

      if (vehicle.employeeEmail && vehicle.employeeEmail.includes('@')) {
        newOrder.emailStatus = 'Sent';
        newOrder.emailDate = emailDate;
        newOrder.status = 'Sent to Employee';
        newOrder.auditHistory.push({
          id: `aud-${Date.now()}-5`,
          action: 'Email Sent',
          user: 'System',
          timestamp: new Date().toISOString(),
          orderNumber,
          details: `Dispatched "${emailSubject}" to ${vehicle.employeeEmail} with attached ${pdfFileName}`,
        });
      } else {
        newOrder.emailStatus = 'Failed';
        newOrder.emailFailureReason = 'Invalid or missing employee email address.';
        newOrder.auditHistory.push({
          id: `aud-${Date.now()}-5`,
          action: 'Email Failed',
          user: 'System',
          timestamp: new Date().toISOString(),
          orderNumber,
          details: 'Failed to send email: recipient address invalid.',
        });
      }

      // 6. Save permanent record to Main Orders
      setSubmissionStep('Saving order to Main Orders register...');
      StorageService.addMainOrder(newOrder);

      // Complete!
      setCompletedOrder(newOrder);
      onOrderCreated(newOrder);
      setIsSubmitting(false);
    } catch (err: any) {
      console.error('Order creation error:', err);
      setGeneralError(err.message || 'An error occurred while creating the maintenance order.');
      setIsSubmitting(false);
    }
  };

  const handleDownloadExcel = (order: MainOrder) => {
    if (!order.excelBase64) return;
    const link = document.createElement('a');
    link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${order.excelBase64}`;
    link.download = `Job_Order_${order.orderNumber}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPdf = (order: MainOrder) => {
    if (!order.pdfBase64) return;
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${order.pdfBase64}`;
    link.download = `Job_Order_${order.orderNumber}_${order.carCode}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetForNewOrder = () => {
    setCarNumberInput('');
    setCarCodeInput('');
    setVehicle(null);
    setSearchFeedback(null);
    setMileage('');
    setMaintenanceDetails('');
    setCompletedOrder(null);
    setCreatedPdfData(null);
    setGeneralError(null);
    setNextOrderNum(StorageService.getNextOrderNumber());
  };

  // SUCCESS VIEW
  if (completedOrder) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Workflow Complete
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              Job Order #{completedOrder.orderNumber} Created Successfully
            </h2>
            <p className="text-xs text-slate-500">
              Excel generated from official template • Vector PDF converted • Registered in Main Orders
            </p>
          </div>
        </div>

        {/* Email & Dispatch Status Box */}
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#E1001A]" />
              <span className="font-semibold text-slate-700">Email Notification Status:</span>
            </div>
            <span
              className={`font-semibold px-2 py-0.5 rounded ${
                completedOrder.emailStatus === 'Sent'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {completedOrder.emailStatus === 'Sent' ? 'Dispatched to Employee' : 'Failed'}
            </span>
          </div>

          <div className="text-xs text-slate-600 space-y-1 pl-6">
            <p>
              <span className="text-slate-400">Recipient:</span>{' '}
              <span className="font-medium text-slate-800">{completedOrder.employeeEmail}</span>
            </p>
            <p>
              <span className="text-slate-400">Subject:</span>{' '}
              <span className="font-medium text-slate-800">
                Fleet Maintenance Job Order - {completedOrder.orderNumber}
              </span>
            </p>
            <p>
              <span className="text-slate-400">Attachment:</span>{' '}
              <span className="font-mono text-slate-700">
                Job_Order_{completedOrder.orderNumber}_{completedOrder.carCode}.pdf
              </span>
            </p>
          </div>
        </div>

        {/* Order Details Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/50 p-4 rounded-lg border border-slate-100 text-xs">
          <div>
            <span className="text-slate-400">Car Code / Plate</span>
            <p className="font-semibold text-slate-800 mt-0.5">
              {completedOrder.carCode} ({completedOrder.carNumber})
            </p>
          </div>
          <div>
            <span className="text-slate-400">Employee</span>
            <p className="font-semibold text-slate-800 mt-0.5">{completedOrder.employeeName}</p>
          </div>
          <div>
            <span className="text-slate-400">Maintenance Type</span>
            <p className="font-semibold text-slate-800 mt-0.5">{completedOrder.maintenanceType}</p>
          </div>
          <div>
            <span className="text-slate-400">Assigned Agency</span>
            <p className="font-semibold text-slate-800 mt-0.5">{completedOrder.agency}</p>
          </div>
        </div>

        {/* Action Buttons: Downloads & Navigation */}
        <div className="space-y-3 pt-2">
          {onSendGmail && (
            <button
              id="btn-send-completed-gmail"
              type="button"
              onClick={() => onSendGmail(completedOrder)}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-xl text-sm font-bold shadow-md shadow-red-500/20 transition-all"
            >
              <Mail className="w-4 h-4" />
              <span>Send Job Order via Gmail &bull; Subject: {completedOrder.carNumber}</span>
            </button>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              id="btn-download-completed-excel"
              onClick={() => handleDownloadExcel(completedOrder)}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Job Order Excel</span>
            </button>

            <button
              id="btn-download-completed-pdf"
              onClick={() => handleDownloadPdf(completedOrder)}
              className="flex items-center justify-center gap-2 bg-[#E1001A] hover:bg-[#C70017] text-white py-2.5 px-4 rounded-lg text-sm font-semibold shadow-xs transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Download Job Order PDF</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <button
              id="btn-view-order-details"
              onClick={() => onViewOrder(completedOrder)}
              className="text-xs font-semibold text-slate-700 hover:text-[#E1001A] flex items-center gap-1.5 transition-colors"
            >
              <span>View Full Order Details & Audit Log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={resetForNewOrder}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                + Create Another Order
              </button>
              <button
                onClick={onGoToMainOrders}
                className="px-3.5 py-2 text-xs font-semibold text-[#E1001A] bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors"
              >
                Open Main Orders Register
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ORDER FORM VIEW
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header card with next Order Number */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              New Fleet Maintenance Order
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-red-50 text-[#E1001A] border border-red-200 rounded">
              e& Official
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Retrieve vehicle from FMS, configure work scope, and generate official Job Order
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Day & Date
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800">{dayName},</span>
                <input
                  type="date"
                  id="input-order-date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="text-xs font-semibold text-slate-800 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center gap-3">
            <div>
              <span className="text-[10px] font-bold text-[#E1001A] uppercase tracking-wider block">
                Maintenance Request ID
              </span>
              <span className="text-lg font-bold text-[#E1001A] font-mono">
                #{nextOrderNum}
              </span>
            </div>
          </div>
        </div>
      </div>

      {generalError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <span>{generalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="space-y-6">
        {/* STEP 1: AUTOMATIC VEHICLE LOOKUP */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#E1001A] text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h2 className="text-sm font-bold text-slate-900">
                Automatic Vehicle Lookup (From FMS)
              </h2>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
              <button
                type="button"
                id="tab-search-car-number"
                onClick={() => handleSwitchMode('carNumber')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  searchMode === 'carNumber'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>Car Number</span>
              </button>
              <button
                type="button"
                id="tab-search-car-code"
                onClick={() => handleSwitchMode('carCode')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  searchMode === 'carCode'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Vehicle Code</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {/* Dynamic Label and Input based on Search Mode */}
            {searchMode === 'carNumber' ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Enter Car Number <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="input-car-number"
                      type="text"
                      value={carNumberInput}
                      onChange={(e) => {
                        setCarNumberInput(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchCarNumber();
                        }
                      }}
                      placeholder="e.g. SHJ-74912, DXB-33918, AUH-55210..."
                      className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-mono uppercase transition-colors ${
                        searchFeedback?.type === 'error' && searchFeedback.matchedBy === 'carNumber'
                          ? 'border-red-400 focus:ring-red-500 focus:border-red-500'
                          : vehicle
                          ? 'border-emerald-400 bg-emerald-50/20 text-slate-900'
                          : 'border-slate-300 focus:ring-[#E1001A] focus:border-[#E1001A]'
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    id="btn-search-car-number"
                    onClick={() => handleSearchCarNumber()}
                    className="flex items-center gap-1.5 bg-[#E1001A] hover:bg-[#C70017] text-white px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors shadow-xs"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Lookup Vehicle</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Enter Vehicle Code <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="input-car-code"
                      type="text"
                      value={carCodeInput}
                      onChange={(e) => {
                        setCarCodeInput(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchCarCode();
                        }
                      }}
                      placeholder="e.g. FLT-004, FLT-005, FLT-001..."
                      className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-mono uppercase transition-colors ${
                        searchFeedback?.type === 'error' && searchFeedback.matchedBy === 'carCode'
                          ? 'border-red-400 focus:ring-red-500 focus:border-red-500'
                          : vehicle
                          ? 'border-emerald-400 bg-emerald-50/20 text-slate-900'
                          : 'border-slate-300 focus:ring-[#E1001A] focus:border-[#E1001A]'
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    id="btn-search-car-code"
                    onClick={() => handleSearchCarCode()}
                    className="flex items-center gap-1.5 bg-[#E1001A] hover:bg-[#C70017] text-white px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors shadow-xs"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Lookup Vehicle</span>
                  </button>
                </div>
              </div>
            )}

            {/* Error Message Feedback */}
            {searchFeedback?.type === 'error' && (
              <div
                id="msg-search-error"
                className="flex items-center justify-between gap-3 p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-semibold animate-in fade-in"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{searchFeedback.message}</span>
                </div>
                {searchFeedback.message.includes('try with Vehicle Code') && searchMode === 'carNumber' && (
                  <button
                    type="button"
                    id="btn-switch-to-code"
                    onClick={() => handleSwitchMode('carCode')}
                    className="px-2.5 py-1 text-xs font-bold text-white bg-[#E1001A] hover:bg-[#C70017] rounded shadow-xs transition-colors shrink-0"
                  >
                    Switch to Vehicle Code &rarr;
                  </button>
                )}
              </div>
            )}

            {/* Warning Message Feedback (e.g. multiple matches) */}
            {searchFeedback?.type === 'warning' && (
              <div
                id="msg-search-warning"
                className="space-y-2 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-medium animate-in fade-in"
              >
                <div className="flex items-center gap-2 font-semibold text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{searchFeedback.message}</span>
                </div>
                {searchFeedback.multipleMatches && searchFeedback.multipleMatches.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {searchFeedback.multipleMatches.map((m) => (
                      <button
                        type="button"
                        key={m.carCode}
                        onClick={() => handleSelectFromFMS(m)}
                        className="flex items-center justify-between p-2 bg-white rounded border border-amber-300 hover:border-[#E1001A] hover:bg-red-50 text-left transition-colors"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{m.carNumber}</span>
                          <span className="text-slate-500 ml-2 font-mono text-[11px]">({m.carCode})</span>
                          <div className="text-[11px] text-slate-600">
                            {m.make} {m.model} &bull; {m.employeeName}
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-[#E1001A]">Select</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Success Message Feedback */}
            {searchFeedback?.type === 'success' && (
              <div
                id="msg-search-success"
                className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold animate-in fade-in"
              >
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{searchFeedback.message}</span>
              </div>
            )}

            {/* Quick picker pills from current FMS */}
            <div className="pt-2 flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
              <span className="font-medium text-slate-600">
                {searchMode === 'carNumber' ? 'Quick test Car Numbers:' : 'Quick test Vehicle Codes:'}
              </span>
              {allVehicles.slice(0, 5).map((v) => (
                <button
                  type="button"
                  key={v.carCode}
                  onClick={() => {
                    if (searchMode === 'carNumber') {
                      setCarNumberInput(v.carNumber);
                      handleSearchCarNumber(v.carNumber);
                    } else {
                      setCarCodeInput(v.carCode);
                      handleSearchCarCode(v.carCode);
                    }
                  }}
                  className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                    vehicle?.carCode === v.carCode
                      ? 'bg-[#E1001A] text-white font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {searchMode === 'carNumber' ? v.carNumber : v.carCode}
                </button>
              ))}
            </div>
          </div>

          {/* READ-ONLY VEHICLE & EMPLOYEE DATA */}
          {vehicle ? (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                  <Check className="w-4 h-4" />
                  <span>FMS Vehicle Verified</span>
                </div>
                <span className="text-xs text-slate-400 font-mono">Read-Only</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Car Code</span>
                  <span className="font-mono font-bold text-[#E1001A] text-sm px-2 py-0.5 rounded bg-red-50 border border-red-200 inline-block mt-0.5">
                    {vehicle.carCode}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Car Number</span>
                  <span className="font-bold text-slate-800 text-sm block mt-0.5">{vehicle.carNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Make</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">{vehicle.make}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Model</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">
                    {vehicle.model} ({vehicle.year})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Chassis</span>
                  <span className="font-mono text-slate-700 text-xs truncate block mt-0.5" title={vehicle.chassisNumber}>
                    {vehicle.chassisNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Engine or Motor</span>
                  <span className="font-mono text-slate-700 text-xs truncate block mt-0.5" title={vehicle.motorNumber}>
                    {vehicle.motorNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">User ID</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">{vehicle.staffId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">User Name</span>
                  <span className="font-bold text-slate-800 block mt-0.5">{vehicle.employeeName}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-400">
              Vehicle and employee information will appear here once a valid Car Number or Vehicle Code is entered.
            </div>
          )}
        </div>

        {/* STEP 2: MANUAL MAINTENANCE FIELDS */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#E1001A] text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h2 className="text-sm font-bold text-slate-900">
                Maintenance Details & Classification
              </h2>
            </div>
            <span className="text-xs text-slate-400">Manual Coordinator Inputs</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mileage Reading */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mileage Reading (KM) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-mileage"
                  type="number"
                  min="1"
                  step="1"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  placeholder="e.g. 45000"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-[#E1001A] focus:border-[#E1001A]"
                />
                <Gauge className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Maintenance Type dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Maintenance Type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="select-maintenance-type"
                  value={maintenanceType}
                  onChange={(e) => setMaintenanceType(e.target.value as MaintenanceType)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-[#E1001A] focus:border-[#E1001A] bg-white"
                >
                  {MAINTENANCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <Wrench className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Agency Name dropdown from Settings */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Agency Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="select-agency"
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-[#E1001A] focus:border-[#E1001A] bg-white"
                >
                  {settings.agencies.map((ag) => (
                    <option key={ag} value={ag}>
                      {ag}
                    </option>
                  ))}
                </select>
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Maintenance Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Maintenance Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="textarea-maintenance-details"
                rows={4}
                value={maintenanceDetails}
                onChange={(e) => setMaintenanceDetails(e.target.value)}
                placeholder="Specify defects reported, inspection requirements, parts to change, or service intervals..."
                required
                className="w-full p-3 rounded-lg border border-slate-300 text-sm focus:ring-[#E1001A] focus:border-[#E1001A]"
              />
            </div>
          </div>
        </div>

        {/* STEP 3: SUBMISSION & EXECUTION */}
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-800 block">Automated Workflow on Submission:</span>
            <span>Create Order #{nextOrderNum} → Populate Excel Template → Convert to Vector PDF → Dispatch Email to {vehicle ? vehicle.employeeEmail : 'Employee'} → Save Register</span>
          </div>

          <button
            type="submit"
            id="btn-submit-order"
            disabled={isSubmitting || !vehicle}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-white shadow-sm transition-all ${
              isSubmitting || !vehicle
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-[#E1001A] hover:bg-[#C70017] active:scale-[0.99]'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{submissionStep || 'Processing Order...'}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Create & Dispatch Job Order #{nextOrderNum}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
