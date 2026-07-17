import axios from 'axios';

const api = axios.create({
  // ✅ Semua request diteruskan melalui proxy Next.js → backend internal Railway
  // Di production (Railway): proxy meneruskan ke ecom-backend-go.railway.internal
  // Di lokal: proxy meneruskan ke BACKEND_INTERNAL_URL di .env.local
  baseURL: '/api/proxy',
});

// Otomatis nyelipin Token JWT Admin kalau ada
api.interceptors.request.use((config) => {
  // Nanti kita ambil token dari localStorage yang disimpen pas Login
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}); 

export default api;