import React, { useState, useEffect, useCallback } from 'react';
import { ActiveTab, MainOrder, SystemSettings } from './types';
import { StorageService, FMSMetadata } from './services/storageService';
import { populateJobOrderExcel } from './services/excelService';
import { convertExcelWorkbookToPDF } from './services/pdfService';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { NewOrderForm } from './components/NewOrderForm';
import { MainOrdersList } from './components/MainOrdersList';
import { FMSUpload } from './components/FMSUpload';
import { SettingsPage } from './components/SettingsPage';
import { OrderViewModal } from './components/OrderViewModal';
import { GmailSendModal } from './components/GmailSendModal';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [orders, setOrders] = useState<MainOrder[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(() => StorageService.getSettings());
  const [fmsMeta, setFmsMeta] = useState<FMSMetadata>(() => StorageService.getFMSMetadata());
  const [viewingOrder, setViewingOrder] = useState<MainOrder | null>(null);
  const [gmailOrder, setGmailOrder] = useState<MainOrder | null>(null);
  const [isGeneratingFile, setIsGeneratingFile] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load orders & meta on mount
  const refreshData = useCallback(() => {
    const loadedOrders = StorageService.getMainOrders();
    setOrders(loadedOrders);
    setFmsMeta(StorageService.getFMSMetadata());
    setSettings(StorageService.getSettings());
  }, []);

  useEffect(() => {
    refreshData();
    const unsubscribe = StorageService.onStorageReady(refreshData);
    return () => {
      unsubscribe();
    };
  }, [refreshData]);

  // Keep viewingOrder in sync if it was updated
  useEffect(() => {
    if (viewingOrder) {
      const updated = orders.find((o) => o.orderNumber === viewingOrder.orderNumber);
      if (updated) {
        setViewingOrder(updated);
      }
    }
  }, [orders]);

  // Download Job Order Excel helper
  const handleDownloadExcel = async (order: MainOrder) => {
    try {
      let b64 = order.excelBase64;
      if (!b64) {
        // Generate on demand if missing
        setIsGeneratingFile(true);
        const templateBuf = await StorageService.getOfficialTemplateBuffer();
        const res = await populateJobOrderExcel(templateBuf, order, settings.templateMapping);
        b64 = res.base64;
        order.excelBase64 = b64;
        StorageService.updateMainOrder(order);
      }

      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${b64}`;
      link.download = `Job_Order_${order.orderNumber}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Failed to download Excel: ' + err.message);
    } finally {
      setIsGeneratingFile(false);
    }
  };

  // Download Job Order PDF helper
  const handleDownloadPdf = async (order: MainOrder) => {
    try {
      let pdfB64 = order.pdfBase64;
      if (!pdfB64) {
        setIsGeneratingFile(true);
        const templateBuf = await StorageService.getOfficialTemplateBuffer();
        const res = await populateJobOrderExcel(templateBuf, order, settings.templateMapping);
        const pdfRes = await convertExcelWorkbookToPDF(
          res.workbook,
          `Job_Order_${order.orderNumber}_${order.carCode}.pdf`
        );
        pdfB64 = pdfRes.base64;
        order.excelBase64 = res.base64;
        order.pdfBase64 = pdfB64;
        StorageService.updateMainOrder(order);
      }

      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${pdfB64}`;
      link.download = `Job_Order_${order.orderNumber}_${order.carCode}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Failed to download PDF: ' + err.message);
    } finally {
      setIsGeneratingFile(false);
    }
  };

  // Resend email helper
  const handleResendEmail = (order: MainOrder) => {
    const nowStr = new Date().toLocaleString();
    const updated: MainOrder = {
      ...order,
      emailStatus: 'Sent',
      emailDate: nowStr,
      status:
        order.status === 'Request Received' || order.status === 'Job Order Created'
          ? 'Sent to Employee'
          : order.status,
    };

    StorageService.updateMainOrder(updated);
    StorageService.appendAuditLog(
      order.orderNumber,
      'Email Resent',
      `Dispatched replacement PDF to ${order.employeeEmail} at ${nowStr}`
    );
    refreshData();
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Primary Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ordersCount={orders.length}
        vehiclesCount={fmsMeta.totalVehicles}
      />

      {/* Main Content Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            orders={orders}
            fmsMeta={fmsMeta}
            onNavigate={setActiveTab}
            onViewOrder={setViewingOrder}
            onDownloadExcel={handleDownloadExcel}
            onDownloadPdf={handleDownloadPdf}
          />
        )}

        {activeTab === 'new-order' && (
          <NewOrderForm
            settings={settings}
            onOrderCreated={(newOrder) => {
              refreshData();
            }}
            onViewOrder={setViewingOrder}
            onGoToMainOrders={() => setActiveTab('main-orders')}
            onSendGmail={(order) => setGmailOrder(order)}
          />
        )}

        {activeTab === 'main-orders' && (
          <MainOrdersList
            orders={orders}
            settings={settings}
            onRefreshOrders={refreshData}
            onViewOrder={setViewingOrder}
            onDownloadExcel={handleDownloadExcel}
            onDownloadPdf={handleDownloadPdf}
            onNewOrderClick={() => setActiveTab('new-order')}
            onSendGmail={(order) => setGmailOrder(order)}
          />
        )}

        {activeTab === 'fms-upload' && (
          <FMSUpload
            fmsMeta={fmsMeta}
            onFMSUpdated={refreshData}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            settings={settings}
            onSettingsUpdated={(newSettings) => {
              setSettings(newSettings);
              refreshData();
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            Fleet Maintenance Job Order Management System • Version 1 (V1)
          </p>
          <p className="text-slate-400">
            Official Excel Template Engine • Vector PDF Direct Conversion • Gmail API Integration
          </p>
        </div>
      </footer>

      {/* View Order Modal */}
      {viewingOrder && (
        <OrderViewModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          onDownloadExcel={handleDownloadExcel}
          onDownloadPdf={handleDownloadPdf}
          onResendEmail={handleResendEmail}
          onSendGmail={(order) => setGmailOrder(order)}
          onDeleteOrder={(order) => {
            StorageService.deleteMainOrder(order.orderNumber);
            setViewingOrder(null);
            refreshData();
          }}
        />
      )}

      {/* Gmail Send Modal */}
      <GmailSendModal
        order={gmailOrder}
        isOpen={!!gmailOrder}
        onClose={() => setGmailOrder(null)}
        onSuccess={() => {
          refreshData();
          setToast({
            type: 'success',
            message: `Job order email sent successfully via Gmail for vehicle ${gmailOrder?.carNumber || ''}!`,
          });
          setTimeout(() => setToast(null), 6000);
        }}
      />

      {/* Floating Notification Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2 text-xs">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
