import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  FileSpreadsheet,
  UploadCloud,
  Settings as SettingsIcon,
  ShieldCheck,
  Mail,
  CheckCircle2,
  LogOut,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { StorageService } from '../services/storageService';
import {
  getCurrentUser,
  googleSignIn,
  logoutGoogle,
  getAccessToken,
  initAuth,
} from '../services/googleAuthService';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  ordersCount: number;
  vehiclesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  ordersCount,
  vehiclesCount,
}) => {
  const [user, setUser] = useState<any>(getCurrentUser());
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (authUser) => {
        setUser(authUser);
        setHasToken(true);
      },
      () => {
        setUser(getCurrentUser());
        checkToken();
      }
    );
    checkToken();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const checkToken = async () => {
    const token = await getAccessToken();
    setHasToken(!!token);
    setUser(getCurrentUser());
  };

  const handleConnectGmail = async () => {
    setIsSigningIn(true);
    try {
      const res = await googleSignIn();
      setUser(res.user);
      setHasToken(true);
    } catch (err) {
      console.error('Gmail login failed', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleDisconnect = async () => {
    await logoutGoogle();
    setUser(null);
    setHasToken(false);
  };
  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'new-order' as ActiveTab,
      label: 'New Maintenance Order',
      icon: PlusCircle,
    },
    {
      id: 'main-orders' as ActiveTab,
      label: 'Main Orders',
      icon: FileSpreadsheet,
      badge: ordersCount,
    },
    {
      id: 'fms-upload' as ActiveTab,
      label: 'FMS Upload',
      icon: UploadCloud,
      subtext: `${vehiclesCount} Cars`,
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Settings',
      icon: SettingsIcon,
    },
  ];

  return (
    <header className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & System Identity */}
          <div className="flex items-center gap-3">
            <div className="h-11 px-2.5 py-1 rounded-xl bg-white flex items-center justify-center shadow-xs border border-slate-200">
              <img
                src="/logo.svg"
                alt="e& etisalat and"
                className="h-8 w-auto object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                  <span>e& Fleet Operations</span>
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-950/80 text-red-400 border border-red-700/60 rounded">
                  etisalat and
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Fleet Maintenance & Job Orders Portal
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#E1001A] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`text-xs px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-[#B00014] text-white'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.subtext && (
                    <span className="text-xs text-slate-400 opacity-80 hidden lg:inline">
                      ({item.subtext})
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Gmail Account & Fleet Coordinator Badges */}
          <div className="flex items-center gap-2 text-xs">
            {hasToken && user ? (
              <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-md px-2.5 py-1.5 text-slate-200">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Mail className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden xl:inline text-[11px] font-mono text-slate-300 max-w-[180px] truncate" title={user.email}>
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  title="Disconnect Gmail Account"
                  className="text-slate-400 hover:text-red-400 p-0.5 rounded ml-1"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectGmail}
                disabled={isSigningIn}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md px-2.5 py-1.5 text-xs font-semibold shadow-xs transition-colors"
                title="Connect Gmail to dispatch job orders"
              >
                {isSigningIn ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Mail className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Connect Gmail</span>
              </button>
            )}

            <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 rounded-md px-2.5 py-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300 font-medium">Fleet Coordinator</span>
            </div>

            {StorageService.getSettings().googleSpreadsheetUrl && (
              <a
                href={StorageService.getSettings().googleSpreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden lg:flex items-center gap-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 rounded-md px-2.5 py-1.5 text-emerald-300 hover:text-emerald-100 transition-colors"
                title="Open Master Register in Google Sheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium text-[11px]">Master Sheet</span>
                <ExternalLink className="w-3 h-3 text-emerald-400/80" />
              </a>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-between py-2 border-t border-slate-800 overflow-x-auto gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-[#E1001A] text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
