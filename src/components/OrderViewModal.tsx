import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  FileText,
  Mail,
  Clock,
  User,
  Car,
  Building2,
  Wrench,
  Gauge,
  History,
  CheckCircle2,
  AlertTriangle,
  Download,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { MainOrder } from '../types';

interface OrderViewModalProps {
  order: MainOrder | null;
  onClose: () => void;
  onDownloadExcel: (order: MainOrder) => void;
  onDownloadPdf: (order: MainOrder) => void;
  onResendEmail?: (order: MainOrder) => void;
  onDeleteOrder?: (order: MainOrder) => void;
  onSendGmail?: (order: MainOrder) => void;
}

export const OrderViewModal: React.FC<OrderViewModalProps> = ({
  order,
  onClose,
  onDownloadExcel,
  onDownloadPdf,
  onResendEmail,
  onDeleteOrder,
  onSendGmail,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'audit' | 'pdf'>('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E1001A] text-white font-bold flex items-center justify-center text-sm font-mono shadow-xs">
              #{order.orderNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Maintenance Order #{order.orderNumber}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    order.status === 'Completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : order.status === 'Sent to Employee'
                      ? 'bg-red-50 text-[#E1001A] border border-red-200'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Created: {new Date(order.createdDate).toLocaleString()} • Issue Date: {order.date}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onDownloadExcel(order)}
              className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Download Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={() => onDownloadPdf(order)}
              className="p-2 text-[#E1001A] bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Download PDF"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation tabs inside modal */}
        <div className="flex border-b border-slate-200 px-5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-3 border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-[#E1001A] text-[#E1001A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Order & Vehicle Information
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'border-[#E1001A] text-[#E1001A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit History ({order.auditHistory?.length || 0})</span>
          </button>
          {order.pdfBase64 && (
            <button
              onClick={() => setActiveTab('pdf')}
              className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'pdf'
                  ? 'border-[#E1001A] text-[#E1001A]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF Document Preview</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {activeTab === 'details' && (
            <>
              {/* Email Notification Dispatch Status */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      order.emailStatus === 'Sent'
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">Email Notification</span>
                      <span
                        className={`px-2 py-0.5 rounded font-semibold ${
                          order.emailStatus === 'Sent'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {order.emailStatus}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-0.5">
                      Sent to: <span className="font-semibold text-slate-800">{order.employeeEmail}</span>
                      {order.emailDate && ` • ${order.emailDate}`}
                    </p>
                  </div>
                </div>

                {onResendEmail && (
                  <button
                    onClick={() => onResendEmail(order)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded font-semibold"
                  >
                    Resend Email
                  </button>
                )}
              </div>

              {/* Vehicle & Employee Snapshot Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Car className="w-4 h-4 text-[#E1001A]" />
                    <span>FMS Historical Snapshot (Preserved at Order Creation)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">Read-Only</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-4 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-400 block">Car Code</span>
                    <span className="font-bold text-slate-800 font-mono text-sm">
                      {order.carCode}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Plate Number</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {order.carNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Make & Model</span>
                    <span className="font-semibold text-slate-800">
                      {order.make} {order.model}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Model Year</span>
                    <span className="font-semibold text-slate-800">{order.year}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Employee / Owner</span>
                    <span className="font-semibold text-slate-800">{order.employeeName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Staff ID</span>
                    <span className="font-semibold text-slate-800">{order.staffId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Chassis Number</span>
                    <span className="font-mono text-slate-600 truncate block">
                      {order.chassisNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Motor / Engine No</span>
                    <span className="font-mono text-slate-600 truncate block">
                      {order.motorNumber}
                    </span>
                  </div>
                </div>
              </div>

              {/* Maintenance Specifications Section */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-[#E1001A]" />
                  <span>Maintenance Details & Workshop</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-4 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-400 block">Recorded Mileage</span>
                    <span className="font-bold text-slate-800 text-sm font-mono">
                      {order.mileage.toLocaleString()} KM
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Assigned Agency</span>
                    <span className="font-semibold text-slate-800">{order.agency}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Maintenance Type</span>
                    <span className="font-semibold text-slate-800">{order.maintenanceType}</span>
                  </div>

                  <div className="sm:col-span-3 pt-2 border-t border-slate-200">
                    <span className="text-slate-400 block mb-1">Scope of Work / Defects</span>
                    <p className="p-3 bg-white rounded border border-slate-200 text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {order.maintenanceDetails}
                    </p>
                  </div>
                </div>
              </div>

              {/* File Storage References */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#E1001A]" />
                  <span>File Storage References</span>
                </h3>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 space-y-1 font-mono text-[11px]">
                  <p>Excel File: {order.jobOrderExcelPath}</p>
                  <p>PDF File: {order.jobOrderPdfPath}</p>
                </div>
              </div>
            </>
          )}

          {/* AUDIT HISTORY TAB */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <p className="text-slate-500">
                Automatic audit trail of system and coordinator actions for Order #{order.orderNumber}:
              </p>

              <div className="relative pl-6 border-l-2 border-slate-200 space-y-4">
                {(order.auditHistory || []).map((entry) => (
                  <div key={entry.id} className="relative group">
                    <div className="w-3 h-3 rounded-full bg-[#E1001A] absolute -left-[31px] top-1 ring-4 ring-white" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{entry.action}</span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-0.5">{entry.details}</p>
                      <span className="text-[11px] text-slate-400">By: {entry.user}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PDF PREVIEW TAB */}
          {activeTab === 'pdf' && order.pdfBase64 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2">
                <span className="text-slate-500 font-medium">
                  Direct vector PDF export generated from Excel template:
                </span>
                <button
                  onClick={() => onDownloadPdf(order)}
                  className="text-[#E1001A] hover:underline font-semibold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF Document</span>
                </button>
              </div>

              <div className="border border-slate-300 rounded-lg overflow-hidden bg-slate-100 h-[460px]">
                <iframe
                  src={`data:application/pdf;base64,${order.pdfBase64}`}
                  className="w-full h-full"
                  title={`Job Order ${order.orderNumber} PDF`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 font-mono">
              System Order ID: ORD-{order.orderNumber}
            </span>
            {onDeleteOrder && (
              <>
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 hover:underline font-medium ml-2 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Order</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg text-xs">
                    <span className="text-red-700 font-medium">Delete #{order.orderNumber}?</span>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="text-slate-600 hover:text-slate-900 px-1.5 py-0.5 rounded hover:bg-slate-200/60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteOrder(order);
                        onClose();
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold px-2 py-0.5 rounded shadow-xs"
                    >
                      Yes, Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onSendGmail && (
              <button
                type="button"
                id={`btn-modal-send-gmail-${order.orderNumber}`}
                onClick={() => onSendGmail(order)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                title={`Send via Gmail with subject ${order.carNumber}`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Send via Gmail ({order.carNumber})</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
