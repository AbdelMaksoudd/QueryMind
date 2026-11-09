import React, { useState } from 'react';
import Navbar from './components/Navbar';
import BookCatalog from './components/BookCatalog';
import ChatWidget from './components/ChatWidget';

export default function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar onOpenChat={() => setIsChatOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BookCatalog />
      </main>

      {/* Collapsible Persistent AI Chat Drawer/Widget */}
      <ChatWidget isOpen={isChatOpen} setIsOpen={setIsChatOpen} />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 Athena Library Management System. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              FastAPI + PostgreSQL Ready
            </span>
            <span className="text-slate-300">|</span>
            <span>React + Tailwind CSS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

