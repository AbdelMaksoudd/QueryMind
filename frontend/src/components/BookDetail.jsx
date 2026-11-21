import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRightLeft,
  BookMarked,
  BookOpen,
  Building2,
  CheckCircle2,
  Hash,
  Layers,
  Tag,
  UserRound,
  XCircle,
} from 'lucide-react';
import { getBookById, getBooks } from '../services/api';
import { useLoanToggle } from '../hooks/useLoanToggle';
import LoanConfirmDialog from './LoanConfirmDialog';
import { money } from '../utils/format';

export default function BookDetail({ onRequireAuth }) {
  const navigate = useNavigate();
  const { bookId } = useParams();
  const [book, setBook] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loanActions = useLoanToggle({
    onRequireAuth,
    onSuccess: async (borrowedBook, loan) => {
      const fresh = await getBookById(bookId);
      setBook(fresh);
      if (loan?.loan_id) navigate(`/loans/${loan.loan_id}/receipt`);
    },
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    setBook(null);

    getBookById(bookId)
      .then((data) => {
        if (!active) return;
        setBook(data);
        if (data.category) {
          getBooks({ category: data.category, limit: 5 })
            .then((result) => {
              if (active) setRelated(result.items.filter((item) => item.book_id !== data.book_id).slice(0, 4));
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        if (active) setLoadError(err.response?.data?.detail || 'Could not load this book.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bookId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-5 w-40 bg-slate-200 rounded" />
        <div className="grid md:grid-cols-[300px_1fr] gap-8 bg-white p-6 rounded-3xl border border-slate-200">
          <div className="aspect-[3/4] bg-slate-200 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-slate-200 rounded w-3/4" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
            <div className="h-24 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !book) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <XCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">{loadError || 'Book not found'}</h2>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to catalog
        </Link>
      </div>
    );
  }

  const isMine = book.borrowed_by_me;
  const canBorrow = book.is_available && !isMine;
  const status = isMine ? (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
      <BookMarked className="w-3.5 h-3.5" /> Borrowed by you
    </span>
  ) : book.is_available ? (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <CheckCircle2 className="w-3.5 h-3.5" /> {book.available_copies} available
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
      <XCircle className="w-3.5 h-3.5" /> All copies borrowed
    </span>
  );

  const facts = [
    { icon: UserRound, label: 'Author', value: book.author || 'Unknown' },
    { icon: Tag, label: 'Category', value: book.category || '—' },
    { icon: Building2, label: 'Publisher', value: book.publisher || '—' },
    { icon: Hash, label: 'ISBN', value: book.isbn || '—' },
    { icon: Layers, label: 'Copies', value: `${book.available_copies} of ${book.total_copies} available` },
    { icon: BookOpen, label: 'Published', value: book.publication_year || '—' },
    { icon: Tag, label: 'Borrow fee', value: money(book.borrow_fee) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/" className="hover:text-indigo-600 transition-colors">Catalog</Link>
        <span>/</span>
        <span className="truncate max-w-[220px] text-slate-700 font-medium">{book.title}</span>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid md:grid-cols-[320px_1fr] gap-0">
          <div className="bg-slate-100 aspect-[4/3] md:aspect-auto md:min-h-[420px] flex items-center justify-center overflow-hidden">
            {book.cover_image_url ? (
              <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <BookOpen className="w-16 h-16 text-slate-300" />
            )}
          </div>

          <div className="p-6 sm:p-8 flex flex-col">
            <div className="mb-4">{status}</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">{book.title}</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">by {book.author || 'Unknown author'}</p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
              {facts.map((fact) => (
                <div key={fact.label} className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0">
                    <fact.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] uppercase tracking-wide text-slate-400">{fact.label}</span>
                    <span className="block text-xs font-semibold text-slate-700 truncate">{fact.value}</span>
                  </div>
                </div>
              ))}
            </div>

            {book.description && (
              <div className="mt-6">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">About this book</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{book.description}</p>
              </div>
            )}

            <div className="mt-auto pt-7 flex flex-wrap items-center gap-3">
              <button
                onClick={() => loanActions.request(book)}
                disabled={!canBorrow}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                  canBorrow
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                    : 'bg-slate-100 text-slate-500 border border-slate-300'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                {isMine ? 'Return at desk' : canBorrow ? 'Borrow now' : 'Not available'}
              </button>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to catalog
              </Link>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-800">More in {book.category}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map((item) => (
              <Link
                key={item.book_id}
                to={`/books/${item.book_id}`}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all"
              >
                <div className="aspect-[16/10] bg-slate-100 overflow-hidden">
                  {item.cover_image_url ? (
                    <img
                      src={item.cover_image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <BookOpen className="w-7 h-7" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold text-slate-800 line-clamp-2 group-hover:text-indigo-600">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 truncate">{item.author}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
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
