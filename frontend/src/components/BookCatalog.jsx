import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutGrid,
  List,
  SlidersHorizontal,
  BookOpen,
  RefreshCw,
  X,
  LogIn,
  BookMarked,
} from 'lucide-react';
import { date } from '../utils/format';
import BookCard from './BookCard';
import LoanConfirmDialog from './LoanConfirmDialog';
import { getBooks, getCategories, getLoans } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLoanToggle } from '../hooks/useLoanToggle';

export default function BookCatalog({ onRequireAuth }) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = user?.user_id ?? null;

  const refreshActiveLoans = useCallback(async () => {
    if (!userId) {
      setActiveLoans([]);
      return;
    }
    try {
      setActiveLoans(await getLoans({ status: 'Active', limit: 100 }));
    } catch {
      /* the catalog is still usable even if this fails */
    }
  }, [userId]);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const [catalog, categoryList] = await Promise.all([
        getBooks({
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          search: searchQuery || undefined,
          is_available: availableOnly,
          limit: 200,
        }),
        getCategories(),
      ]);
      setBooks(catalog.items);
      setCategories(['All', ...categoryList]);
    } catch (err) {
      console.error('Failed to load library data:', err);
      setError('Could not connect to the backend library API. Ensure FastAPI is running on port 8000.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedCategory, searchQuery, availableOnly]);

  useEffect(() => {
    const timer = setTimeout(() => loadData(), 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    refreshActiveLoans();
  }, [refreshActiveLoans, user]);

  const loanActions = useLoanToggle({
    onRequireAuth,
    onSuccess: async (book, loan) => {
      await Promise.all([loadData({ silent: true }), refreshActiveLoans()]);
      if (loan?.loan_id) navigate(`/loans/${loan.loan_id}/receipt`);
    },
  });

  const stats = useMemo(() => {
    const total = books.length;
    const available = books.filter((book) => book.is_available).length;
    return { total, available, borrowed: total - available };
  }, [books]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/20 mb-3">
            <BookOpen className="w-3.5 h-3.5" /> Library Catalog & Borrowing
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Explore & Borrow Books</h1>
          <p className="mt-2 text-indigo-200 text-sm sm:text-base leading-relaxed">
            Browse the collection and borrow an available copy. Loans and copy statuses are recorded
            directly in PostgreSQL.
          </p>

          <div className="mt-6 flex flex-wrap gap-4 sm:gap-6 text-sm">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
              <span className="text-slate-300 block text-xs">Books</span>
              <span className="text-xl font-bold">{stats.total}</span>
            </div>
            <div className="bg-emerald-500/20 backdrop-blur-md px-4 py-2 rounded-xl border border-emerald-400/30">
              <span className="text-emerald-300 block text-xs">Available Now</span>
              <span className="text-xl font-bold text-emerald-200">{stats.available}</span>
            </div>
            <div className="bg-rose-500/20 backdrop-blur-md px-4 py-2 rounded-xl border border-rose-400/30">
              <span className="text-rose-300 block text-xs">No Copies Left</span>
              <span className="text-xl font-bold text-rose-200">{stats.borrowed}</span>
            </div>
            {isAuthenticated && (
              <div className="bg-indigo-500/20 backdrop-blur-md px-4 py-2 rounded-xl border border-indigo-400/30">
                <span className="text-indigo-300 block text-xs">Your Loans</span>
                <span className="text-xl font-bold text-indigo-200">{activeLoans.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeLoans.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
            <BookMarked className="w-4 h-4 text-indigo-600" /> Your active loans
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {activeLoans.map((loan) => (
              <Link
                key={loan.loan_id}
                to={`/loans/${loan.loan_id}/receipt`}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 hover:bg-indigo-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{loan.book_title}</p>
                  <p className="text-[11px] text-slate-500">Due {date(loan.due_date)}</p>
                </div>
                <span className="text-[11px] font-semibold text-indigo-700 whitespace-nowrap">Return at desk · Invoice →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!isAuthenticated && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
              <LogIn className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Sign in to borrow books</p>
              <p className="text-xs text-slate-500">Create an account or use the DEMO switcher in the top bar.</p>
            </div>
          </div>
          <button
            onClick={() => onRequireAuth('login')}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all"
          >
            Sign in
          </button>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by title, author or ISBN..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={() => setAvailableOnly(!availableOnly)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                availableOnly
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Available Only
            </button>

            <div className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => loadData()}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
              title="Refresh Catalog"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 chat-scrollbar">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 pl-1 pr-2">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center justify-between">
          <div><span className="font-semibold">Backend Alert:</span> {error}</div>
          <button
            onClick={() => loadData()}
            className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-3'}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse space-y-4">
              <div className="aspect-[16/10] bg-slate-200 rounded-xl" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
              <div className="h-8 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {!loading && books.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No books found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            No active book matches these filters. Try changing the category or clearing the search.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
              setAvailableOnly(false);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm"
          >
            Reset Filters
          </button>
        </div>
      )}

      {!loading && books.length > 0 && (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-3'}>
          {books.map((book) => (
            <BookCard
              key={book.book_id}
              book={book}
              onToggleAvailability={loanActions.request}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}

      <LoanConfirmDialog
        pending={loanActions.pending}
        busy={loanActions.busy}
        error={loanActions.error}
        onConfirm={loanActions.confirm}
        onCancel={loanActions.cancel}
      />
    </div>
  );
}
