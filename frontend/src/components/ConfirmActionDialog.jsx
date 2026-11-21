import React from 'react';
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';

export default function ConfirmActionDialog({
  title,
  message,
  details = [],
  confirmLabel = 'Confirm',
  tone = 'indigo',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const tones = {
    indigo: 'bg-indigo-600 hover:bg-indigo-700',
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    amber: 'bg-amber-600 hover:bg-amber-700',
  };

  return (
    <div className="fixed inset-0 z-[57] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={busy ? undefined : onCancel}>
      <div
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-5 flex items-start justify-between gap-3 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tone === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
              {tone === 'amber' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">{title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{message}</p>
            </div>
          </div>
          <button onClick={onCancel} disabled={busy} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-40" aria-label="Cancel">
            <X className="w-4 h-4" />
          </button>
        </div>

        {details.length > 0 && (
          <div className="p-5 space-y-2">
            {details.map((detail) => (
              <div key={detail.label} className="flex items-start justify-between gap-4 text-xs">
                <span className="text-slate-400">{detail.label}</span>
                <span className="font-semibold text-slate-800 text-right">{detail.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="p-5 pt-0 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50 ${tones[tone]}`}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
