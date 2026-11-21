import React, { useState } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import { updateBook } from '../services/api';

export default function EditBookModal({ book, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: book.title,
    author: book.author || '',
    category: book.category || '',
    publisher: book.publisher || '',
    isbn: book.isbn || '',
    publication_year: book.publication_year || '',
    cover_image_url: book.cover_image_url || '',
    description: book.description || '',
    copies: book.total_copies,
    is_active: book.is_active,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const inputClass = 'w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500';
  const labelClass = 'block text-[11px] font-semibold text-slate-600 mb-1';

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await updateBook(book.book_id, {
        ...form,
        isbn: form.isbn || null,
        publisher: form.publisher || null,
        description: form.description || null,
        cover_image_url: form.cover_image_url || null,
        publication_year: form.publication_year ? Number(form.publication_year) : null,
        copies: Number(form.copies),
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not update the book.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[56] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={busy ? undefined : onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[92vh] overflow-y-auto chat-scrollbar bg-white rounded-3xl shadow-2xl"
      >
        <div className="p-5 flex items-center justify-between border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Edit book</h3>
            <p className="text-[11px] text-slate-400 truncate max-w-sm">{book.title}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 grid sm:grid-cols-2 gap-3">
          {[
            ['title', 'Title', true], ['author', 'Author', false], ['category', 'Category', false],
            ['publisher', 'Publisher', false], ['isbn', 'ISBN', false],
            ['publication_year', 'Publication year', false], ['cover_image_url', 'Cover image URL', false],
          ].map(([field, label, required]) => (
            <div key={field}>
              <label className={labelClass}>{label}</label>
              <input required={required} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className={inputClass} />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className={labelClass}>Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Total copies</label>
            <input type="number" min={0} max={100} value={form.copies} onChange={(e) => setForm({ ...form, copies: e.target.value })} className={inputClass} />
            <p className="text-[10px] text-slate-400 mt-1">Copies on loan are never removed.</p>
          </div>
          <div>
            <label className={labelClass}>Visibility</label>
            <select value={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })} className={inputClass}>
              <option value="true">Visible in catalog</option>
              <option value="false">Hidden (soft-deleted)</option>
            </select>
          </div>
          {error && (
            <p className="sm:col-span-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</p>
          )}
        </div>

        <div className="p-5 pt-0 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
