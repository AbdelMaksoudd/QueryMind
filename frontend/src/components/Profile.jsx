import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookMarked,
  CheckCircle2,
  AlertCircle,
  Clock3,
  KeyRound,
  Loader2,
  LogIn,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { changePassword, getLoans } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { money } from '../utils/format';

const EMPTY_DETAILS = { firstName: '', lastName: '', phone: '', address: '' };
const EMPTY_PASSWORD = { current: '', next: '', confirm: '' };

const statusStyle = {
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Overdue: 'bg-amber-50 text-amber-700 border-amber-200',
  Returned: 'bg-slate-100 text-slate-600 border-slate-200',
  Returned_Overdue: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function Profile({ onRequireAuth }) {
  const { user, isAuthenticated, updateProfile } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loansLoading, setLoansLoading] = useState(true);
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [password, setPassword] = useState(EMPTY_PASSWORD);
  const [detailsState, setDetailsState] = useState({ busy: false, message: null, error: null });
  const [passwordState, setPasswordState] = useState({ busy: false, message: null, error: null });

  useEffect(() => {
    if (!user) return;
    setDetails({
      firstName: user.first_name ?? '',
      lastName: user.last_name ?? '',
      phone: user.phone ?? '',
      address: user.address ?? '',
    });
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    getLoans({ limit: 200 })
      .then((data) => {
        if (active) setLoans(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoansLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.user_id]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <LogIn className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Sign in to view your profile</h2>
        <p className="text-sm text-slate-500">Your account details and borrowing history live here.</p>
        <button
          onClick={() => onRequireAuth('login')}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Sign in
        </button>
      </div>
    );
  }

  const activeLoans = loans.filter((loan) => ['Active', 'Overdue'].includes(loan.status)).length;
  const returned = loans.filter((loan) => loan.status.startsWith('Returned')).length;
  const unpaidFines = loans.filter((loan) => loan.fine_status === 'Unpaid').length;
  const initials = `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase();

  const saveDetails = async (event) => {
    event.preventDefault();
    setDetailsState({ busy: true, message: null, error: null });
    try {
      await updateProfile({
        first_name: details.firstName.trim(),
        last_name: details.lastName.trim(),
        phone: details.phone.trim() || null,
        address: details.address.trim() || null,
      });
      setDetailsState({ busy: false, message: 'Profile updated.', error: null });
    } catch (err) {
      setDetailsState({
        busy: false,
        message: null,
        error: err.response?.data?.detail || 'Could not save your details.',
      });
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (password.next !== password.confirm) {
      setPasswordState({ busy: false, message: null, error: 'New passwords do not match.' });
      return;
    }
    if (password.next.length < 8) {
      setPasswordState({ busy: false, message: null, error: 'Use at least 8 characters.' });
      return;
    }
    setPasswordState({ busy: true, message: null, error: null });
    try {
      const result = await changePassword({
        currentPassword: password.current,
        newPassword: password.next,
      });
      setPassword({ current: '', next: '', confirm: '' });
      setPasswordState({ busy: false, message: result.message, error: null });
    } catch (err) {
      setPasswordState({
        busy: false,
        message: null,
        error: err.response?.data?.detail || 'Could not change your password.',
      });
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all';
  const labelClass = 'block text-xs font-semibold text-slate-600 mb-1.5';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/" className="hover:text-indigo-600">Catalog</Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">My profile</span>
      </div>

      {/* Identity + stats */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-xl font-bold">
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold">{user.first_name} {user.last_name}</h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/30 border border-indigo-400/30">
                {user.role}
              </span>
            </div>
            <p className="text-sm text-indigo-200 mt-1">{user.email}</p>
            {user.created_at && (
              <p className="text-[11px] text-indigo-300 mt-1">
                Member since {new Date(user.created_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: BookMarked, label: 'Total loans', value: loans.length },
            { icon: Clock3, label: 'Active', value: activeLoans },
            { icon: CheckCircle2, label: 'Returned', value: returned },
            { icon: AlertCircle, label: 'Unpaid fines', value: unpaidFines },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 border border-white/10 backdrop-blur-md rounded-xl px-4 py-3">
              <stat.icon className="w-4 h-4 text-indigo-300 mb-1" />
              <span className="block text-xs text-slate-300">{stat.label}</span>
              <span className="text-xl font-bold">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Account details */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <UserRound className="w-4 h-4 text-indigo-600" />
            <h2 className="font-bold text-slate-800">Account details</h2>
          </div>

          {detailsState.message && (
            <p className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
              {detailsState.message}
            </p>
          )}
          {detailsState.error && (
            <p className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {detailsState.error}
            </p>
          )}

          <form onSubmit={saveDetails} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>First name</label>
                <input required maxLength={100} value={details.firstName} onChange={(e) => setDetails({ ...details, firstName: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Last name</label>
                <input required maxLength={100} value={details.lastName} onChange={(e) => setDetails({ ...details, lastName: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input value={user.email} disabled className={`${inputClass} opacity-60`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Phone</label>
                <input maxLength={20} value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} placeholder="Optional" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input maxLength={255} value={details.address} onChange={(e) => setDetails({ ...details, address: e.target.value })} placeholder="Optional" className={inputClass} />
              </div>
            </div>
            <button
              type="submit"
              disabled={detailsState.busy}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {detailsState.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save changes
            </button>
          </form>
        </section>

        {/* Password */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <KeyRound className="w-4 h-4 text-indigo-600" />
            <h2 className="font-bold text-slate-800">Change password</h2>
          </div>

          {passwordState.message && (
            <p className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
              {passwordState.message}
            </p>
          )}
          {passwordState.error && (
            <p className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {passwordState.error}
            </p>
          )}

          <form onSubmit={savePassword} className="space-y-4">
            <div>
              <label className={labelClass}>Current password</label>
              <input type="password" required value={password.current} onChange={(e) => setPassword({ ...password, current: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>New password</label>
              <input type="password" required minLength={8} value={password.next} onChange={(e) => setPassword({ ...password, next: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Confirm new password</label>
              <input type="password" required minLength={8} value={password.confirm} onChange={(e) => setPassword({ ...password, confirm: e.target.value })} className={inputClass} />
            </div>
            <button
              type="submit"
              disabled={passwordState.busy}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-50"
            >
              {passwordState.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Update password
            </button>
          </form>
          <p className="mt-4 text-[11px] text-slate-400">Use at least 8 characters. Your session stays active after the change.</p>
        </section>
      </div>

      {/* Loan history */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 pb-4 flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-indigo-600" />
          <h2 className="font-bold text-slate-800">Borrowing history</h2>
        </div>

        {loansLoading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[1, 2, 3].map((n) => <div key={n} className="h-12 bg-slate-100 rounded-xl" />)}
          </div>
        ) : loans.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">You have not borrowed any books yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Book</th>
                  <th className="px-6 py-3 font-semibold">Borrowed</th>
                  <th className="px-6 py-3 font-semibold">Returned</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Fine</th>
                  <th className="px-6 py-3 font-semibold">Payment</th>
                  <th className="px-6 py-3 font-semibold">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.map((loan) => (
                  <tr key={loan.loan_id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3 font-medium text-slate-800">
                      {loan.book_title || `Book #${loan.book_id}`}
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {loan.borrow_date ? new Date(loan.borrow_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {loan.return_date ? new Date(loan.return_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-lg text-[11px] font-semibold border ${statusStyle[loan.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {loan.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500">{money(loan.fine_amount)}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-lg text-[11px] font-semibold border ${
                        loan.payment_status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {loan.payment_status === 'Paid' ? 'Paid' : 'Awaiting'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <Link
                        to={`/loans/${loan.loan_id}/receipt`}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to catalog
      </Link>
    </div>
  );
}
