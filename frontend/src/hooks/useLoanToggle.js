import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { borrowBook } from '../services/api';

/**
 * Borrow-only flow. Returning a physical copy is a staff action, so customers
 * never send a return request from the UI.
 */
export function useLoanToggle({ onRequireAuth, onSuccess }) {
  const { isAuthenticated } = useAuth();
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const request = (book) => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    if (book.borrowed_by_me || !book.is_available) return;
    setError(null);
    setPending(book);
  };

  const cancel = () => {
    setPending(null);
    setError(null);
  };

  const confirm = async (days) => {
    if (!pending || busy) return false;
    const book = pending;
    setBusy(true);
    setError(null);
    try {
      const loan = await borrowBook(book.book_id, days);
      setPending(null);
      try {
        await onSuccess?.(book, loan);
      } catch {
        // The loan succeeded — a failed refresh must not look like an error.
      }
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || 'The loan could not be completed. Try again.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { request, confirm, cancel, pending, busy, error, clearError: () => setError(null) };
}
