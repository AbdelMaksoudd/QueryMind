import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  BookPlus,
  CheckCircle2,
  LayoutDashboard,
  Loader2,
  QrCode,
  RotateCcw,
  Search,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  createBook,
  getAdminPayments,
  getAdminStats,
  getAdminUsers,
  getBooks,
  recordPayment,
  createStaff,
  setUserRole,
  createWalkInLoan,
  adminReturnLoan,
  setBookActive,
  setUserStatus,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { date, invoiceNumber, money, parseLoanIdFromInvoice } from '../utils/format';
import ConfirmActionDialog from './ConfirmActionDialog';
import CreateStaffModal from './CreateStaffModal';
// ZXing is heavy — load the camera scanner only when it is actually opened.
const QrScanner = lazy(() => import('./QrScanner'));
import EditBookModal from './EditBookModal';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'payments', label: 'Payment desk', icon: Banknote },
  { id: 'loans', label: 'Returns', icon: RotateCcw },
  { id: 'walkin', label: 'Walk-in loan', icon: UserPlus },
  { id: 'books', label: 'Books', icon: BookPlus },
  { id: 'users', label: 'Users', icon: Users },
];

const EMPTY_WALKIN = {
  firstName: '', lastName: '', nationalId: '', phone: '', notes: '', bookId: '', days: 14, idVerified: false,
};

const EMPTY_BOOK = {
  title: '', author: '', category: '', publisher: '', isbn: '',
  publication_year: '', cover_image_url: '', description: '', copies: 1,
};

