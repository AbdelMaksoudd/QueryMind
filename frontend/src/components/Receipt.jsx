import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Download, Loader2, Printer, ReceiptText, XCircle, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getLoanById } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { date, dateTime, invoiceNumber, money } from '../utils/format';

export default function Receipt() {
  const { loanId } = useParams();
  const { user } = useAuth();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [error, setError] = useState(null);
  const invoiceRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getLoanById(loanId)
      .then((data) => {
        if (active) setLoan(data);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.detail || 'Could not load this invoice.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loanId]);

  const handleDownload = async () => {
    if (!invoiceRef.current || !loan) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const { downloadInvoicePdf } = await import('../utils/invoicePdf');
      await downloadInvoicePdf(
        invoiceRef.current,
        `${invoiceNumber(loan.loan_id, loan.borrow_date)}.pdf`,
      );
    } catch (err) {
      console.error('PDF export failed:', err);
      setDownloadError('PDF download failed. You can still use Print invoice.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-10 bg-white rounded-3xl border border-slate-200 animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/2" />
        <div className="h-4 bg-slate-200 rounded w-1/3" />
        <div className="h-48 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <XCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">{error || 'Invoice not found'}</h2>
        <Link to="/profile" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back to profile
        </Link>
      </div>
    );
  }

  const discount = Number(loan.discount_percentage ?? 0);
  const discountAmount = (Number(loan.rental_price) * discount) / 100;
  const fine = Number(loan.fine_amount ?? 0);
  const total = Number(loan.final_price) + fine;
  const paid = loan.payment_status === 'Paid';

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="no-print flex items-center justify-between gap-3">
        <Link to="/profile" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to profile
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 disabled:opacity-50"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {downloading ? 'Preparing…' : 'Download PDF'}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print invoice
          </button>
        </div>
      </div>

      {downloadError && (
        <p className="no-print p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{downloadError}</p>
      )}

      <div ref={invoiceRef} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10" id="invoice">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-5 pb-7 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                Q
              </div>
              <span className="text-lg font-extrabold text-slate-900">
                Query<span className="text-indigo-600">Mind</span>
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">Library & Book Borrowing Service</p>
            <p className="text-xs text-slate-400">support@querymind.local</p>
          </div>
          <div className="sm:text-right">
            <div className="inline-flex items-center gap-2 text-indigo-700">
              <ReceiptText className="w-5 h-5" />
              <span className="text-xl font-extrabold tracking-wide">INVOICE</span>
            </div>
            <p className="mt-2 font-mono text-sm font-semibold text-slate-800">
              {invoiceNumber(loan.loan_id, loan.borrow_date)}
            </p>
            <p className="text-xs text-slate-400">Issued {dateTime(loan.borrow_date)}</p>
            <span
              className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border ${
                paid
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {paid ? <CheckCircle2 className="w-3 h-3" /> : <ReceiptText className="w-3 h-3" />}
              {paid ? 'Paid' : 'Awaiting payment'}
            </span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 py-7">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Billed to</p>
            <p className="text-sm font-semibold text-slate-800">
              {user ? `${user.first_name} ${user.last_name}` : `Account #${loan.user_id}`}
            </p>
            <p className="text-xs text-slate-500">{user?.email || '—'}</p>
            {user?.phone && <p className="text-xs text-slate-500">{user.phone}</p>}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Loan details</p>
            <p className="text-xs text-slate-600">Copy #{loan.copy_id}</p>
            <p className="text-xs text-slate-600">Borrowed {date(loan.borrow_date)}</p>
            <p className="text-xs text-slate-600">Due {date(loan.due_date)}</p>
            {loan.return_date && <p className="text-xs text-slate-600">Returned {date(loan.return_date)}</p>}
          </div>
        </div>

        <div className="flex justify-center py-2">
          <div className="text-center">
            <div className="inline-block p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <QRCodeSVG value={invoiceNumber(loan.loan_id, loan.borrow_date)} size={112} level="M" />
            </div>
            <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-slate-500">
              <QrCode className="w-3.5 h-3.5 text-indigo-500" /> The librarian scans this to find the invoice
            </p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="text-left text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-200">
            <tr>
              <th className="py-3 font-semibold">Description</th>
              <th className="py-3 text-center font-semibold">Qty</th>
              <th className="py-3 text-right font-semibold">Rate</th>
              <th className="py-3 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-4">
                <p className="font-medium text-slate-800">Book rental</p>
                <p className="text-xs text-slate-500">{loan.book_title || `Book #${loan.book_id}`}</p>
              </td>
              <td className="py-4 text-center text-slate-600">1</td>
              <td className="py-4 text-right text-slate-600">{money(loan.rental_price)}</td>
              <td className="py-4 text-right font-semibold text-slate-800">{money(loan.rental_price)}</td>
            </tr>
            {discount > 0 && (
              <tr>
                <td className="py-3 text-slate-500" colSpan={3}>Discount ({discount}%)</td>
                <td className="py-3 text-right text-emerald-700">-{money(discountAmount)}</td>
              </tr>
            )}
            {fine > 0 && (
              <tr>
                <td className="py-3 text-slate-500" colSpan={3}>Late return fine</td>
                <td className="py-3 text-right text-rose-700">{money(fine)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-full sm:w-64 space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Subtotal</span><span>{money(loan.rental_price)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-xs text-emerald-700">
                <span>Discount</span><span>-{money(discountAmount)}</span>
              </div>
            )}
            {fine > 0 && (
              <div className="flex justify-between text-xs text-rose-700">
                <span>Fine</span><span>{money(fine)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
              <span className="text-sm font-bold text-slate-800">Total</span>
              <span className="text-xl font-extrabold text-indigo-700">{money(total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 grid sm:grid-cols-2 gap-6 text-xs">
          <div>
            <p className="font-semibold text-slate-700 mb-1">Payment</p>
            {paid ? (
              <p className="text-slate-500">
                Recorded by the librarian as <strong>{loan.payment_method || 'Counter'}</strong>
                {loan.paid_at ? ` on ${date(loan.paid_at)}` : ''}. No online card details were collected.
              </p>
            ) : (
              <p className="text-slate-500">
                Show this invoice (or let the librarian scan the QR) at the desk. They record the
                payment from their admin account — no card or PayPal details are needed.
              </p>
            )}
          </div>
          <div>
            <p className="font-semibold text-slate-700 mb-1">Loan status</p>
            <p className="text-slate-500">
              {loan.status.startsWith('Returned')
                ? 'Copy returned.'
                : `Copy on loan, due ${date(loan.due_date)}.`}
              {Number(loan.fine_amount) > 0 && ` Fine of ${money(loan.fine_amount)} applies.`}
            </p>
            <p className="text-slate-500 mt-1">
              Return the physical copy to the desk — only the librarian can confirm a return.
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-[11px] text-slate-400">
          Thank you for using QueryMind Library · This is a computer-generated invoice.
        </p>
      </div>

      <div className="no-print flex flex-wrap items-center justify-center gap-3">
        <Link to="/" className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50">
          Back to catalog
        </Link>
        <Link to="/profile" className="px-4 py-2 rounded-xl text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100">
          View my profile
        </Link>
      </div>
    </div>
  );
}
