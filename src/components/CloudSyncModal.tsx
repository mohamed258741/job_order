import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  X,
  UploadCloud,
  DownloadCloud,
  Database,
  Calendar,
  Layers,
} from 'lucide-react';
import { SystemSettings, MainOrder, FMSVehicleRecord } from '../types';
import { StorageService } from '../services/storageService';
import {
  performFullCloudSync,
  syncOrdersToGoogleSheet,
  syncFleetToGoogleSheet,
  loadFleetFromGoogleSheet,
  getOrCreateMasterSpreadsheet,
} from '../services/googleSheetsService';
import {
  getAccessToken,
  getCurrentUser,
  googleSignIn,
} from '../services/googleAuthService';
import { AuthErrorBanner } from './AuthErrorBanner';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [settings, setSettings] = useState<SystemSettings>(() => StorageService.getSettings());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPullingFleet, setIsPullingFleet] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [authError, setAuthError] = useState<any>(null);
  const [successInfo, setSuccessInfo] = useState<{
    orders: number;
    vehicles: number;
    url: string;
    time: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setErrorMsg(null);
    setAuthError(null);
    setSyncStatus('Connecting to Google Sheets & Drive API...');

    try {
      let token = await getAccessToken();
      if (!token) {
        setSyncStatus('Authorizing Google account permissions...');
        const authRes = await googleSignIn();
        token = authRes.accessToken;
      }

      setSyncStatus('Verifying "Fleet Maintenance Master Register" Google Sheet...');
      const result = await performFullCloudSync(token, settings.googleSpreadsheetId);

      const updatedSettings = StorageService.getSettings();
      setSettings(updatedSettings);

      setSuccessInfo({
        orders: result.ordersSynced,
        vehicles: result.fleetSynced,
        url: result.spreadsheetUrl,
        time: result.timestamp,
      });

      setSyncStatus(null);
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      console.error('Cloud Sync Error:', err);
      setAuthError(err);
      setErrorMsg(err.message || 'Failed to sync with Google Sheets.');
      setSyncStatus(null);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFleetFromCloud = async () => {
    setIsPullingFleet(true);
    setErrorMsg(null);
    setAuthError(null);
    setSyncStatus('Reading FMS fleet directly from Google Sheets...');

    try {
      let token = await getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        token = authRes.accessToken;
      }

      if (!settings.googleSpreadsheetId) {
        throw new Error('No Google Sheet linked yet. Please click "Sync Everything to Cloud" first to establish the master sheet.');
      }

      const vehicles = await loadFleetFromGoogleSheet(token, settings.googleSpreadsheetId);
      if (vehicles.length === 0) {
        throw new Error('No vehicle records found in the "FMS Vehicles" tab of the Google Sheet.');
      }

      StorageService.setFMSVehicles(vehicles, 'Google_Sheets_Sync.xlsx');
      setSyncStatus(null);
      alert(`Successfully loaded ${vehicles.length} FMS vehicles from Google Sheets!`);
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      setAuthError(err);
      setErrorMsg(err.message || 'Failed to load fleet from Google Sheets.');
      setSyncStatus(null);
    } finally {
      setIsPullingFleet(false);
    }
  };

  const ordersCount = StorageService.getMainOrders().length;
  const vehiclesCount = StorageService.getFMSVehicles().length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <span>Google Sheets & Drive Cloud Sync</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded-full">
                  Zero-Lag Cloud
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Offload 2,000+ FMS fleet and orders to a live, collaborative Google Sheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-600 overflow-y-auto max-h-[75vh]">
          {/* Status Banner */}
          {settings.googleSpreadsheetUrl ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Linked Google Spreadsheet Active</span>
                </div>
                <div className="text-[11px] text-emerald-700 font-mono break-all">
                  Sheet ID: {settings.googleSpreadsheetId}
                </div>
                {settings.lastCloudSyncTimestamp && (
                  <div className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    <span>Last synchronized: {settings.lastCloudSyncTimestamp}</span>
                  </div>
                )}
              </div>

              <a
                href={settings.googleSpreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Open in Sheets</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-slate-800">
              <Cloud className="w-5 h-5 text-[#E1001A] shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold text-slate-900">Ready to Link Google Drive & Sheets</strong>
                <span className="text-slate-600">
                  Clicking "Sync Everything to Cloud" will automatically create or connect the master spreadsheet named <strong>"Fleet Maintenance Master Register"</strong> in your Google Drive with dedicated tabs for Main Orders and FMS Vehicles.
                </span>
              </div>
            </div>
          )}

          {/* Data Payload Overview */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                <Database className="w-3.5 h-3.5 text-[#E1001A]" />
                <span>Main Orders Tab</span>
              </div>
              <div className="text-lg font-bold text-slate-800 mt-1">
                {ordersCount} Orders
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                All fields, vehicle specs, mileage, & statuses
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>FMS Vehicles Tab</span>
              </div>
              <div className="text-lg font-bold text-slate-800 mt-1">
                {vehiclesCount} Vehicles
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Car codes, plates, motor, employee custody
              </div>
            </div>
          </div>

          {/* Sync Progress Feedback */}
          {syncStatus && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-slate-800 text-xs animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-[#E1001A]" />
              <span>{syncStatus}</span>
            </div>
          )}

          {authError && (
            <AuthErrorBanner
              error={authError}
              onRetry={handleSyncAll}
              onTokenSet={handleSyncAll}
            />
          )}

          {errorMsg && !authError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successInfo && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Cloud Sync Completed Successfully!</span>
              </div>
              <div>
                Pushed {successInfo.orders} Main Orders and {successInfo.vehicles} FMS Vehicles to your Google Drive sheet at {successInfo.time}.
              </div>
            </div>
          )}

          {/* Cloud Benefits Highlight */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-[11px] text-slate-600">
            <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
              Why Cloud Storage Eliminates Lag:
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
              <li><strong>Zero DOM Freezes:</strong> Google Sheets stores massive data in the cloud instead of overloading browser memory.</li>
              <li><strong>Collaborative Access:</strong> Multiple team members can view and query orders directly in Google Sheets in real-time.</li>
              <li><strong>Safe Backup:</strong> Your 2,000+ vehicles and order history are permanently preserved even if browser cookies are cleared.</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          {settings.googleSpreadsheetId ? (
            <button
              type="button"
              onClick={handlePullFleetFromCloud}
              disabled={isPullingFleet || isSyncing}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              title="Pull the 2,000+ vehicles register from Google Sheets into the app"
            >
              {isPullingFleet ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <DownloadCloud className="w-3.5 h-3.5 text-slate-600" />
              )}
              <span>Reload Fleet from Sheet</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              id="btn-confirm-cloud-sync"
              onClick={handleSyncAll}
              disabled={isSyncing || isPullingFleet}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Syncing to Google Sheets...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Sync Everything to Cloud Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
