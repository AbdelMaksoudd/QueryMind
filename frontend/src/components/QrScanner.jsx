import React, { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { AlertCircle, Camera, X } from 'lucide-react';

/** Camera scanner for the QR code printed on invoices. */
export default function QrScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserQRCodeReader();

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, _err, controls) => {
        if (cancelled) {
          controls?.stop();
          return;
        }
        controlsRef.current = controls;
        if (result) {
          controls?.stop();
          onResult(result.getText().trim());
          onClose();
        }
      })
      .then((controls) => {
        if (cancelled) controls.stop();
        else controlsRef.current = controls;
      })
      .catch(() => {
        if (!cancelled) setError('Camera access failed. Check permissions and use HTTPS or localhost.');
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, [onResult, onClose]);

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">Scan invoice QR</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Close scanner">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-6 border-2 border-emerald-400/70 rounded-xl pointer-events-none" />
          </div>
          {error ? (
            <p className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
            </p>
          ) : (
            <p className="text-xs text-slate-500 text-center">
              Place the QR code from the borrower's invoice inside the frame.
            </p>
          )}
          <p className="text-[11px] text-slate-400 text-center">
            You can also type the invoice number in the search box instead.
          </p>
        </div>
      </div>
    </div>
  );
}
