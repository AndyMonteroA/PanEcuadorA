import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor: agregar token JWT a cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('panecuador_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: manejar errores globales
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('panecuador_token');
      localStorage.removeItem('panecuador_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================
// AUTH
// ============================================================

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// ============================================================
// PRODUCTS
// ============================================================

export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getFeatured: () => api.get('/products/featured'),
  getById: (id) => api.get(`/products/${id}`),
  getByCategory: (id) => api.get(`/products/category/${id}`),
};

// ============================================================
// CATEGORIES
// ============================================================

export const categoriesAPI = {
  getAll: () => api.get('/categories'),
};

// ============================================================
// CART
// ============================================================

export const cartAPI = {
  get: () => api.get('/cart'),
  add: (id_producto, cantidad = 1) => api.post('/cart', { id_producto, cantidad }),
  update: (id, cantidad) => api.put(`/cart/${id}`, { cantidad }),
  remove: (id) => api.delete(`/cart/${id}`),
  clear: () => api.delete('/cart'),
};

// ============================================================
// ORDERS
// ============================================================

export const ordersAPI = {
  create: (data) => api.post('/orders', data),
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  cancel: (id) => api.put(`/orders/${id}/cancel`),
};

// ============================================================
// SUBSCRIPTIONS
// ============================================================

export const subscriptionsAPI = {
  getPlans: () => api.get('/subscriptions/plans'),
  getMy: () => api.get('/subscriptions/my'),
  subscribe: (data) => api.post('/subscriptions', data),
  cancel: () => api.put('/subscriptions/cancel'),
};

// ============================================================
// REVIEWS & FAVORITES
// ============================================================

export const reviewsAPI = {
  getByProduct: (id, params) => api.get(`/reviews/product/${id}`, { params }),
  create: (data) => api.post('/reviews', data),
  getFavorites: () => api.get('/reviews/favorites'),
  toggleFavorite: (productId) => api.post(`/reviews/favorites/${productId}`),
  createReturn: (data) => api.post('/reviews/returns', data),
};

// ============================================================
// NOTIFICATIONS
// ============================================================

export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// ============================================================
// USERS
// ============================================================

export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  addAddress: (data) => api.post('/users/addresses', data),
  deleteAddress: (id) => api.delete(`/users/addresses/${id}`),
  addPaymentMethod: (data) => api.post('/users/payment-methods', data),
};

// ============================================================
// ADMIN
// ============================================================

export const adminAPI = {
  // Dashboard
  getStats: () => api.get('/admin/stats'),

  // Products
  getProducts: (params) => api.get('/admin/products', { params }),
  createProduct: (formData) => api.post('/admin/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateProduct: (id, formData) => api.put(`/admin/products/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),

  // Categories
  getCategories: () => api.get('/admin/categories'),
  createCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),

  // Orders
  getOrders: (params) => api.get('/admin/orders', { params }),
  getOrder: (id) => api.get(`/admin/orders/${id}`),
  updateOrderStatus: (id, estado) => api.put(`/admin/orders/${id}/status`, { estado }),

  // Users
  getUsers: (params) => api.get('/admin/users', { params }),

  // Producers
  getProducers: () => api.get('/admin/producers'),
  createProducer: (data) => api.post('/admin/producers', data),
  updateProducer: (id, data) => api.put(`/admin/producers/${id}`, data),
  deleteProducer: (id) => api.delete(`/admin/producers/${id}`),

  // Workers
  getWorkers: () => api.get('/admin/workers'),
  createWorker: (data) => api.post('/admin/workers', data),
  updateWorker: (id, data) => api.put(`/admin/workers/${id}`, data),
  deleteWorker: (id) => api.delete(`/admin/workers/${id}`),

  // Shifts
  getShifts: () => api.get('/admin/shifts'),
  getShiftAssignments: (params) => api.get('/admin/shift-assignments', { params }),
  createShiftAssignment: (data) => api.post('/admin/shift-assignments', data),
  deleteShiftAssignment: (id) => api.delete(`/admin/shift-assignments/${id}`),

  // Coupons
  getCoupons: () => api.get('/admin/coupons'),
  createCoupon: (data) => api.post('/admin/coupons', data),
  updateCoupon: (id, data) => api.put(`/admin/coupons/${id}`, data),
  deleteCoupon: (id) => api.delete(`/admin/coupons/${id}`),

  // Stock Renewal
  renewStock: (id, stock) => api.post(`/admin/products/${id}/renew-stock`, { stock }),

  // Returns
  getReturns: (params) => api.get('/admin/returns', { params }),
  updateReturnStatus: (id, estado) => api.put(`/admin/returns/${id}/status`, { estado }),

  // Dashboard extras
  getCurrentShift: () => api.get('/admin/current-shift'),
  getExpiringProducts: () => api.get('/admin/expiring-products'),
  generateShifts: () => api.post('/admin/generate-shifts'),
  getReturnsCount: () => api.get('/admin/returns-count'),
};

export default api;
