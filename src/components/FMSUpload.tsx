import React, { useState } from 'react';
import {
  UploadCloud,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Search,
  Car,
  User,
  Mail,
  Hash,
  Shield,
  RefreshCw,
  Info,
  Cloud,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  DownloadCloud,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { FMSVehicleRecord, SystemSettings } from '../types';
import { StorageService, FMSMetadata } from '../services/storageService';
import { parseFMSExcel, generateSampleFMSFile } from '../services/excelService';
import { CloudSyncModal } from './CloudSyncModal';
import { loadFleetFromGoogleSheet } from '../services/googleSheetsService';
import { getAccessToken, googleSignIn } from '../services/googleAuthService';

interface FMSUploadProps {
  fmsMeta: FMSMetadata;
  onFMSUpdated: () => void;
}

export const FMSUpload: React.FC<FMSUploadProps> = ({ fmsMeta, onFMSUpdated }) => {
  const [vehicles, setVehicles] = useState<FMSVehicleRecord[]>(() =>
    StorageService.getFMSVehicles()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Cloud & Pagination State
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);
  const [isQuickPulling, setIsQuickPulling] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>(() => StorageService.getSettings());

  // Selection state for batch operations
  const [selectedCarCodes, setSelectedCarCodes] = useState<Set<string>>(new Set());
  const [vehicleToDelete, setVehicleToDelete] = useState<FMSVehicleRecord | null>(null);
  const [isDeleteSelectedModalOpen, setIsDeleteSelectedModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);

  // Toggle single vehicle selection
  const handleToggleSelectVehicle = (carCode: string) => {
    setSelectedCarCodes((prev) => {
      const next = new Set(prev);
      if (next.has(carCode)) {
        next.delete(carCode);
      } else {
        next.add(carCode);
      }
      return next;
    });
  };

  // Toggle select all on current page
  const handleToggleSelectPage = () => {
    const pageCodes = paginatedVehicles.map((v) => v.carCode);
    const allPageSelected = pageCodes.length > 0 && pageCodes.every((code) => selectedCarCodes.has(code));

    setSelectedCarCodes((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageCodes.forEach((code) => next.delete(code));
      } else {
        pageCodes.forEach((code) => next.add(code));
      }
      return next;
    });
  };

  // Select all filtered vehicles across all pages
  const handleSelectAllFiltered = () => {
    const allFilteredCodes = filteredVehicles.map((v) => v.carCode);
    setSelectedCarCodes(new Set(allFilteredCodes));
  };

  // Clear all selection
  const handleClearSelection = () => {
    setSelectedCarCodes(new Set());
  };

  // Single vehicle deletion
  const handleConfirmDelete = () => {
    if (!vehicleToDelete) return;
    const code = vehicleToDelete.carCode;
    const num = vehicleToDelete.carNumber;
    const ok = StorageService.deleteFMSVehicle(code);
    if (ok) {
      const updated = StorageService.getFMSVehicles();
      setVehicles(updated);
      setSelectedCarCodes((prev) => {
        const next = new Set(prev);
        next.delete(code);
        return next;
      });
      onFMSUpdated();
      setUploadSuccess(`Vehicle ${code} (${num}) row deleted from FMS.`);
      setVehicleToDelete(null);
    } else {
      setUploadError(`Failed to delete vehicle row for ${code}.`);
      setVehicleToDelete(null);
    }
  };

  // Delete Selected vehicles
  const handleConfirmDeleteSelected = () => {
    if (selectedCarCodes.size === 0) return;
    const codes = Array.from(selectedCarCodes);
    const count = StorageService.deleteFMSVehicles(codes);
    const updated = StorageService.getFMSVehicles();
    setVehicles(updated);
    setSelectedCarCodes(new Set());
    setIsDeleteSelectedModalOpen(false);
    onFMSUpdated();
    setUploadSuccess(`Successfully deleted ${count} selected vehicle(s) from FMS.`);
  };

  // Delete All vehicles
  const handleConfirmDeleteAll = () => {
    StorageService.clearAllFMSVehicles();
    setVehicles([]);
    setSelectedCarCodes(new Set());
    setIsDeleteAllModalOpen(false);
    onFMSUpdated();
    setUploadSuccess('All vehicles have been removed from the active FMS fleet.');
  };

  // Filter vehicles
  const filteredVehicles = vehicles.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      v.carCode.toLowerCase().includes(q) ||
      v.carNumber.toLowerCase().includes(q) ||
      v.employeeName.toLowerCase().includes(q) ||
      v.staffId.toLowerCase().includes(q) ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q)
    );
  });

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Paginated vehicles slice for instant rendering with 2,000+ rows
  const totalRows = filteredVehicles.length;
  const totalPages = rowsPerPage === -1 ? 1 : Math.ceil(totalRows / rowsPerPage) || 1;
  const paginatedVehicles = React.useMemo(() => {
    if (rowsPerPage === -1) return filteredVehicles;
    const start = (currentPage - 1) * rowsPerPage;
    return filteredVehicles.slice(start, start + rowsPerPage);
  }, [filteredVehicles, currentPage, rowsPerPage]);

  const handleQuickPullFromCloud = async () => {
    if (!settings.googleSpreadsheetId) {
      setIsCloudModalOpen(true);
      return;
    }

    setIsQuickPulling(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        token = authRes.accessToken;
      }
      const loaded = await loadFleetFromGoogleSheet(token, settings.googleSpreadsheetId);
      if (loaded.length === 0) {
        throw new Error('No vehicle records found in the "FMS Vehicles" tab of the Google Sheet.');
      }
      StorageService.setFMSVehicles(loaded, 'Google_Sheets_Sync.xlsx');
      setVehicles(loaded);
      onFMSUpdated();
      setUploadSuccess(`Successfully refreshed ${loaded.length} vehicles from Google Sheets!`);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to pull fleet from Google Sheets.');
    } finally {
      setIsQuickPulling(false);
    }
  };

  // Handle Excel File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);

    try {
      const buffer = await file.arrayBuffer();
      const parsedRecords = await parseFMSExcel(buffer);

      if (parsedRecords.length === 0) {
        throw new Error('No valid vehicle records found in the uploaded file.');
      }

      // Save as active FMS data
      StorageService.setFMSVehicles(parsedRecords, file.name);
      setVehicles(parsedRecords);
      onFMSUpdated();

      setUploadSuccess(
        `Successfully loaded ${parsedRecords.length} vehicles from "${file.name}". Existing historical orders remain preserved.`
      );
    } catch (err: any) {
      console.error('FMS parse error:', err);
      setUploadError(err.message || 'Failed to parse FMS Excel file.');
    } finally {
      setIsUploading(false);
      // Reset input value
      e.target.value = '';
    }
  };

  // Download Sample FMS template
  const handleDownloadSample = async () => {
    try {
      const buffer = await generateSampleFMSFile();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Sample_FMS_Fleet_Master.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Error downloading sample: ' + err.message);
    }
  };

  // Reset to default sample fleet
  const handleResetToDemoFleet = async () => {
    const confirmed = window.confirm(
      'Reset active FMS fleet to standard demo 10 vehicles?'
    );
    if (!confirmed) return;

    const sampleBuffer = await generateSampleFMSFile();
    const parsed = await parseFMSExcel(sampleBuffer);
    StorageService.setFMSVehicles(parsed, 'Standard_Demo_Fleet.xlsx');
    setVehicles(parsed);
    onFMSUpdated();
    setUploadSuccess('Active FMS fleet reset to 10 standard demo vehicles.');
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            FMS Fleet Master Upload
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload the latest FMS Excel file to update vehicle and employee data for future maintenance requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-download-sample-fms"
            onClick={handleDownloadSample}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample FMS Excel</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {uploadSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 text-emerald-800 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {uploadError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-800 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* UPLOAD DROPZONE & RULES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Card */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-[#E1001A]" />
            <span>Upload Latest FMS Excel</span>
          </h2>

          <label className="border-2 border-dashed border-slate-300 hover:border-[#E1001A] rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-red-50/10 block">
            <FileSpreadsheet className="w-10 h-10 text-[#E1001A] mb-3" />
            <span className="text-sm font-bold text-slate-800">
              {isUploading ? 'Parsing & Verifying FMS Excel...' : 'Click to select or drag & drop FMS Excel file'}
            </span>
            <span className="text-xs text-slate-500 mt-1">
              Supports Microsoft Excel (.xlsx, .xls)
            </span>
            <input
              id="file-input-fms"
              type="file"
              accept=".xlsx, .xls"
              disabled={isUploading}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500">
              Active File:{' '}
              <span className="font-semibold text-slate-800 font-mono">
                {fmsMeta.fileName}
              </span>{' '}
              ({vehicles.length} vehicles registered)
            </div>

            <button
              onClick={handleResetToDemoFleet}
              className="text-xs font-medium text-slate-600 hover:text-[#E1001A] flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Demo Fleet</span>
            </button>
          </div>
        </div>

        {/* FMS Requirements & Rules Card */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-xs text-slate-600 space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Info className="w-4 h-4 text-[#E1001A]" />
            <span>Required FMS Excel Columns</span>
          </div>

          <p className="text-slate-500">
            The Excel file must contain or support these vehicle & employee columns:
          </p>

          <ul className="space-y-1.5 list-disc list-inside text-slate-700 font-mono text-[11px]">
            <li><strong>Car Code</strong> (Main lookup key)</li>
            <li>Car Number (Plate)</li>
            <li>Chassis Number</li>
            <li>Motor Number</li>
            <li><strong>Make</strong> (Separated column, e.g. Toyota, Nissan, Ford)</li>
            <li><strong>Model</strong> (Separated column, e.g. Hilux, Patrol, Ranger)</li>
            <li><strong>Year</strong> (Separated column, e.g. 2023, 2024)</li>
            <li>Employee Name / Car Owner</li>
            <li>Staff ID</li>
            <li>Employee Email</li>
          </ul>

          <div className="p-3 bg-white rounded border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
            <strong>Historical Integrity Rule:</strong> When a new FMS file is uploaded, existing Main Orders will NOT change. Each past order permanently retains the FMS snapshot taken when it was created.
          </div>
        </div>
      </div>

      {/* CURRENT ACTIVE FMS VEHICLES REGISTER */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>Active FMS Fleet Register ({vehicles.length} Vehicles)</span>
              {settings.googleSpreadsheetId && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                  Cloud Synced
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              Vehicles currently available for automatic lookup during maintenance order creation
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsCloudModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors"
              title="Sync or Link Google Sheets"
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              <span>Google Sheets</span>
            </button>

            {settings.googleSpreadsheetId && (
              <button
                onClick={handleQuickPullFromCloud}
                disabled={isQuickPulling}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                title="Reload 2,000+ vehicles register directly from Google Sheets"
              >
                <DownloadCloud className="w-3.5 h-3.5 text-slate-600" />
                <span>{isQuickPulling ? 'Refreshing...' : 'Reload from Cloud'}</span>
              </button>
            )}

            {vehicles.length > 0 && (
              <button
                onClick={() => setIsDeleteAllModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition-colors shadow-xs"
                title="Delete all vehicles from active FMS fleet"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span>Delete All</span>
              </button>
            )}

            <div className="relative w-full sm:w-60">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Car Code, Plate, Driver..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-[#E1001A] focus:border-[#E1001A]"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        {/* BULK SELECTION ACTION BAR */}
        {selectedCarCodes.size > 0 && (
          <div className="bg-red-50/90 border-b border-red-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-red-900 bg-red-100/80 px-2 py-0.5 rounded border border-red-200">
                {selectedCarCodes.size} vehicle{selectedCarCodes.size > 1 ? 's' : ''} selected
              </span>
              {selectedCarCodes.size < filteredVehicles.length ? (
                <button
                  onClick={handleSelectAllFiltered}
                  className="text-xs text-red-700 hover:text-red-900 underline font-semibold ml-1 cursor-pointer"
                >
                  Select all {filteredVehicles.length} matching vehicles
                </button>
              ) : (
                <span className="text-xs text-red-700 font-medium ml-1">
                  (All {filteredVehicles.length} matching vehicles selected)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors cursor-pointer"
              >
                Clear Selection
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteSelectedModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-md shadow-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedCarCodes.size})</span>
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedVehicles.length > 0 &&
                      paginatedVehicles.every((v) => selectedCarCodes.has(v.carCode))
                    }
                    onChange={handleToggleSelectPage}
                    className="rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer w-3.5 h-3.5"
                    title={
                      paginatedVehicles.length > 0 &&
                      paginatedVehicles.every((v) => selectedCarCodes.has(v.carCode))
                        ? 'Deselect page'
                        : 'Select all on this page'
                    }
                  />
                </th>
                <th className="p-3">Car Code</th>
                <th className="p-3">Car Number</th>
                <th className="p-3">Make</th>
                <th className="p-3">Model</th>
                <th className="p-3">Year</th>
                <th className="p-3">Chassis No</th>
                <th className="p-3">Motor No</th>
                <th className="p-3">Employee / Owner</th>
                <th className="p-3">Staff ID</th>
                <th className="p-3">Employee Email</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-6 text-center text-slate-400">
                    No vehicles match your search.
                  </td>
                </tr>
              ) : (
                paginatedVehicles.map((v) => (
                  <tr
                    key={v.carCode}
                    className={`hover:bg-slate-50 transition-colors ${
                      selectedCarCodes.has(v.carCode) ? 'bg-red-50/40' : ''
                    }`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedCarCodes.has(v.carCode)}
                        onChange={() => handleToggleSelectVehicle(v.carCode)}
                        className="rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer w-3.5 h-3.5"
                      />
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900">
                      <span className="px-2 py-0.5 rounded bg-red-50 text-[#E1001A] border border-red-200">
                        {v.carCode}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">{v.carNumber}</td>
                    <td className="p-3 font-medium text-slate-800">{v.make}</td>
                    <td className="p-3 text-slate-700">{v.model}</td>
                    <td className="p-3 font-mono text-slate-700">{v.year}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">
                      {v.chassisNumber}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">
                      {v.motorNumber}
                    </td>
                    <td className="p-3 font-medium text-slate-800">{v.employeeName}</td>
                    <td className="p-3 text-slate-600">{v.staffId}</td>
                    <td className="p-3 text-slate-600 truncate max-w-[160px]" title={v.employeeEmail}>
                      {v.employeeEmail}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setVehicleToDelete(v)}
                        title={`Delete vehicle ${v.carCode} from FMS`}
                        className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* HIGH-PERFORMANCE PAGINATION BAR FOR FMS FLEET */}
        {filteredVehicles.length > 0 && (
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
                of <span className="font-semibold text-slate-800">{totalRows}</span> vehicles
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

      {/* CLOUD SYNC MODAL */}
      <CloudSyncModal
        isOpen={isCloudModalOpen}
        onClose={() => {
          setIsCloudModalOpen(false);
          setSettings(StorageService.getSettings());
        }}
        onSyncComplete={() => {
          setVehicles(StorageService.getFMSVehicles());
          setSettings(StorageService.getSettings());
          onFMSUpdated();
        }}
      />

      {/* DELETE VEHICLE ROW CONFIRMATION MODAL */}
      {vehicleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete FMS Vehicle Row</h3>
                <p className="text-xs text-slate-500">Remove record to update or replace vehicle</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete vehicle{' '}
              <span className="font-bold text-slate-800">
                {vehicleToDelete.carCode} &bull; {vehicleToDelete.carNumber}
              </span>{' '}
              ({vehicleToDelete.make} {vehicleToDelete.model}) from the active FMS fleet register?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setVehicleToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs"
              >
                Delete Row
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE SELECTED CONFIRMATION MODAL */}
      {isDeleteSelectedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Selected Vehicles</h3>
                <p className="text-xs text-slate-500">
                  {selectedCarCodes.size} vehicle{selectedCarCodes.size > 1 ? 's' : ''} queued for removal
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete the{' '}
              <span className="font-bold text-slate-900">{selectedCarCodes.size}</span> selected vehicle
              records from the FMS fleet register?
            </p>

            <div className="max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap gap-1.5 text-[11px]">
              {Array.from(selectedCarCodes).map((code) => {
                const rec = vehicles.find((v) => v.carCode === code);
                return (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-300 font-mono text-slate-800"
                  >
                    <span className="font-bold text-red-600">{code}</span>
                    {rec?.carNumber && <span className="text-slate-500">({rec.carNumber})</span>}
                  </span>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteSelectedModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSelected}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                Delete {selectedCarCodes.size} Vehicle{selectedCarCodes.size > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ALL FLEET CONFIRMATION MODAL */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete All FMS Vehicles</h3>
                <p className="text-xs text-slate-500">Clear entire fleet register ({vehicles.length} records)</p>
              </div>
            </div>

            <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-xs text-red-800 space-y-1 leading-relaxed">
              <p className="font-semibold">Warning: This action will empty the fleet register.</p>
              <p className="text-[11px] text-red-700">
                All {vehicles.length} vehicles will be removed. Existing maintenance job orders will not be affected, but vehicle auto-fill will be unavailable until a new Excel list is uploaded or reloaded from Google Sheets.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteAllModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                Yes, Delete All {vehicles.length} Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
