import React from 'react';
import { Link } from 'react-router-dom';
import { Tag, CheckCircle2, XCircle, ArrowRightLeft, BookOpen, BookMarked, Layers } from 'lucide-react';
import { money } from '../utils/format';

export default function BookCard({ book, onToggleAvailability, viewMode = 'grid' }) {
  const isMine = book.borrowed_by_me;
  const isAvailable = book.is_available;
  const canBorrow = isAvailable && !isMine;
  const buttonLabel = isMine ? 'Return at desk' : canBorrow ? 'Borrow' : 'Borrowed';

  const statusBadge = isMine ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
      <BookMarked className="w-3 h-3" /> With you
    </span>
  ) : isAvailable ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
      <CheckCircle2 className="w-3 h-3" /> Available
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
      <XCircle className="w-3 h-3" /> Borrowed
    </span>
  );

  const actionButton = (
    <button
      onClick={() => onToggleAvailability(book)}
      disabled={!canBorrow}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
        canBorrow
          ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
          : 'bg-slate-100 text-slate-500 border border-slate-300'
      }`}
    >
      <ArrowRightLeft className="w-3.5 h-3.5" />
      <span>{buttonLabel}</span>
    </button>
  );

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Link to={`/books/${book.book_id}`} className="w-16 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200 relative">
            {book.cover_image_url ? (
              <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <BookOpen className="w-6 h-6" />
              </div>
            )}
          </Link>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {book.category && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  <Tag className="w-3 h-3" /> {book.category}
                </span>
              )}
              {statusBadge}
            </div>
            <Link
              to={`/books/${book.book_id}`}
              className="font-semibold text-slate-900 line-clamp-1 hover:text-indigo-600 transition-colors"
            >
              {book.title}
            </Link>
            <p className="text-sm text-slate-500">by {book.author || 'Unknown author'}</p>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3" /> {book.available_copies}/{book.total_copies} copies
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
          <div className="text-right">
            <span className="block text-[10px] text-slate-400">Borrow fee</span>
            <span className="text-sm font-bold text-slate-800">{money(book.borrow_fee)}</span>
          </div>
          {actionButton}
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
      <div>
        <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
          <Link to={`/books/${book.book_id}`} className="block w-full h-full">
            {book.cover_image_url ? (
              <img
                src={book.cover_image_url}
                alt={book.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <BookOpen className="w-12 h-12" />
              </div>
            )}
          </Link>

          <div className="absolute top-3 right-3">{statusBadge}</div>

          {book.category && (
            <div className="absolute bottom-3 left-3">
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white">
                <Tag className="w-3 h-3 text-indigo-300" /> {book.category}
              </span>
            </div>
          )}
        </div>

        <div className="p-5 space-y-2">
          <Link
            to={`/books/${book.book_id}`}
            className="block font-semibold text-slate-900 text-base leading-snug line-clamp-1 group-hover:text-indigo-600 transition-colors"
          >
            {book.title}
          </Link>
          <p className="text-sm text-slate-500 font-medium">by {book.author || 'Unknown author'}</p>
          {book.description && (
            <p className="text-xs text-slate-500 line-clamp-2 pt-1 leading-relaxed">{book.description}</p>
          )}
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <Layers className="w-3 h-3" /> {book.available_copies} of {book.total_copies} copies available
          </p>
        </div>
      </div>

      <div className="p-5 pt-0 mt-2 border-t border-slate-100 flex items-center justify-between gap-3">
        <div>
          <Link
            to={`/books/${book.book_id}`}
            className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            View details →
          </Link>
          <p className="text-[11px] text-slate-400 mt-1">Borrow fee <span className="font-semibold text-slate-700">{money(book.borrow_fee)}</span></p>
        </div>
        {actionButton}
      </div>
    </div>
  );
}
