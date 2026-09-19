import React, { useState, useEffect } from 'react';
import {
  Hash,
  Building2,
  Wrench,
  FileSpreadsheet,
  Table,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Upload,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Save,
  Mail,
  LogOut,
  Loader2,
  Cloud,
  ExternalLink,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { SystemSettings, TemplateMapping, MAINTENANCE_TYPES } from '../types';
import { StorageService } from '../services/storageService';
import { DEFAULT_TEMPLATE_MAPPING } from '../services/excelService';
import {
  getCurrentUser,
  googleSignIn,
  logoutGoogle,
  getAccessToken,
} from '../services/googleAuthService';
import { performFullCloudSync } from '../services/googleSheetsService';

interface SettingsPageProps {
  settings: SystemSettings;
  onSettingsUpdated: (newSettings: SystemSettings) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onSettingsUpdated,
}) => {
  // Order Number State
  const [startingNum, setStartingNum] = useState(settings.startingOrderNumber);
  const [nextNum, setNextNum] = useState(settings.nextOrderNumber);

  // Agencies State
  const [agencies, setAgencies] = useState<string[]>(settings.agencies);
  const [newAgencyInput, setNewAgencyInput] = useState('');
  const [editingAgencyIdx, setEditingAgencyIdx] = useState<number | null>(null);
  const [editingAgencyVal, setEditingAgencyVal] = useState('');

  // Template Mapping State
  const [mapping, setMapping] = useState<TemplateMapping>({
    ...settings.templateMapping,
  });

  // Template File Upload State
  const [templateFileName, setTemplateFileName] = useState(
    settings.templateFileName || 'Official_Job_Order_Template.xlsx'
  );
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);

  // Notification State
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Gmail & Automated Dispatch Settings State
  const [centralEmail, setCentralEmail] = useState(
    settings.centralRecipientEmail || 'mohamed.ahmed39675@gmail.com'
  );
  const [sendToCentral, setSendToCentral] = useState(settings.sendToCentralEmail ?? true);
  const [sendToEmployee, setSendToEmployee] = useState(settings.sendToEmployee ?? true);
  const [subjectPattern, setSubjectPattern] = useState(
    settings.emailSubjectPattern || '{carNumber}'
  );
  const [googleUser, setGoogleUser] = useState<any>(getCurrentUser());
  const [hasGoogleToken, setHasGoogleToken] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);

  // Google Sheets & Drive Cloud Storage states
  const [googleSpreadsheetId, setGoogleSpreadsheetId] = useState(
    settings.googleSpreadsheetId || ''
  );
  const [autoCloudSync, setAutoCloudSync] = useState(
    settings.autoCloudSync ?? true
  );
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveCloudSettings = () => {
    const updated = StorageService.updateSettings({
      googleSpreadsheetId: googleSpreadsheetId.trim() || undefined,
      autoCloudSync,
    });
    onSettingsUpdated(updated);
    setSyncFeedback({
      type: 'success',
      text: 'Cloud sync preferences saved successfully.',
    });
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const handlePerformCloudSync = async () => {
    setIsSyncingCloud(true);
    setSyncFeedback(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const auth = await googleSignIn();
        token = auth.accessToken;
        setGoogleUser(auth.user);
        setHasGoogleToken(true);
      }

      const res = await performFullCloudSync(token, googleSpreadsheetId.trim() || undefined);
      setGoogleSpreadsheetId(res.spreadsheetId);
      const updated = StorageService.getSettings();
      onSettingsUpdated(updated);

      setSyncFeedback({
        type: 'success',
        text: `Successfully synced ${res.ordersSynced} orders and ${res.fleetSynced} fleet records to Google Sheets!`,
      });
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        text: err.message || 'Failed to sync with Google Sheets.',
      });
    } finally {
      setIsSyncingCloud(false);
    }
  };

  useEffect(() => {
    checkGoogleAuth();
  }, []);

  const checkGoogleAuth = async () => {
    setGoogleUser(getCurrentUser());
    const token = await getAccessToken();
    setHasGoogleToken(!!token);
  };

  const handleSignInGoogle = async () => {
    setIsAuthLoading(true);
    try {
      const res = await googleSignIn();
      setGoogleUser(res.user);
      setHasGoogleToken(true);
      setFeedback({
        type: 'success',
        text: `Connected to Gmail as ${res.user.email}. Ready to send job orders.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to sign in with Google.',
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOutGoogle = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setHasGoogleToken(false);
    setFeedback({
      type: 'success',
      text: 'Gmail account disconnected.',
    });
  };

  const handleSaveGmailSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!centralEmail.trim()) {
      setFeedback({ type: 'error', text: 'Central recipient email address is required.' });
      return;
    }
    const updated: SystemSettings = {
      ...settings,
      centralRecipientEmail: centralEmail.trim(),
      sendToCentralEmail: sendToCentral,
      sendToEmployee: sendToEmployee,
      emailSubjectPattern: subjectPattern.trim() || '{carNumber}',
    };
    StorageService.saveSettings(updated);
    onSettingsUpdated(updated);
    setFeedback({
      type: 'success',
      text: 'Gmail dispatch settings saved successfully (Subject set to Car Number).',
    });
  };

  // Save Order Number Configuration
  const handleSaveOrderNumbers = (e: React.FormEvent) => {
    e.preventDefault();
    if (startingNum <= 0 || nextNum <= 0) {
      setFeedback({ type: 'error', text: 'Order numbers must be positive numbers.' });
      return;
    }
    const updated: SystemSettings = {
      ...settings,
      startingOrderNumber: Number(startingNum),
      nextOrderNumber: Number(nextNum),
    };
    StorageService.saveSettings(updated);
    onSettingsUpdated(updated);
    setFeedback({ type: 'success', text: 'Order number settings saved successfully.' });
  };

  // Agency Handlers
  const handleAddAgency = () => {
    const trimmed = newAgencyInput.trim();
    if (!trimmed) return;
    if (agencies.includes(trimmed)) {
      setFeedback({ type: 'error', text: 'Agency already exists in the list.' });
      return;
    }
    const updatedList = [...agencies, trimmed];
    setAgencies(updatedList);
    setNewAgencyInput('');

    const updated: SystemSettings = { ...settings, agencies: updatedList };
    StorageService.saveSettings(updated);
    onSettingsUpdated(updated);
    setFeedback({ type: 'success', text: `Agency "${trimmed}" added.` });
  };

  const handleStartEditAgency = (idx: number) => {
    setEditingAgencyIdx(idx);
    setEditingAgencyVal(agencies[idx]);
  };

  const handleSaveEditAgency = (idx: number) => {
    const trimmed = editingAgencyVal.trim();
    if (!trimmed) return;
    const updatedList = [...agencies];
    updatedList[idx] = trimmed;
    setAgencies(updatedList);
    setEditingAgencyIdx(null);

    const updated: SystemSettings = { ...settings, agencies: updatedList };
    StorageService.saveSettings(updated);
    onSettingsUpdated(updated);
    setFeedback({ type: 'success', text: 'Agency updated successfully.' });
  };

  const handleDeleteAgency = (idx: number) => {
    if (agencies.length <= 1) {
      setFeedback({ type: 'error', text: 'You must maintain at least one active agency.' });
      return;
    }
    const agencyName = agencies[idx];
    const updatedList = agencies.filter((_, i) => i !== idx);
    setAgencies(updatedList);

    const updated: SystemSettings = { ...settings, agencies: updatedList };
    StorageService.saveSettings(updated);
    onSettingsUpdated(updated);
    setFeedback({ type: 'success', text: `Agency "${agencyName}" deleted.` });
  };

  // Template File Handlers
  const handleDownloadCurrentTemplate = async () => {
    try {
      const buffer = await StorageService.getOfficialTemplateBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = templateFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Error downloading template: ' + err.message);
    }
  };

  const handleUploadTemplateFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingTemplate(true);
    try {
      const buffer = await file.arrayBuffer();
      StorageService.saveOfficialTemplate(buffer, file.name);
      setTemplateFileName(file.name);

      const updated = StorageService.getSettings();
      onSettingsUpdated(updated);
      setFeedback({
        type: 'success',
        text: `Official Job Order template replaced with "${file.name}".`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: 'Failed to upload template: ' + err.message });
    } finally {
      setIsUploadingTemplate(false);
      e.target.value = '';
    }
  };

  const handleResetTemplate = async () => {
    const confirmed = window.confirm(
      'Reset official Job Order Excel template and mappings back to factory defaults?'
    );
    if (!confirmed) return;

    await StorageService.resetOfficialTemplateToDefault();
    const updated = StorageService.getSettings();
    setTemplateFileName(updated.templateFileName);
    setMapping(updated.templateMapping);
    onSettingsUpdated(updated);
    setFeedback({
      type: 'success',
      text: 'Official Job Order template reset to factory default.',
    });
  };

  // Template Mapping Handlers
  const handleUpdateMappingCell = (fieldKey: string, cell: string) => {
    setMapping((prev) => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        cell: cell.trim().toUpperCase(),
      },
    }));
  };

  const handleUpdateMappingSheet = (fieldKey: string, sheet: string) => {
    setMapping((prev) => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        sheet: sheet.trim(),
      },
    }));
  };

  const handleSaveMappings = () => {
    const updated: SystemSettings = {
      ...settings,
      templateMapping: mapping,
    };
    StorageService.saveSettings(updated);
    onSettingsUpdated(updated);
    setFeedback({ type: 'success', text: 'Template cell mappings saved successfully.' });
  };

  const handleResetMappingsToDefault = () => {
    setMapping(DEFAULT_TEMPLATE_MAPPING);
    const updated: SystemSettings = {
      ...settings,
      templateMapping: DEFAULT_TEMPLATE_MAPPING,
    };
    StorageService.saveSettings(updated);
    onSettingsUpdated(updated);
    setFeedback({ type: 'success', text: 'Template mappings reset to standard cells.' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            System & Workflow Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure order number sequence, workshop agencies, template file, and cell mappings
          </p>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. ORDER NUMBER CONFIGURATION */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Hash className="w-4 h-4 text-[#E1001A]" />
          <h2 className="text-sm font-bold text-slate-900">Sequential Order Number Settings</h2>
        </div>

        <form onSubmit={handleSaveOrderNumbers} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Starting Order Number
            </label>
            <input
              type="number"
              min="1"
              value={startingNum}
              onChange={(e) => setStartingNum(Number(e.target.value))}
              className="w-full p-2.5 rounded-lg border border-slate-300 font-mono focus:ring-[#E1001A] focus:border-[#E1001A]"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Default system baseline (e.g. 1250)
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Current / Next Order Number
            </label>
            <input
              type="number"
              min="1"
              value={nextNum}
              onChange={(e) => setNextNum(Number(e.target.value))}
              className="w-full p-2.5 rounded-lg border border-slate-300 font-mono font-bold text-[#E1001A] focus:ring-[#E1001A] focus:border-[#E1001A]"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Next maintenance order created will receive this number
            </span>
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#E1001A] hover:bg-[#C70017] text-white rounded-lg font-semibold shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Order Numbers</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. GMAIL INTEGRATION & AUTOMATED DISPATCH */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-red-50 text-red-600 flex items-center justify-center">
              <Mail className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Gmail Integration & Automated Dispatch</h2>
              <p className="text-[11px] text-slate-500">
                Send each job order directly via your Gmail account with the Car Number as the subject
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
            Gmail API
          </span>
        </div>

        {/* Sender Connection State */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            {googleUser?.photoURL ? (
              <img
                src={googleUser.photoURL}
                alt={googleUser.displayName || 'Gmail User'}
                className="w-10 h-10 rounded-full border border-slate-300 shadow-xs"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm shadow-xs">
                G
              </div>
            )}
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Sending Gmail Account:</div>
              <div className="font-semibold text-slate-900 flex items-center gap-2">
                <span>{googleUser?.email || 'No Gmail Account Connected'}</span>
                {hasGoogleToken && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Authorized for Sending
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Job orders will be dispatched with PDF attachment from this mailbox
              </p>
            </div>
          </div>

          <div>
            {hasGoogleToken ? (
              <button
                type="button"
                onClick={handleSignOutGoogle}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium shadow-xs transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect / Switch</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSignInGoogle}
                disabled={isAuthLoading}
                className="flex items-center gap-2 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                {isAuthLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Mail className="w-3.5 h-3.5" />
                )}
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Dispatch Settings Form */}
        <form onSubmit={handleSaveGmailSettings} className="space-y-4 pt-2 text-xs">
          {/* Target Central Address */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Designated Central Destination Address *
            </label>
            <input
              type="email"
              required
              value={centralEmail}
              onChange={(e) => setCentralEmail(e.target.value)}
              placeholder="e.g. mohamed.ahmed39675@gmail.com, garage@company.com, or central-fleet@company.com"
              className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Every job order can be dispatched to this designated address.
            </span>
          </div>

          {/* Email Subject Configuration - User Requirement: Subject Car Number */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">
                Email Subject Line Format *
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSubjectPattern('{carNumber}')}
                  className="text-[11px] text-[#E1001A] hover:underline font-medium"
                >
                  Reset to "{'{carNumber}'}" (Recommended)
                </button>
              </div>
            </div>
            <input
              type="text"
              required
              value={subjectPattern}
              onChange={(e) => setSubjectPattern(e.target.value)}
              placeholder="{carNumber}"
              className="w-full p-2.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-800 focus:ring-[#E1001A] focus:border-[#E1001A]"
            />
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-500">
              <span>Quick formats:</span>
              <button
                type="button"
                onClick={() => setSubjectPattern('{carNumber}')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 font-mono"
              >
                {'{carNumber}'}
              </button>
              <button
                type="button"
                onClick={() => setSubjectPattern('Job Order #{orderNumber} - {carNumber}')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 font-mono"
              >
                Job Order #{'{orderNumber}'} - {'{carNumber}'}
              </button>
            </div>
          </div>

          {/* Routing Checkboxes */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="font-semibold text-slate-700 text-xs">Dispatch Options:</div>
            <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={sendToCentral}
                onChange={(e) => setSendToCentral(e.target.checked)}
                className="rounded text-[#E1001A] focus:ring-[#E1001A]"
              />
              <span>Send each job order to the designated central address (<strong>{centralEmail}</strong>)</span>
            </label>
            <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={sendToEmployee}
                onChange={(e) => setSendToEmployee(e.target.checked)}
                className="rounded text-[#E1001A] focus:ring-[#E1001A]"
              />
              <span>Also allow sending to the vehicle's assigned driver / employee email</span>
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#E1001A] hover:bg-[#C70017] text-white rounded-lg font-semibold shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Gmail Dispatch Settings</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2B. GOOGLE SHEETS & DRIVE CLOUD STORAGE (HIGH PERFORMANCE ZERO-LAG) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Google Sheets & Drive Master Cloud Storage
              </h2>
              <p className="text-xs text-slate-500">
                Eliminates browser storage limits and system lag for 2,000+ orders by synchronizing with Google Sheets and Google Drive
              </p>
            </div>
          </div>
          {settings.googleSpreadsheetUrl && (
            <a
              href={settings.googleSpreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
            >
              <span>Open in Google Sheets</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {syncFeedback && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center justify-between ${
              syncFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <span>{syncFeedback.text}</span>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-slate-400 hover:text-slate-600 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Cloud Connection Status */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-800">
                Connected Google Account
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {googleUser ? (
                  <span className="font-medium text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {googleUser.email}
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Not connected yet. Connect your Google account to enable cloud sync.
                  </span>
                )}
              </div>
            </div>

            {!googleUser && (
              <button
                type="button"
                onClick={handleSignInGoogle}
                disabled={isAuthLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#E1001A] hover:bg-[#C70017] text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>{isAuthLoading ? 'Connecting...' : 'Connect Google Account'}</span>
              </button>
            )}
          </div>

          {settings.lastCloudSyncTimestamp && (
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200 flex items-center gap-2">
              <span className="font-semibold text-slate-700">Last Synced to Cloud:</span>
              <span>{new Date(settings.lastCloudSyncTimestamp).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Configuration Fields */}
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Google Spreadsheet ID / Target URL
            </label>
            <input
              type="text"
              value={googleSpreadsheetId}
              onChange={(e) => setGoogleSpreadsheetId(e.target.value)}
              placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms (Leave empty to auto-create)"
              className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Leave this blank to automatically create a dedicated <strong>"Fleet Maintenance Master Register"</strong> spreadsheet in your Google Drive, or paste the ID of an existing sheet.
            </p>
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={autoCloudSync}
              onChange={(e) => setAutoCloudSync(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
            />
            <div>
              <span className="font-semibold text-slate-800">
                Automatic Background Cloud Sync
              </span>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Automatically push order changes and imports directly to Google Sheets to keep your register constantly up-to-date and backup protected.
              </p>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handlePerformCloudSync}
            disabled={isSyncingCloud}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {isSyncingCloud ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Syncing with Google Sheets...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync All Data to Google Sheets Now</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSaveCloudSettings}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Cloud Settings</span>
          </button>
        </div>
      </div>

      {/* 3. AGENCIES MANAGEMENT */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Building2 className="w-4 h-4 text-[#E1001A]" />
          <h2 className="text-sm font-bold text-slate-900">Authorized Agencies & Workshops</h2>
        </div>

        {/* Add new agency input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newAgencyInput}
            onChange={(e) => setNewAgencyInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddAgency();
              }
            }}
            placeholder="Add new workshop or service agency..."
            className="flex-1 p-2 rounded-lg border border-slate-300 text-xs focus:ring-[#E1001A] focus:border-[#E1001A]"
          />
          <button
            type="button"
            onClick={handleAddAgency}
            className="flex items-center gap-1 px-4 py-2 bg-[#E1001A] hover:bg-[#C70017] text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Agency</span>
          </button>
        </div>

        {/* Agencies list */}
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs">
          {agencies.map((ag, idx) => (
            <div
              key={idx}
              className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              {editingAgencyIdx === idx ? (
                <div className="flex items-center gap-2 flex-1 mr-2">
                  <input
                    type="text"
                    value={editingAgencyVal}
                    onChange={(e) => setEditingAgencyVal(e.target.value)}
                    className="flex-1 p-1 rounded border border-[#E1001A] text-xs"
                  />
                  <button
                    onClick={() => handleSaveEditAgency(idx)}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingAgencyIdx(null)}
                    className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <span className="font-medium text-slate-800">{ag}</span>
              )}

              <div className="flex items-center gap-1">
                {editingAgencyIdx !== idx && (
                  <>
                    <button
                      onClick={() => handleStartEditAgency(idx)}
                      className="p-1 text-slate-500 hover:text-[#E1001A] rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteAgency(idx)}
                      className="p-1 text-slate-500 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. PREDEFINED MAINTENANCE TYPES */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Wrench className="w-4 h-4 text-[#E1001A]" />
          <h2 className="text-sm font-bold text-slate-900">Predefined Maintenance Types (V1)</h2>
        </div>

        <p className="text-xs text-slate-500">
          Standard classification options available in the New Maintenance Order dropdown:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {MAINTENANCE_TYPES.map((type) => (
            <div
              key={type}
              className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-semibold text-slate-800 text-center"
            >
              {type}
            </div>
          ))}
        </div>
      </div>

      {/* 4. OFFICIAL JOB ORDER EXCEL TEMPLATE */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#E1001A]" />
            <h2 className="text-sm font-bold text-slate-900">Official Job Order Excel Template</h2>
          </div>
          <button
            onClick={handleResetTemplate}
            className="text-xs text-slate-500 hover:text-[#E1001A] flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Factory Baseline</span>
          </button>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400 block">Active Template File:</span>
            <span className="font-bold text-slate-900 font-mono text-sm">
              {templateFileName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCurrentTemplate}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template</span>
            </button>

            <label className="flex items-center gap-1.5 px-3 py-2 bg-[#E1001A] hover:bg-[#C70017] text-white rounded-lg font-semibold cursor-pointer shadow-xs transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploadingTemplate ? 'Replacing...' : 'Upload Replacement (.xlsx)'}</span>
              <input
                type="file"
                accept=".xlsx"
                disabled={isUploadingTemplate}
                onChange={handleUploadTemplateFile}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 italic">
          Important: The original template is never modified. For each new order, the system makes a clean copy, populates the mapped cells, and preserves 100% of the fonts, borders, fills, and dimensions before converting directly to vector PDF.
        </p>
      </div>

      {/* 5. TEMPLATE FIELD MAPPING (System Field -> Excel Sheet -> Cell) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-[#E1001A]" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Template Cell Mapping Configuration</h2>
              <p className="text-[11px] text-slate-500">
                Map each System Field to its exact Excel Sheet name and Cell coordinate (e.g., G4, B8, D13)
              </p>
            </div>
          </div>

          <button
            onClick={handleResetMappingsToDefault}
            className="text-xs text-slate-500 hover:text-[#E1001A] transition-colors"
          >
            Reset Default Coordinates
          </button>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3">System Field</th>
                <th className="p-3">Field Key</th>
                <th className="p-3">Target Excel Sheet</th>
                <th className="p-3">Target Cell</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(mapping).map(([key, config]) => (
                <tr key={key} className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-800">{config.label}</td>
                  <td className="p-3 font-mono text-slate-400 text-[11px]">{key}</td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={config.sheet}
                      onChange={(e) => handleUpdateMappingSheet(key, e.target.value)}
                      className="w-32 p-1.5 rounded border border-slate-300 font-mono text-xs focus:ring-[#E1001A] focus:border-[#E1001A]"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={config.cell}
                      onChange={(e) => handleUpdateMappingCell(key, e.target.value)}
                      className="w-20 p-1.5 rounded border border-slate-300 font-mono font-bold text-[#E1001A] text-xs uppercase focus:ring-[#E1001A] focus:border-[#E1001A]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSaveMappings}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#E1001A] hover:bg-[#C70017] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Template Cell Mappings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
