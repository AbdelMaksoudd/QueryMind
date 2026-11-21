import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, BookOpen, CalendarDays, CreditCard, Loader2, X } from 'lucide-react';
import { addDays, date, money } from '../utils/format';

const DURATIONS = [7, 14, 30];

export default function LoanConfirmDialog({ pending, busy, error, onConfirm, onCancel }) {
  const [days, setDays] = useState(14);
  useEffect(() => {
    if (pending) setDays(14);
  }, [pending]);

  if (!pending) return null;
  const book = pending;
  const fee = Number(book.borrow_fee ?? 0);
  const due = addDays(days);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={busy ? undefined : onCancel}>
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6 pb-4 flex items-start justify-between gap-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Confirm your loan</h2>
              <p className="text-xs text-slate-500">Review the details before confirming.</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={busy}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="w-14 h-20 rounded-lg bg-white border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
              {book.cover_image_url ? (
                <img src={book.cover_image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <BookOpen className="w-6 h-6 text-slate-300" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 line-clamp-2">{book.title}</p>
              <p className="text-xs text-slate-500 truncate">{book.author || 'Unknown author'}</p>
              <p className="text-[11px] text-slate-400 mt-1">{book.isbn || '—'}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Loan period</label>
            <div className="flex gap-2">
              {DURATIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => setDays(option)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    days === option
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {option} days
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-slate-200">
              <span className="block text-[10px] uppercase tracking-wide text-slate-400">Borrow fee</span>
              <span className="text-lg font-bold text-slate-900">{money(fee)}</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-200">
              <span className="block text-[10px] uppercase tracking-wide text-slate-400 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Due date
              </span>
              <span className="text-sm font-bold text-slate-900">{date(due)}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
            <CreditCard className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Pay at the library desk.</strong> An invoice will be created and the librarian will record your payment from their admin account — no card or PayPal details are needed.
            </span>
          </div>

          {error && (
            <p className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</p>
          )}
        </div>

        <div className="px-6 pb-6 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(days)}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-100 disabled:opacity-50"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm loan · {money(fee)}
          </button>
        </div>
      </div>
    </div>
  );
}
