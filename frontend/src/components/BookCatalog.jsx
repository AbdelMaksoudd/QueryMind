import React, { useState, useEffect, useMemo } from 'react';
import { Search, LayoutGrid, List, SlidersHorizontal, BookOpen, RefreshCw, X } from 'lucide-react';
import BookCard from './BookCard';
import { getBooks, getCategories, toggleBorrowBook } from '../services/api';

export default function BookCatalog() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch initial books & categories
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [booksData, categoriesData] = await Promise.all([
        getBooks({
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          search: searchQuery || undefined,
          is_available: availableOnly ? true : undefined,
        }),
        getCategories(),
      ]);
      setBooks(booksData);
      setCategories(['All', ...categoriesData]);
    } catch (err) {
      console.error('Failed to load books:', err);
      setError('Could not connect to the backend library API. Ensure FastAPI is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when category, search query, or availability filter changes (with debounce for search)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery, availableOnly]);

  // Handle borrow/return toggle
  const handleToggleAvailability = async (bookId) => {
    try {
      const updatedBook = await toggleBorrowBook(bookId);
      setBooks((prev) =>
        prev.map((b) => (b.id === bookId ? updatedBook : b))
      );
    } catch (err) {
      console.error('Failed to update book status:', err);
      alert('Failed to update book status. Please check your backend connection.');
    }
  };

  // Quick stats
  const stats = useMemo(() => {
    const total = books.length;
    const available = books.filter((b) => b.is_available).length;
    const borrowed = total - available;
    return { total, available, borrowed };
  }, [books]);

  return (
    <div className="space-y-6">
      {/* Header and Quick Stats */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/20 mb-3">
            <BookOpen className="w-3.5 h-3.5" /> Library Catalog & Borrowing
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Explore & Borrow Books
          </h1>
          <p className="mt-2 text-indigo-200 text-sm sm:text-base leading-relaxed">
            Browse our curated collection of books. Borrow available editions or consult our built-in AI Library Assistant for tailored recommendations.
          </p>

          {/* Quick Metrics */}
          <div className="mt-6 flex flex-wrap gap-4 sm:gap-6 text-sm">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
              <span className="text-slate-300 block text-xs">Total Books</span>
              <span className="text-xl font-bold">{stats.total}</span>
            </div>
            <div className="bg-emerald-500/20 backdrop-blur-md px-4 py-2 rounded-xl border border-emerald-400/30">
              <span className="text-emerald-300 block text-xs">Available Now</span>
              <span className="text-xl font-bold text-emerald-200">{stats.available}</span>
            </div>
            <div className="bg-rose-500/20 backdrop-blur-md px-4 py-2 rounded-xl border border-rose-400/30">
              <span className="text-rose-300 block text-xs">Currently Borrowed</span>
              <span className="text-xl font-bold text-rose-200">{stats.borrowed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, author..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Toggle buttons: Availability & View Switcher */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={() => setAvailableOnly(!availableOnly)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                availableOnly
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Available Only
            </button>

            {/* View switcher (Grid / List) */}
            <div className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={loadData}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
              title="Refresh Catalog"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 chat-scrollbar">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 pl-1 pr-2">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center justify-between">
          <div>
            <span className="font-semibold">Backend Alert:</span> {error}
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-3'
          }
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse space-y-4"
            >
              <div className="aspect-[16/10] bg-slate-200 rounded-xl" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
              <div className="h-8 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && books.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No books found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            We couldn't find any books matching your filter criteria. Try resetting the category or clearing the search query.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
              setAvailableOnly(false);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-100"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Book List / Grid Display */}
      {!loading && books.length > 0 && (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-3'
          }
        >
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onToggleAvailability={handleToggleAvailability}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

