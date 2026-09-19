import React, { useState } from 'react';
import {
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Key,
  AlertCircle,
  RefreshCw,
  Loader2,
  Mail,
} from 'lucide-react';
import {
  getAuthErrorInfo,
  setManualAccessToken,
  signInWithGoogleIdentityServices,
} from '../services/googleAuthService';

interface AuthErrorBannerProps {
  error: any;
  onRetry?: () => void;
  onTokenSet?: () => void;
  className?: string;
}

export const AuthErrorBanner: React.FC<AuthErrorBannerProps> = ({
  error,
  onRetry,
  onTokenSet,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [showManualToken, setShowManualToken] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [tokenFeedback, setTokenFeedback] = useState<string | null>(null);
  const [isGisSigningIn, setIsGisSigningIn] = useState(false);
  const [gisFeedback, setGisFeedback] = useState<string | null>(null);

  if (!error) return null;

  const info = getAuthErrorInfo(error);

  const handleCopyDomain = () => {
    if (!info.domain) return;
    navigator.clipboard.writeText(info.domain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDirectGis = async () => {
    setIsGisSigningIn(true);
    setGisFeedback(null);
    try {
      await signInWithGoogleIdentityServices();
      setGisFeedback('Connected successfully via Google Identity Services!');
      if (onTokenSet) onTokenSet();
    } catch (err: any) {
      console.error('Direct GIS sign-in failed:', err);
      setGisFeedback(err.message || 'Direct sign-in failed. Please ensure popups are allowed in your browser address bar.');
    } finally {
      setIsGisSigningIn(false);
    }
  };

  const handleApplyManualToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    setManualAccessToken(manualToken.trim(), manualEmail.trim() || undefined);
    setTokenFeedback('Access token applied successfully!');
    if (onTokenSet) onTokenSet();
  };

  if (!info.isUnauthorizedDomain) {
    return (
      <div className={`p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2.5 animate-in fade-in ${className}`}>
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
        <div className="flex-1">
          <p className="font-semibold">{info.title}</p>
          <p className="text-[11px] text-red-700 mt-0.5">{info.message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 text-[11px] font-semibold text-red-700 hover:text-red-900 underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Try signing in again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-amber-50/90 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-3 animate-in fade-in ${className}`}>
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-bold text-amber-900 text-sm flex items-center gap-2">
            Domain Authorization Required in Firebase
            <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-mono font-medium">
              auth/unauthorized-domain
            </span>
          </h4>
          <p className="text-amber-800 mt-1 leading-relaxed">
            Google Firebase Authentication requires that this preview domain is added to your project's list of <strong>Authorized domains</strong> before popups can proceed.
          </p>
        </div>
      </div>

      {/* Domain Copy Box */}
      <div className="bg-white/80 border border-amber-200 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
            Domain to authorize:
          </span>
          <code className="text-xs font-mono font-bold text-slate-800 break-all select-all">
            {info.domain}
          </code>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyDomain}
            className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Domain</span>
              </>
            )}
          </button>

          <a
            href={info.settingsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <span>Firebase Settings</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Instructions list */}
      <div className="bg-amber-100/60 rounded-lg p-3 space-y-1.5 text-[11px] text-amber-900">
        <div className="font-semibold text-amber-950">Quick 2-Step Fix:</div>
        <ol className="list-decimal list-inside space-y-1 text-amber-900/90 pl-1">
          <li>
            Click <strong>Firebase Settings</strong> above (or visit Firebase Console &rarr; Authentication &rarr; Settings &rarr; <em>Authorized domains</em>).
          </li>
          <li>
            Click <strong>Add domain</strong>, paste <code className="font-mono bg-white/60 px-1 py-0.5 rounded">{info.domain}</code>, and save.
          </li>
          <li>
            Click <strong>"Try Signing In Again"</strong> below.
          </li>
        </ol>
      </div>

      {/* Direct GIS Connection Option & Retry */}
      <div className="space-y-2 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDirectGis}
            disabled={isGisSigningIn}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            {isGisSigningIn ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Mail className="w-3.5 h-3.5" />
            )}
            <span>Sign In Directly with Google (Bypass Firebase Domain)</span>
          </button>

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3.5 py-2 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Firebase Sign-In</span>
            </button>
          )}
        </div>

        {gisFeedback && (
          <div className="text-[11px] font-medium p-2 bg-white/90 border border-amber-200 rounded text-amber-900 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" />
            <span>{gisFeedback}</span>
          </div>
        )}

        <div className="text-[10.5px] text-amber-800/80 flex items-center gap-1">
          <span>Tip: If a popup doesn't appear, check your browser's address bar to ensure popups are allowed for this site.</span>
        </div>
      </div>

      {/* Manual Access Token Alternative */}
      <div className="pt-2 border-t border-amber-200/80">
        <button
          type="button"
          onClick={() => setShowManualToken(!showManualToken)}
          className="text-[11px] text-amber-800 hover:text-amber-950 font-semibold flex items-center gap-1.5"
        >
          <Key className="w-3 h-3" />
          <span>Or manually enter an OAuth Access Token (developer bypass)</span>
          {showManualToken ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showManualToken && (
          <form onSubmit={handleApplyManualToken} className="mt-2.5 p-3 bg-white rounded-lg border border-amber-200 space-y-2 animate-in fade-in">
            <p className="text-[11px] text-slate-600">
              If you have an OAuth Access Token (e.g. from Google OAuth Playground), you can paste it here to authenticate instantly:
            </p>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                OAuth Access Token (starts with ya29...)
              </label>
              <input
                type="text"
                required
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="ya29.a0..."
                className="w-full p-2 text-xs font-mono border border-slate-300 rounded bg-white text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                Associated Email (optional)
              </label>
              <input
                type="email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full p-2 text-xs border border-slate-300 rounded bg-white text-slate-900"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              {tokenFeedback ? (
                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {tokenFeedback}
                </span>
              ) : (
                <span />
              )}
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold text-xs"
              >
                Apply Token
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
