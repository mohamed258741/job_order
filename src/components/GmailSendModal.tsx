import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Car,
  FileText,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  LogOut,
  Building2,
  Wrench,
  Send,
} from 'lucide-react';
import { MainOrder, SystemSettings } from '../types';
import {
  getCurrentUser,
  googleSignIn,
  logoutGoogle,
  getAccessToken,
} from '../services/googleAuthService';
import {
  sendJobOrderViaGmail,
  formatEmailSubject,
} from '../services/gmailService';
import { StorageService } from '../services/storageService';
import { AuthErrorBanner } from './AuthErrorBanner';

interface GmailSendModalProps {
  order: MainOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (order: MainOrder, recipient: string, subject: string) => void;
}

export const GmailSendModal: React.FC<GmailSendModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [currentUser, setCurrentUser] = useState<any>(getCurrentUser());
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<any>(null);

  // Form states
  const [recipientChoice, setRecipientChoice] = useState<'central' | 'employee' | 'custom'>('central');
  const [customEmail, setCustomEmail] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [coordinatorNotes, setCoordinatorNotes] = useState<string>('');

  const settings: SystemSettings = StorageService.getSettings();
  const centralEmail = settings.centralRecipientEmail || 'mohamed.ahmed39675@gmail.com';
  const employeeEmail = order?.employeeEmail || '';

  // Check auth state on open
  useEffect(() => {
    if (isOpen) {
      checkAuth();
      if (order) {
        // As requested: Subject is Car Number
        const defaultSubject = formatEmailSubject(order, settings.emailSubjectPattern || '{carNumber}');
        setSubject(defaultSubject);

        // Default recipient logic
        if (settings.sendToCentralEmail && centralEmail) {
          setRecipientChoice('central');
        } else if (order.employeeEmail) {
          setRecipientChoice('employee');
        } else {
          setRecipientChoice('custom');
          setCustomEmail(centralEmail || '');
        }
      }
      setErrorMessage(null);
      setAuthError(null);
    }
  }, [isOpen, order]);

  const checkAuth = async () => {
    const user = getCurrentUser();
    setCurrentUser(user);
    const token = await getAccessToken();
    setHasToken(!!token);
    if (token) {
      setAuthError(null);
      setErrorMessage(null);
    }
  };

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      setCurrentUser(res.user);
      setHasToken(true);
      setAuthError(null);
    } catch (err: any) {
      setAuthError(err);
      setErrorMessage(err.message || 'Google authentication failed.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    await logoutGoogle();
    setCurrentUser(null);
    setHasToken(false);
  };

  const getEffectiveRecipient = (): string => {
    if (recipientChoice === 'central') return centralEmail;
    if (recipientChoice === 'employee') return employeeEmail;
    return customEmail.trim();
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    const recipient = getEffectiveRecipient();
    if (!recipient) {
      setErrorMessage('Please specify a valid recipient email address.');
      return;
    }

    if (!hasToken) {
      setErrorMessage('Please connect your Gmail account before sending.');
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      const result = await sendJobOrderViaGmail({
        order,
        recipientEmail: recipient,
        subject: subject.trim() || order.carNumber,
        customNotes: coordinatorNotes.trim() || undefined,
      });

      // Update Order in storage
      const updatedOrder: MainOrder = {
        ...order,
        emailStatus: 'Sent',
        emailDate: new Date().toLocaleString(),
        status: order.status === 'Request Received' ? 'Sent to Employee' : order.status,
      };

      StorageService.updateMainOrder(updatedOrder);
      StorageService.appendAuditLog(
        order.orderNumber,
        'Email Sent via Gmail',
        `Dispatched from ${currentUser?.email || 'Gmail'} to ${recipient} (Subject: "${result.subject}") with Job Order PDF attached`
      );

      onSuccess(updatedOrder, recipient, result.subject);
      onClose();
    } catch (err: any) {
      console.error('Failed to send Gmail:', err);
      setErrorMessage(err.message || 'Failed to dispatch email via Gmail API.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen || !order) return null;

  const targetRecipient = getEffectiveRecipient();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-6 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-linear-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                Send Job Order via Gmail
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-red-500/20 text-red-200 border border-red-400/30">
                  Gmail API
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Official transmission for Order #{order.orderNumber} • Subject: Car Number
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSendEmail} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {/* SENDER GMAIL ACCOUNT CARD */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Gmail User'}
                  className="w-9 h-9 rounded-full border border-slate-300"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  G
                </div>
              )}
              <div>
                <div className="text-[11px] text-slate-500 font-medium">Sending From (Gmail Account):</div>
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <span>{currentUser?.email || 'No Gmail Account Connected'}</span>
                  {hasToken && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Connected
                    </span>
                  )}
                </div>
              </div>
            </div>

            {hasToken ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 self-start sm:self-auto font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Switch / Disconnect</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold shadow-xs transition-colors self-start sm:self-auto"
              >
                {isAuthenticating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E1001A]" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                )}
                <span>Sign in with Google</span>
              </button>
            )}
          </div>

          {/* AUTH ERROR / DOMAIN DIAGNOSTICS */}
          {authError && (
            <AuthErrorBanner
              error={authError}
              onRetry={handleSignIn}
              onTokenSet={checkAuth}
            />
          )}

          {/* GENERAL ERROR NOTIFICATION */}
          {errorMessage && !authError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Unable to proceed</p>
                <p className="text-[11px]">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* RECIPIENT DESTINATION ADDRESS */}
          <div className="space-y-2">
            <label className="block font-semibold text-slate-800">
              Target Destination Email Address *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label
                className={`p-2.5 rounded-lg border flex flex-col cursor-pointer transition-colors ${
                  recipientChoice === 'central'
                    ? 'border-[#E1001A] bg-red-50/60 text-slate-900'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs">Designated Address</span>
                  <input
                    type="radio"
                    name="recipientChoice"
                    checked={recipientChoice === 'central'}
                    onChange={() => setRecipientChoice('central')}
                    className="text-[#E1001A] focus:ring-[#E1001A]"
                  />
                </div>
                <span className="text-[11px] truncate text-slate-500 font-mono" title={centralEmail}>
                  {centralEmail}
                </span>
              </label>

              {employeeEmail ? (
                <label
                  className={`p-2.5 rounded-lg border flex flex-col cursor-pointer transition-colors ${
                    recipientChoice === 'employee'
                      ? 'border-[#E1001A] bg-red-50/60 text-slate-900'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs">Assigned Employee</span>
                    <input
                      type="radio"
                      name="recipientChoice"
                      checked={recipientChoice === 'employee'}
                      onChange={() => setRecipientChoice('employee')}
                      className="text-[#E1001A] focus:ring-[#E1001A]"
                    />
                  </div>
                  <span className="text-[11px] truncate text-slate-500 font-mono" title={employeeEmail}>
                    {employeeEmail}
                  </span>
                </label>
              ) : (
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 opacity-60">
                  <span className="font-semibold text-xs block">Employee (None)</span>
                  <span className="text-[11px]">No email on file</span>
                </div>
              )}

              <label
                className={`p-2.5 rounded-lg border flex flex-col cursor-pointer transition-colors ${
                  recipientChoice === 'custom'
                    ? 'border-[#E1001A] bg-red-50/60 text-slate-900'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs">Custom Email</span>
                  <input
                    type="radio"
                    name="recipientChoice"
                    checked={recipientChoice === 'custom'}
                    onChange={() => setRecipientChoice('custom')}
                    className="text-[#E1001A] focus:ring-[#E1001A]"
                  />
                </div>
                <span className="text-[11px] text-slate-500">Enter custom recipient</span>
              </label>
            </div>

            {recipientChoice === 'custom' && (
              <div className="pt-1 animate-in fade-in">
                <input
                  type="email"
                  required
                  placeholder="e.g. dispatch@company.com or workshop@agency.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs focus:ring-[#E1001A] focus:border-[#E1001A]"
                />
              </div>
            )}
          </div>

          {/* SUBJECT LINE - SPECIFIC REQUIREMENT: CAR NUMBER */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-800">
                Email Subject <span className="text-slate-400 font-normal">(Default: Car Number)</span> *
              </label>
              <button
                type="button"
                onClick={() => setSubject(order.carNumber)}
                className="text-[11px] text-[#E1001A] hover:underline font-medium"
              >
                Reset to "{order.carNumber}"
              </button>
            </div>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 text-xs focus:ring-[#E1001A] focus:border-[#E1001A]"
              placeholder="Car Number"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Vehicle Car Number <strong>{order.carNumber}</strong> is populated directly in the subject line.
            </p>
          </div>

          {/* ATTACHMENT DETAILS */}
          <div className="p-3 bg-red-50/60 border border-red-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#E1001A] text-white flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-slate-900 text-xs">
                  Job_Order_{order.orderNumber}_{order.carNumber}.pdf
                </div>
                <div className="text-[11px] text-slate-500">
                  Official Vector PDF &bull; Formatted from Excel Template
                </div>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-[#E1001A] bg-red-100 px-2 py-0.5 rounded-md">
              Attached
            </span>
          </div>

          {/* OPTIONAL COORDINATOR NOTES */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Optional Note / Instructions to Recipient
            </label>
            <textarea
              rows={2}
              value={coordinatorNotes}
              onChange={(e) => setCoordinatorNotes(e.target.value)}
              placeholder="e.g. Please approve work order upon vehicle arrival or note priority repair."
              className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs focus:ring-[#E1001A] focus:border-[#E1001A]"
            />
          </div>

          {/* SUMMARY REVIEW CARD (Explicit Confirmation Safeguard) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Dispatch Verification Preview
              </span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-medium">
                RFC 5322 Compliant
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="sm:col-span-2 bg-white p-2 rounded border border-slate-200">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>From: <strong className="text-slate-800">{currentUser?.email || 'Gmail Account'}</strong></span>
                  <span>To: <strong className="text-[#E1001A] font-mono">{targetRecipient || 'Not specified'}</strong></span>
                </div>
                <div className="mt-1 text-[11px] text-slate-700">
                  Subject: <strong className="text-slate-900">{subject || order.carNumber}</strong>
                </div>
              </div>

              <div>
                <span className="text-slate-400">Order:</span>{' '}
                <span className="font-semibold text-slate-800">#{order.orderNumber}</span>
              </div>
              <div>
                <span className="text-slate-400">Car Code:</span>{' '}
                <span className="font-semibold text-slate-800">{order.carCode}</span>
              </div>
              <div>
                <span className="text-slate-400">Car Number:</span>{' '}
                <span className="font-bold text-slate-900">{order.carNumber}</span>
              </div>
              <div>
                <span className="text-slate-400">Agency:</span>{' '}
                <span className="font-semibold text-slate-800">{order.agency}</span>
              </div>
              <div>
                <span className="text-slate-400">Driver:</span>{' '}
                <span className="text-slate-800">{order.employeeName}</span>
              </div>
              <div>
                <span className="text-slate-400">Maintenance:</span>{' '}
                <span className="text-slate-800">{order.maintenanceType}</span>
              </div>
            </div>

            {/* Delivery Guidance Notes */}
            {currentUser?.email && targetRecipient && currentUser.email.toLowerCase() === targetRecipient.toLowerCase() ? (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  <strong>Sending to your own account:</strong> Gmail groups self-sent emails directly into your <em>Sent</em> folder and might not show an unread badge in your Inbox. To test receiving, try sending to a different recipient address (such as another company or personal email).
                </span>
              </div>
            ) : (
              <div className="p-2 bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-600 flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#E1001A]" />
                <span>
                  Emails are sent with full RFC-compliant headers (From, Date, Message-ID) and a high-resolution PDF attachment. If the other recipient does not see it in their Primary Inbox, ask them to check their <strong>Spam / Junk</strong> folder or search for <strong>"{order.carNumber}"</strong>.
                </span>
              </div>
            )}
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>

            {hasToken ? (
              <button
                type="submit"
                disabled={isSending || !targetRecipient}
                className="px-5 py-2.5 bg-[#E1001A] hover:bg-[#C70017] disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-red-600/20 transition-all flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending via Gmail...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Email ({order.carNumber})</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="px-5 py-2.5 bg-[#E1001A] hover:bg-[#C70017] text-white rounded-xl font-bold shadow-md shadow-red-600/20 transition-all flex items-center gap-2"
              >
                {isAuthenticating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                <span>Sign in with Google to Send</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
