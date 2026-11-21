export function money(value) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

export function date(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function dateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Deterministic, human-readable invoice number based on the loan id. */
export function invoiceNumber(loanId, issuedAt) {
  const year = issuedAt ? new Date(issuedAt).getFullYear() : new Date().getFullYear();
  return `QM-${year}-${String(loanId).padStart(6, '0')}`;
}

/** Extract the loan id from an invoice number like QM-2026-000123. */
export function parseLoanIdFromInvoice(value) {
  const match = String(value || '').match(/QM-\d{4}-(\d+)/);
  return match ? Number(match[1]) : null;
}

export function addDays(days) {
  const result = new Date();
  result.setDate(result.getDate() + Number(days));
  return result;
}
