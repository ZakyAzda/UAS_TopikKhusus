import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Backend production di Railway
export const BASE_URL = 'https://ecom-backend-go-production.up.railway.app';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── REQUEST INTERCEPTOR (Otomatis sisipkan token JWT) ────────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── RESPONSE INTERCEPTOR (Handle error global) ──────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/api/login', { email, password }),

  register: (name: string, email: string, password: string, whatsapp_number: string) =>
    api.post('/api/register', { name, email, password, whatsapp_number }),
};

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
export const productAPI = {
  getAll: (search?: string, categoryId?: string) =>
    api.get('/api/products', { params: { search, categoryId } }),

  getOne: (id: number) =>
    api.get(`/api/products/${id}`),

  getCategories: () =>
    api.get('/api/product-categories'),
};

// ─── CART ─────────────────────────────────────────────────────────────────────
export const cartAPI = {
  getMyCart: () =>
    api.get('/api/cart'),

  addToCart: (product_id: number, quantity: number) =>
    api.post('/api/cart', { product_id, quantity }),

  removeFromCart: (cart_id: number) =>
    api.delete(`/api/cart/${cart_id}`),
};

// ─── ORDERS ───────────────────────────────────────────────────────────────────
export const orderAPI = {
    checkout: (payload: {
        cart_ids?: number[];    // sudah ada ✓
        product_id?: number;   // sudah ada ✓
        quantity?: number;     // sudah ada ✓
        address: string;
        payment_method: string;
    }) => api.post('/api/checkout', payload),

  getMyOrders: () =>
    api.get('/api/orders'),
};

// ─── TOKEN HELPERS ────────────────────────────────────────────────────────────
export const saveToken = async (token: string) => {
  await AsyncStorage.setItem('token', token);
};

export const getToken = async () => {
  return await AsyncStorage.getItem('token');
};

export const clearSession = async () => {
  await AsyncStorage.multiRemove(['token', 'user']);
};

export const saveUser = async (user: object) => {
  await AsyncStorage.setItem('user', JSON.stringify(user));
};

export const getUser = async () => {
  const u = await AsyncStorage.getItem('user');
  return u ? JSON.parse(u) : null;
};

export default api;