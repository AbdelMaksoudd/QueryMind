import React, { useState } from 'react';
import { Tag, CheckCircle2, XCircle, ArrowRightLeft, BookOpen } from 'lucide-react';

export default function BookCard({ book, onToggleAvailability, viewMode = 'grid' }) {
  const [updating, setUpdating] = useState(false);

  const handleToggle = async () => {
    try {
      setUpdating(true);
      await onToggleAvailability(book.id);
    } finally {
      setUpdating(false);
    }
  };

  const isAvailable = book.is_available;

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Book Left info */}
        <div className="flex items-center gap-4 flex-1">
          <div className="w-16 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200 relative">
            {book.cover_image ? (
              <img
                src={book.cover_image}
                alt={book.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <BookOpen className="w-6 h-6" />
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                <Tag className="w-3 h-3" />
                {book.category}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  isAvailable
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {isAvailable ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" /> Available
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3" /> Borrowed
                  </>
                )}
              </span>
            </div>
            <h3 className="font-semibold text-slate-900 line-clamp-1">{book.title}</h3>
            <p className="text-sm text-slate-500">by {book.author}</p>
          </div>
        </div>

        {/* Book Right actions & price */}
        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Borrow Fee</span>
            <span className="text-lg font-bold text-slate-900">${book.price.toFixed(2)}</span>
          </div>

          <button
            onClick={handleToggle}
            disabled={updating}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${
              isAvailable
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
            } disabled:opacity-50`}
          >
            <ArrowRightLeft className={`w-3.5 h-3.5 ${updating ? 'animate-spin' : ''}`} />
            <span>{updating ? 'Updating...' : isAvailable ? 'Borrow Book' : 'Return Book'}</span>
          </button>
        </div>
      </div>
    );
  }

  // Grid View (Default)
  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Cover Image & Availability Badge */}
        <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
          {book.cover_image ? (
            <img
              src={book.cover_image}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <BookOpen className="w-12 h-12" />
            </div>
          )}

          {/* Badge overlays */}
          <div className="absolute top-3 right-3">
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-md shadow-sm ${
                isAvailable
                  ? 'bg-emerald-500/90 text-white'
                  : 'bg-rose-500/90 text-white'
              }`}
            >
              {isAvailable ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Available
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" /> Borrowed
                </>
              )}
            </span>
          </div>

          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white">
              <Tag className="w-3 h-3 text-indigo-300" />
              {book.category}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-2">
          <h3 className="font-semibold text-slate-900 text-base leading-snug line-clamp-1 group-hover:text-indigo-600 transition-colors">
            {book.title}
          </h3>
          <p className="text-sm text-slate-500 font-medium">by {book.author}</p>
          {book.description && (
            <p className="text-xs text-slate-500 line-clamp-2 pt-1 leading-relaxed">
              {book.description}
            </p>
          )}
        </div>
      </div>

      {/* Footer Details: Price & Action */}
      <div className="p-5 pt-0 mt-2 border-t border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400 block font-medium">Borrow Fee</span>
          <span className="text-lg font-bold text-slate-900">
            ${book.price.toFixed(2)}
          </span>
        </div>

        <button
          onClick={handleToggle}
          disabled={updating}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
            isAvailable
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-indigo-100'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
          } disabled:opacity-50`}
        >
          <ArrowRightLeft className={`w-3.5 h-3.5 ${updating ? 'animate-spin' : ''}`} />
          <span>{updating ? '...' : isAvailable ? 'Borrow' : 'Return'}</span>
        </button>
      </div>
    </div>
  );
}

