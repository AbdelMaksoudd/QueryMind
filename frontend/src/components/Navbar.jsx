import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Library, UserRound, LogOut, Zap, AlertCircle, Shield } from 'lucide-react';
import { getUsers } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onOpenChat, onOpenAuth, unreadCount = 0 }) {
  const { user, demoMode, demoLogin, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [demoError, setDemoError] = useState(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!demoMode) return;
    let active = true;
    getUsers(true)
      .then((data) => {
        if (active) setUsers(data);
      })
      .catch(() => {
        if (active) setDemoError('Could not load demo accounts.');
      });
    return () => {
      active = false;
    };
  }, [demoMode]);

  const handleDemoSwitch = async (event) => {
    const id = Number(event.target.value);
    if (!id) return;
    setSwitching(true);
    setDemoError(null);
    try {
      await demoLogin(id);
    } catch (err) {
      setDemoError(err.response?.data?.detail || 'Could not switch account.');
    } finally {
      setSwitching(false);
    }
  };

  const initials = user
    ? `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase()
    : '';

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Query<span className="text-indigo-600">Mind</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                v2.0
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* One-click account switching, explicitly marked as a demo tool */}
            {demoMode && (
              <div className="hidden md:flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-xl border border-amber-200 bg-amber-50/70">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-[10px] font-bold tracking-wide text-amber-700">DEMO</span>
                <UserRound className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={user?.user_id ?? ''}
                  onChange={handleDemoSwitch}
                  disabled={switching || users.length === 0}
                  title="Presentation shortcut: sign in as any active account without a password"
                  className="max-w-[170px] bg-white/80 text-xs font-medium text-slate-700 py-1 pl-1.5 pr-1 rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 disabled:opacity-50"
                >
                  <option value="">{switching ? 'Switching…' : 'Switch account'}</option>
                  {users.map((item) => (
                    <option key={item.user_id} value={item.user_id}>
                      {item.first_name} {item.last_name} {item.role === 'Admin' ? '(Admin)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                {(user.role === 'Admin' || user.role === 'Staff') && (
                  <Link
                    to="/admin"
                    title={user.role === 'Admin' ? 'Admin control panel' : 'Library desk'}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5" /> {user.role === 'Admin' ? 'Admin' : 'Desk'}
                  </Link>
                )}
                <Link
                  to="/profile"
                  title="My profile"
                  className="hidden sm:flex items-center gap-2 pl-1 hover:opacity-80 transition-opacity"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center text-xs font-bold">
                    {initials}
                  </div>
                  <div className="leading-tight">
                    <span className="block text-xs font-semibold text-slate-800">
                      {user.first_name} {user.last_name}
                    </span>
                    <span className="block text-[10px] text-slate-400">{user.role}</span>
                  </div>
                </Link>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all sm:px-4"
              >
                Sign in
                <span className="hidden lg:inline"> / Register</span>
              </button>
            )}

            <button
              onClick={onOpenChat}
              className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm hover:from-indigo-500 hover:to-violet-500 transition-all duration-200 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>AI Assistant</span>
              {unreadCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-white text-indigo-700 text-xs font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
        {demoError && (
          <div className="pb-2 flex items-center gap-1.5 text-xs text-amber-700">
            <AlertCircle className="w-3.5 h-3.5" /> {demoError}
          </div>
        )}
      </div>
    </header>
  );
}