const methodStyle = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Waived: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function Admin() {
  const { user, isAuthenticated } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loans, setLoans] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanMode, setScanMode] = useState('payments');
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [returnTarget, setReturnTarget] = useState(null);
  const [editingBook, setEditingBook] = useState(null);
  const [showCreateStaff, setShowCreateStaff] = useState(false);
  const [roleEdits, setRoleEdits] = useState({});
  const [walkinForm, setWalkinForm] = useState(EMPTY_WALKIN);
  const [walkinBooks, setWalkinBooks] = useState([]);
  const [lastWalkin, setLastWalkin] = useState(null);
  const [pendingOnly, setPendingOnly] = useState(true);
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookForm, setBookForm] = useState(EMPTY_BOOK);
  const [methods, setMethods] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const isAdmin = isAuthenticated && user?.role === 'Admin';
  const canAccess = isAuthenticated && ['Admin', 'Staff'].includes(user?.role);

  const loadStats = useCallback(async () => {
    try { setStats(await getAdminStats()); } catch (err) { setError(err.response?.data?.detail || 'Could not load statistics.'); }
  }, []);
  const loadPayments = useCallback(async () => {
    try { setPayments(await getAdminPayments({ pendingOnly, query })); } catch (err) { setError(err.response?.data?.detail || 'Could not load payments.'); }
  }, [pendingOnly, query]);
  const loadLoans = useCallback(async () => {
    try {
      const all = await getAdminPayments({ pendingOnly: false, limit: 200 });
      setLoans(all.filter((item) => ['Active', 'Overdue'].includes(item.status)));
    } catch (err) { setError(err.response?.data?.detail || 'Could not load loans.'); }
  }, []);
  const openScanner = (mode) => {
    setScanMode(mode);
    setError(null);
    setMessage(null);
    setScanning(true);
  };
  const closeScan = useCallback(() => setScanning(false), []);

  const handleScan = useCallback((text) => {
    const invoice = text.trim();
    if (scanMode === 'returns') {
      const loanId = parseLoanIdFromInvoice(invoice);
      const found = loans.find((loan) => loan.loan_id === loanId);
      if (found) {
        setReturnTarget(found);
        setMessage(`Invoice ${invoice} matched. Confirm the return below.`);
      } else {
        setError(`No active loan found for ${invoice}.`);
      }
      return;
    }
    setPendingOnly(false);
    setQuery(invoice);
    setTab('payments');
    setMessage(`Invoice ${invoice} found. Review the row below, then record the payment.`);
  }, [scanMode, loans]);

  const loadBooks = useCallback(async () => {
    try { setBooks((await getBooks({ includeInactive: true, limit: 200 })).items); } catch (err) { setError(err.response?.data?.detail || 'Could not load books.'); }
  }, []);
  const loadWalkinBooks = useCallback(async () => {
    try {
      const result = await getBooks({ limit: 200 });
      setWalkinBooks(result.items.filter((book) => book.is_available));
    } catch (err) { setError(err.response?.data?.detail || 'Could not load books.'); }
  }, []);
  const loadUsers = useCallback(async () => {
    try { setUsers(await getAdminUsers()); } catch (err) { setError(err.response?.data?.detail || 'Could not load users.'); }
  }, []);

  useEffect(() => {
    if (!canAccess) return;
    setError(null);
    if (tab === 'overview' || tab === 'payments') loadStats();
    if (tab === 'payments') loadPayments();
    if (tab === 'loans') loadLoans();
    if (tab === 'books') loadBooks();
    if (tab === 'walkin') loadWalkinBooks();
    if (tab === 'users') loadUsers();
  }, [tab, canAccess, loadStats, loadPayments, loadLoans, loadBooks, loadWalkinBooks, loadUsers]);

  useEffect(() => {
    if (canAccess && tab === 'payments') loadPayments();
  }, [pendingOnly, query, canAccess, tab, loadPayments]);

  if (!canAccess) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <Shield className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Administrator access only</h2>
        <p className="text-sm text-slate-500">Sign in with an Admin account to open the control panel.</p>
        <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
          Back to catalog
        </Link>
      </div>
    );
  }

  const run = async (action, successText, reload) => {
    setBusy(true);
    setMessage(null);
    setError(null);
    let result;
    try {
      result = await action();
      setMessage(successText);
      if (reload) await reload();
    } catch (err) {
      setError(err.response?.data?.detail || 'The operation failed.');
    } finally {
      setBusy(false);
    }
    return result;
  };

  const inputClass = 'w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500';
  const labelClass = 'block text-[11px] font-semibold text-slate-600 mb-1';

  const cards = stats ? [
    { label: 'Active books', value: stats.books, icon: LayoutDashboard, tone: 'indigo' },
    { label: 'Copies available', value: `${stats.available_copies}/${stats.copies}`, icon: BookPlus, tone: 'emerald' },
    { label: 'Active loans', value: stats.active_loans, icon: BadgeCheck, tone: 'indigo' },
    { label: 'Pending payments', value: stats.pending_payments, icon: Banknote, tone: 'amber' },
    { label: 'Collected', value: money(stats.collected_amount), icon: Banknote, tone: 'emerald' },
    { label: 'Awaiting', value: money(stats.pending_amount), icon: Banknote, tone: 'amber' },
    { label: 'Users', value: stats.users, icon: Users, tone: 'indigo' },
    { label: 'Overdue', value: stats.overdue_loans, icon: AlertTriangle, tone: 'rose' },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h1 className="text-2xl font-extrabold text-slate-900">Admin control panel</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">Signed in as {user.first_name} {user.last_name}</p>
        </div>
        <Link to="/" className="text-xs font-semibold text-slate-500 hover:text-indigo-600">← Back to catalog</Link>
      </div>

      {message && <p className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">{message}</p>}
      {error && <p className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</p>}

      <div className="flex gap-1 overflow-x-auto bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
        {TABS.filter((item) => isAdmin || item.id !== 'users').map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === item.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <item.icon className="w-3.5 h-3.5" /> {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-5">
          {stats && !stats.payment_columns_ready && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Database migration pending.</strong> Ask the DBA to run{' '}
                <code className="font-mono font-semibold">backend/migrations/001_admin_payments.sql</code>{' '}
                in the Neon SQL editor. Statistics still work; recording payments will be disabled until then.
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cards.map((card) => (
              <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <card.icon className={`w-4 h-4 mb-2 ${card.tone === 'emerald' ? 'text-emerald-600' : card.tone === 'amber' ? 'text-amber-600' : card.tone === 'rose' ? 'text-rose-600' : 'text-indigo-600'}`} />
                <span className="block text-[11px] text-slate-500">{card.label}</span>
                <span className="text-xl font-extrabold text-slate-900">{card.value}</span>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-3">How the payment flow works</h2>
            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600">
              <li>The borrower confirms a loan and receives an invoice marked <strong>Pending</strong>.</li>
              <li>They bring the invoice number to the desk; you find it in the <strong>Payment desk</strong> tab.</li>
              <li>You record the payment (Counter / Cash / Bank Transfer) — no card data is collected.</li>
              <li>The invoice immediately shows <strong>Paid</strong> in the borrower's profile.</li>
              <li>Late returns add an unpaid fine, which is settled the same way.</li>
            </ol>
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-b border-slate-100">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Invoice number, email, name or book..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button
              onClick={() => openScanner('payments')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <QrCode className="w-4 h-4" /> Scan QR
            </button>
            <button
              onClick={() => setPendingOnly(!pendingOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border ${pendingOnly ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
            >
              {pendingOnly ? 'Pending only' : 'All invoices'}
            </button>
          </div>
          {payments.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">Nothing to show here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Book</th><th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th><th className="px-4 py-3">Record payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((item) => (
                    <tr key={item.loan_id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <Link to={`/loans/${item.loan_id}/receipt`} className="font-mono font-semibold text-indigo-600 hover:underline">
                          {item.invoice_no}
                        </Link>
                        <p className="text-[10px] text-slate-400">{date(item.borrow_date)}</p>
                      </td>
                      <td className="px-4 py-3"><p className="font-semibold text-slate-800">{item.user_name}</p><p className="text-[10px] text-slate-400">{item.email}</p></td>
                      <td className="px-4 py-3 text-slate-600">{item.book_title}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {money(item.amount)}
                        {Number(item.fine) > 0 && <p className="text-[10px] text-rose-600">+ {money(item.fine)} fine</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-lg font-semibold border ${methodStyle[item.payment_status] || methodStyle.Pending}`}>
                          {item.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {item.payment_status === 'Paid' ? (
                            <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                            </span>
                          ) : (
                            <>
                              <select
                                value={methods[item.loan_id] || 'Counter'}
                                onChange={(e) => setMethods({ ...methods, [item.loan_id]: e.target.value })}
                                className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-[11px]"
                              >
                                <option>Counter</option><option>Cash</option><option>Bank Transfer</option>
                              </select>
                              <button
                                disabled={busy}
                                onClick={() => setPaymentTarget(item)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Record
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'loans' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <RotateCcw className="w-4 h-4 text-indigo-600" /> Books currently on loan ({loans.length})
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => openScanner('returns')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <QrCode className="w-4 h-4" /> Scan QR
              </button>
              <button onClick={loadLoans} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">Refresh</button>
            </div>
          </div>
          {loans.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No books are currently on loan.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {loans.map((loan) => (
                <div key={loan.loan_id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">{loan.book_title}</p>
                    <p className="text-[11px] text-slate-500">
                      {loan.user_name} · {loan.email} · borrowed {date(loan.borrow_date)} · due {date(loan.due_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link to={`/loans/${loan.loan_id}/receipt`} className="text-xs font-semibold text-indigo-600 hover:underline">
                      {loan.invoice_no}
                    </Link>
                    <button
                      disabled={busy}
                      onClick={() => setReturnTarget(loan)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Mark returned
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="p-4 bg-slate-50 text-[11px] text-slate-500">
            Only staff can confirm a return: the borrower hands the physical copy back at the desk.
          </p>
        </section>
      )}

      {tab === 'walkin' && (
        <div className="grid lg:grid-cols-[420px_1fr] gap-6">
          <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-600" /> Walk-in borrowing
            </h2>
            <p className="text-[11px] text-slate-500 mb-4">
              For visitors without a website account. Their identity is checked here and the loan is
              recorded under a dedicated guest record.
            </p>

            {lastWalkin && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                <p className="font-semibold">Loan created successfully.</p>
                <Link to={`/loans/${lastWalkin.loan_id}/receipt`} className="font-mono underline">
                  {lastWalkin.invoice_no} — open invoice →
                </Link>
              </div>
            )}

            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (!walkinForm.idVerified) return;
                const result = await run(
                  () => createWalkInLoan({
                    first_name: walkinForm.firstName.trim(),
                    last_name: walkinForm.lastName.trim(),
                    national_id: walkinForm.nationalId.trim(),
                    phone: walkinForm.phone.trim() || null,
                    notes: walkinForm.notes.trim() || null,
                    book_id: Number(walkinForm.bookId),
                    days: Number(walkinForm.days),
                    id_verified: true,
                  }),
                  'Walk-in loan created. The invoice is pending payment.',
                  async () => {
                    await Promise.all([loadStats(), loadLoans(), loadWalkinBooks()]);
                  },
                );
                if (result?.loan_id) {
                  setLastWalkin({
                    loan_id: result.loan_id,
                    invoice_no: invoiceNumber(result.loan_id, result.borrow_date),
                  });
                }
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>First name</label>
                  <input required value={walkinForm.firstName} onChange={(e) => setWalkinForm({ ...walkinForm, firstName: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Last name</label>
                  <input required value={walkinForm.lastName} onChange={(e) => setWalkinForm({ ...walkinForm, lastName: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Identity / National ID number</label>
                <input required minLength={5} maxLength={30} value={walkinForm.nationalId} onChange={(e) => setWalkinForm({ ...walkinForm, nationalId: e.target.value })} placeholder="At least 5 characters, includes digits" className={inputClass} />
                <p className="text-[10px] text-slate-400 mt-1">Stored once per person; a different name with the same ID is rejected.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Phone (optional)</label>
                  <input value={walkinForm.phone} onChange={(e) => setWalkinForm({ ...walkinForm, phone: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Loan period</label>
                  <select value={walkinForm.days} onChange={(e) => setWalkinForm({ ...walkinForm, days: e.target.value })} className={inputClass}>
                    <option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Book to lend</label>
                <select required value={walkinForm.bookId} onChange={(e) => setWalkinForm({ ...walkinForm, bookId: e.target.value })} className={inputClass}>
                  <option value="">Select an available book…</option>
                  {walkinBooks.map((book) => (
                    <option key={book.book_id} value={book.book_id}>
                      {book.title} ({book.available_copies} free)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Notes (optional)</label>
                <input maxLength={255} value={walkinForm.notes} onChange={(e) => setWalkinForm({ ...walkinForm, notes: e.target.value })} className={inputClass} />
              </div>
              <label className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={walkinForm.idVerified}
                  onChange={(e) => setWalkinForm({ ...walkinForm, idVerified: e.target.checked })}
                  className="mt-0.5"
                />
                <span>I personally checked the original identity document and matched the name.</span>
              </label>
              <button
                type="submit"
                disabled={busy || !walkinForm.idVerified || !walkinForm.bookId}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? 'Creating…' : 'Create walk-in loan'}
              </button>
            </form>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm h-fit">
            <h2 className="text-sm font-bold text-slate-800 mb-3">How it works</h2>
            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600">
              <li>Check the visitor's original ID and tick the confirmation box.</li>
              <li>Pick an available book and the loan period.</li>
              <li>A guest record is created with a random unusable password — no fake website login.</li>
              <li>The visitor gets a normal invoice with a QR; payment is recorded in the Payment desk.</li>
              <li>On their next visit, the same ID matches the same guest record.</li>
            </ol>
            <div className="mt-4 p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-[11px] text-indigo-800">
              This feature needs <code className="font-mono">migrations/002_walkin_loans.sql</code> applied by the DBA.
              Until then the form returns a clear 503 message and the rest of the app keeps working.
            </div>
          </section>
        </div>
      )}

      {tab === 'books' && (
        <div className="grid lg:grid-cols-[360px_1fr] gap-6">
          <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><BookPlus className="w-4 h-4 text-indigo-600" /> Add a book</h2>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                run(
                  () => createBook({
                    ...bookForm,
                    publication_year: bookForm.publication_year ? Number(bookForm.publication_year) : null,
                    copies: Number(bookForm.copies),
                    isbn: bookForm.isbn || null,
                    publisher: bookForm.publisher || null,
                    cover_image_url: bookForm.cover_image_url || null,
                    description: bookForm.description || null,
                  }),
                  'Book added to the catalog.',
                  async () => { await loadBooks(); setBookForm(EMPTY_BOOK); },
                );
              }}
              className="space-y-3"
            >
              {[
                ['title', 'Title', true], ['author', 'Author', true], ['category', 'Category', true],
                ['publisher', 'Publisher', false], ['isbn', 'ISBN', false],
                ['publication_year', 'Publication year', false], ['cover_image_url', 'Cover image URL', false],
              ].map(([field, label, required]) => (
                <div key={field}>
                  <label className={labelClass}>{label}</label>
                  <input required={required} value={bookForm[field]} onChange={(e) => setBookForm({ ...bookForm, [field]: e.target.value })} className={inputClass} />
                </div>
              ))}
              <div>
                <label className={labelClass}>Description</label>
                <textarea rows={2} value={bookForm.description} onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Number of copies</label>
                <input type="number" min={1} max={100} value={bookForm.copies} onChange={(e) => setBookForm({ ...bookForm, copies: e.target.value })} className={inputClass} />
              </div>
              <button disabled={busy} className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                {busy ? 'Adding…' : 'Add book & copies'}
              </button>
            </form>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 text-sm font-bold text-slate-800">Catalog ({books.length})</div>
            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
              {books.map((book) => (
                <div key={book.book_id} className="p-3 flex items-center gap-3">
                  <div className="w-10 h-14 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {book.cover_image_url ? <img src={book.cover_image_url} alt="" className="w-full h-full object-cover" /> : <BookPlus className="w-4 h-4 text-slate-300" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">{book.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">{book.author} · {book.available_copies}/{book.total_copies} copies</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg border ${book.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {book.is_active ? 'Visible' : 'Hidden'}
                  </span>
                  <button
                    onClick={() => setEditingBook(book)}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Edit
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => run(() => setBookActive(book.book_id, !book.is_active), book.is_active ? 'Book hidden.' : 'Book restored.', loadBooks)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-50"
                  >
                    {book.is_active ? 'Hide' : 'Restore'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === 'users' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="text-sm font-bold text-slate-800">Accounts ({users.length})</div>
            {isAdmin && (
              <button
                onClick={() => setShowCreateStaff(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add staff
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-400">
                <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Identity</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((item) => {
                  const roleEditable = isAdmin && item.role !== 'Admin' && item.user_id !== user.user_id;
                  const currentRole = roleEdits[item.user_id] ?? item.role;
                  return (
                    <tr key={item.user_id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {item.first_name} {item.last_name}
                        {item.is_walkin && (
                          <span className="ml-2 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200">Walk-in</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{item.email}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{item.national_id || '—'}</td>
                      <td className="px-4 py-3">
                        {roleEditable ? (
                          <select
                            value={currentRole}
                            onChange={(e) => setRoleEdits({ ...roleEdits, [item.user_id]: e.target.value })}
                            className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                          >
                            <option value="Customer">Customer</option>
                            <option value="Staff">Staff</option>
                          </select>
                        ) : (
                          <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold">{item.role}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          defaultValue={item.account_status}
                          id={`status-${item.user_id}`}
                          disabled={!isAdmin}
                          className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-50"
                        >
                          <option>Active</option><option>Flagged</option><option>Suspended</option><option>Inactive</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <>
                              {roleEditable && currentRole !== item.role && (
                                <button
                                  disabled={busy}
                                  onClick={() => run(
                                    () => setUserRole(item.user_id, currentRole),
                                    `Role updated for ${item.first_name}.`,
                                    loadUsers,
                                  )}
                                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50"
                                >
                                  Save role
                                </button>
                              )}
                              <button
                                disabled={busy}
                                onClick={() => run(
                                  () => setUserStatus(item.user_id, document.getElementById(`status-${item.user_id}`).value),
                                  `Status updated for ${item.first_name}.`,
                                  loadUsers,
                                )}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                              >
                                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Save
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!isAdmin && <p className="p-4 bg-slate-50 text-[11px] text-slate-500">Account management is limited to Admin.</p>}
        </section>
      )}

      {paymentTarget && (
        <ConfirmActionDialog
          title="Record payment"
          message="Confirm that this amount was received at the library desk."
          details={[
            { label: 'Invoice', value: paymentTarget.invoice_no },
            { label: 'Customer', value: paymentTarget.user_name },
            { label: 'Book', value: paymentTarget.book_title },
            { label: 'Method', value: methods[paymentTarget.loan_id] || 'Counter' },
            {
              label: 'Amount',
              value: money(Number(paymentTarget.amount) + Number(paymentTarget.fine)),
            },
          ]}
          confirmLabel="Confirm payment"
          tone="emerald"
          busy={busy}
          onCancel={() => setPaymentTarget(null)}
          onConfirm={async () => {
            const target = paymentTarget;
            const method = methods[target.loan_id] || 'Counter';
            setPaymentTarget(null);
            await run(
              () => recordPayment(target.loan_id, method),
              `Payment recorded for ${target.invoice_no}. The invoice now shows Paid.`,
              async () => { await Promise.all([loadPayments(), loadStats()]); },
            );
          }}
        />
      )}

      {returnTarget && (
        <ConfirmActionDialog
          title="Confirm book return"
          message={
            Number(returnTarget.fine) > 0
              ? `The borrower is late — a fine of ${money(returnTarget.fine)} will be recorded as unpaid. Confirm only after receiving the physical copy.`
              : 'Confirm only after the physical copy has been handed back at the desk.'
          }
          details={[
            { label: 'Invoice', value: returnTarget.invoice_no },
            { label: 'Book', value: returnTarget.book_title },
            { label: 'Customer', value: returnTarget.user_name },
          ]}
          confirmLabel="Confirm return"
          tone="amber"
          busy={busy}
          onCancel={() => setReturnTarget(null)}
          onConfirm={async () => {
            const target = returnTarget;
            setReturnTarget(null);
            await run(
              () => adminReturnLoan(target.loan_id),
              'Return confirmed — the copy is available again.',
              async () => { await Promise.all([loadLoans(), loadStats(), loadPayments()]); },
            );
          }}
        />
      )}

      {showCreateStaff && (
        <CreateStaffModal
          onClose={() => setShowCreateStaff(false)}
          onCreated={() => {
            setShowCreateStaff(false);
            setMessage('Staff account created.');
            loadUsers();
          }}
        />
      )}

      {scanning && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/50">
              <div className="p-6 rounded-2xl bg-white text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading camera scanner…
              </div>
            </div>
          }
        >
          <QrScanner onResult={handleScan} onClose={closeScan} />
        </Suspense>
      )}

      {editingBook && (
        <EditBookModal
          book={editingBook}
          onClose={() => setEditingBook(null)}
          onSaved={() => {
            setEditingBook(null);
            setMessage('Book details updated.');
            loadBooks();
          }}
        />
      )}
    </div>
  );
}
