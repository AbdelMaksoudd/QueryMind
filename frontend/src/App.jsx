import React, { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import BookCatalog from './components/BookCatalog';
import BookDetail from './components/BookDetail';
import Profile from './components/Profile';
import Receipt from './components/Receipt';
import ErrorBoundary from './components/ErrorBoundary';
import Admin from './components/Admin';
import ChatWidget from './components/ChatWidget';
import AuthModal from './components/AuthModal';
import { AuthProvider } from './context/AuthContext';

function AppShell() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [authModal, setAuthModal] = useState({ open: false, mode: 'login' });

  const openAuth = (mode = 'login') => setAuthModal({ open: true, mode });
  const closeAuth = () => setAuthModal((state) => ({ ...state, open: false }));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
      <Navbar onOpenChat={() => setIsChatOpen(true)} onOpenAuth={openAuth} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<BookCatalog onRequireAuth={openAuth} />} />
            <Route path="/books/:bookId" element={<BookDetail onRequireAuth={openAuth} />} />
            <Route path="/profile" element={<Profile onRequireAuth={openAuth} />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/loans/:loanId/receipt" element={<Receipt />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>

      <ChatWidget isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
      <AuthModal open={authModal.open} initialMode={authModal.mode} onClose={closeAuth} />

      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 QueryMind Library Management System. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              FastAPI + PostgreSQL
            </span>
            <span className="text-slate-300">|</span>
            <span>React + Tailwind CSS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
