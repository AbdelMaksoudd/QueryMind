import React, { useState } from 'react';
import { Loader2, UserPlus, X } from 'lucide-react';
import { createStaff } from '../services/api';

export default function CreateStaffModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const inputClass = 'w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500';
  const labelClass = 'block text-[11px] font-semibold text-slate-600 mb-1';

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createStaff({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || null,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create the staff account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[58] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={busy ? undefined : onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">Add staff account</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>First name</label>
              <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Last name</label>
              <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Temporary password</label>
            <input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} />
            <p className="text-[10px] text-slate-400 mt-1">Give this to the employee and ask them to change it from their profile.</p>
          </div>
          <div>
            <label className={labelClass}>Phone (optional)</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
          </div>
          {error && <p className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</p>}
        </div>
        <div className="p-5 pt-0 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Create staff
          </button>
        </div>
      </form>
    </div>
  );
}
