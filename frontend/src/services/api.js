import axios from 'axios';

// Vite environment variable or fallback to relative URL (proxied by Vite) or localhost:8000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Fetch books with optional filtering
 * @param {Object} params - { category, search, is_available }
 */
export async function getBooks(params = {}) {
  const queryParams = {};
  if (params.category && params.category !== 'All') {
    queryParams.category = params.category;
  }
  if (params.search && params.search.trim()) {
    queryParams.search = params.search.trim();
  }
  if (params.is_available !== undefined && params.is_available !== null) {
    queryParams.is_available = params.is_available;
  }

  const response = await apiClient.get('/books', { params: queryParams });
  return response.data;
}

/**
 * Fetch all available categories
 */
export async function getCategories() {
  const response = await apiClient.get('/books/categories');
  return response.data;
}

/**
 * Toggle book borrowing status (borrow / return)
 * @param {number} bookId
 */
export async function toggleBorrowBook(bookId) {
  const response = await apiClient.patch(`/books/${bookId}/toggle-availability`);
  return response.data;
}

/**
 * Send user query to AI chat placeholder endpoint
 * @param {string} message
 * @param {string|null} conversationId
 */
export async function sendChatMessage(message, conversationId = null) {
  const response = await apiClient.post('/chat', {
    message,
    conversation_id: conversationId,
  });
  return response.data; // { reply: string, timestamp: string }
}

export default apiClient;

