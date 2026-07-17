'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

type Order = {
  ID: number;
  user_id: number;
  total_amount: number;
  status: string;
  payment_method: string;
  CreatedAt: string;
};

type Product = {
  ID: number;
  name: string;
  stock: number;
  price: number;
  imageUrl: string;
  category?: { name: string };
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  BELUM_BAYAR: { label: 'Belum Bayar', color: '#b45309', bg: '#fef9c3', border: '#fde68a', dot: '#eab308' },
  PENGIRIMAN:  { label: 'Pengiriman',  color: '#0369a1', bg: '#e0f2fe', border: '#bae6fd', dot: '#0284c7' },
  SELESAI:     { label: 'Selesai',     color: '#15803d', bg: '#dcfce7', border: '#bbf7d0', dot: '#16a34a' },
  DIBATALKAN:  { label: 'Dibatalkan',  color: '#dc2626', bg: '#fee2e2', border: '#fecaca', dot: '#ef4444' },
};

function getMeta(status: string) {
  return STATUS_META[status] || { label: status, color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb', dot: '#9ca3af' };
}

function formatRp(num: number) {
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(1)}jt`;
  if (num >= 1_000) return `Rp ${(num / 1_000).toFixed(0)}rb`;
  return `Rp ${num.toLocaleString('id-ID')}`;
}

function formatDate(str: string) {
  if (!str) return '-';
  return new Date(str).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DashboardPage() {
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users,    setUsers]    = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [adminName, setAdminName] = useState("Admin SOD");

  useEffect(() => {
    try {
      const token = localStorage.getItem("admin_token");
      if (token) {
        const payloadStr = token.split(".")[1];
        const payload = JSON.parse(atob(payloadStr));
        if (payload.name) {
          setAdminName(payload.name);
        }
      }
    } catch (e) {
      console.error("Error decoding token:", e);
    }
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [ordRes, prodRes, userRes] = await Promise.allSettled([
          api.get('/admin/orders'),
          api.get('/products'),
          api.get('/admin/users'),
        ]);

        if (ordRes.status  === 'fulfilled') setOrders(ordRes.value.data?.data   || []);
        if (prodRes.status === 'fulfilled') setProducts(prodRes.value.data       || []);
        if (userRes.status === 'fulfilled') setUsers(Array.isArray(userRes.value.data) ? userRes.value.data : []);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ---- kalkulasi stats ----
  const totalRevenue    = orders.filter(o => o.status === 'SELESAI').reduce((s, o) => s + o.total_amount, 0);
  const pendingOrders   = orders.filter(o => o.status === 'BELUM_BAYAR' || o.status === 'PENGIRIMAN').length;
  const totalProducts   = products.length;
  const totalCustomers  = users.filter(u => u.role === 'CUSTOMER').length;

  // stok menipis: produk dengan stok <= 10
  const lowStock = products.filter(p => p.stock <= 10).sort((a, b) => a.stock - b.stock);
  // 5 pesanan terbaru
  const recentOrders = [...orders].sort((a, b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime()).slice(0, 5);

  const stats = [
    { label: 'Total Penjualan',  value: loading ? '…' : formatRp(totalRevenue),           icon: '💰', color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0', desc: 'Dari pesanan selesai' },
    { label: 'Pesanan Aktif',    value: loading ? '…' : `${pendingOrders} Pesanan`,        icon: '📦', color: '#0891b2', bg: '#cffafe', border: '#a5f3fc', desc: 'Menunggu diproses'    },
    { label: 'Total Produk',     value: loading ? '…' : `${totalProducts} Produk`,         icon: '🥬', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', desc: 'Sayuran tersedia'    },
    { label: 'Pelanggan',        value: loading ? '…' : `${totalCustomers} Orang`,         icon: '👥', color: '#7c3aed', bg: '#ede9fe', border: '#ddd6fe', desc: 'Terdaftar'           },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        .dash-wrap { font-family: 'Inter', sans-serif; }

        /* Heading */
        .dash-heading { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:24px; }
        .dash-title { font-size:26px; font-weight:800; color:#ffffff; margin:0 0 4px; letter-spacing:-0.5px; }
        .dash-subtitle { font-size:14px; color:#888888; margin:0; }
        .dash-badge { background:#111111; border:1px solid #333333; color:#4ade80; font-size:12px; font-weight:600; padding:6px 14px; border-radius:20px; }

        /* Hero */
        .dash-hero { background:linear-gradient(135deg,#0d1f14 0%,#14532d 50%,#166534 100%); border-radius:16px; padding:24px 28px; margin-bottom:24px; display:flex; align-items:center; justify-content:space-between; overflow:hidden; position:relative; border:1px solid #1a3a20; }
        .dash-hero::before { content:''; position:absolute; top:-40px; right:-40px; width:200px; height:200px; background:rgba(255,255,255,.04); border-radius:50%; }
        .dash-hero::after  { content:''; position:absolute; bottom:-60px; right:80px; width:160px; height:160px; background:rgba(255,255,255,.02); border-radius:50%; }
        .dash-hero-text { position:relative; z-index:1; }
        .dash-hero-greeting { font-size:13px; color:#86efac; font-weight:500; margin-bottom:4px; }
        .dash-hero-title { font-size:22px; font-weight:800; color:#ffffff; margin-bottom:6px; letter-spacing:-0.3px; }
        .dash-hero-sub { font-size:13px; color:#4ade80; }
        .dash-hero-emoji { font-size:60px; position:relative; z-index:1; filter:drop-shadow(0 4px 12px rgba(0,0,0,.4)); }

        /* Stats */
        .dash-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
        @media(max-width:900px){ .dash-stats{ grid-template-columns:repeat(2,1fr); } }
        .stat-card { background:#0a0a0a; border-radius:16px; padding:20px; border:1px solid #222222; transition:transform .15s,box-shadow .15s; }
        .stat-card:hover { transform:translateY(-2px); border-color:#333333; }
        .stat-icon-wrap { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:22px; margin-bottom:14px; background:#111111; border:1px solid #222222; }
        .stat-label { font-size:11.5px; font-weight:600; color:#666666; text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px; }
        .stat-value { font-size:22px; font-weight:800; letter-spacing:-0.5px; margin-bottom:4px; color: #ffffff; }
        .stat-desc { font-size:12px; color:#666666; }

        /* Skeleton pulse */
        .skel { display:inline-block; background:linear-gradient(90deg,#111111 25%,#1a1a1a 50%,#111111 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:6px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        /* Bottom grid */
        .dash-bottom { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        @media(max-width:700px){ .dash-bottom{ grid-template-columns:1fr; } }

        .dash-card { background:#0a0a0a; border:1px solid #222222; border-radius:16px; overflow:hidden; }
        .dash-card-header { padding:14px 18px; border-bottom:1px solid #1a1a1a; display:flex; align-items:center; justify-content:space-between; }
        .dash-card-title { font-size:14px; font-weight:700; color:#ffffff; display:flex; align-items:center; gap:6px; }
        .dash-card-link { font-size:12px; font-weight:600; color:#4ade80; text-decoration:none; }
        .dash-card-link:hover { color:#86efac; }

        /* Order rows */
        .ord-row { display:flex; align-items:center; justify-content:space-between; padding:11px 18px; border-bottom:1px solid #111111; gap:12px; }
        .ord-row:last-child { border-bottom:none; }
        .ord-id { font-size:12px; font-weight:700; color:#4ade80; flex-shrink:0; }
        .ord-date { font-size:11.5px; color:#666666; }
        .ord-price { font-size:13px; font-weight:700; color:#ffffff; white-space:nowrap; }
        .status-chip { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:600; border:1px solid; white-space:nowrap; flex-shrink:0; }
        .status-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; }

        /* Low stock rows */
        .stock-row { display:flex; align-items:center; gap:10px; padding:10px 18px; border-bottom:1px solid #111111; }
        .stock-row:last-child { border-bottom:none; }
        .stock-img { width:36px; height:36px; border-radius:8px; object-fit:cover; border:1px solid #222222; flex-shrink:0; }
        .stock-img-ph { width:36px; height:36px; border-radius:8px; background:#111111; border:1px solid #222222; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
        .stock-name { font-size:13px; font-weight:600; color:#ffffff; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .stock-cat  { font-size:11px; color:#666666; margin-top:1px; }
        .stock-badge { font-size:12px; font-weight:700; padding:3px 10px; border-radius:20px; white-space:nowrap; flex-shrink:0; }
        .stock-critical { background:#2a0a0a; color:#ff5555; border:1px solid #4a1a1a; }
        .stock-warning  { background:#1a1500; color:#ffcc00; border:1px solid #332900; }

        /* Empty */
        .dash-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; gap:8px; }
        .dash-empty-icon { font-size:36px; opacity:.4; }
        .dash-empty-text { font-size:13px; color:#666666; }
      `}</style>

      <div className="dash-wrap">
        {/* Heading */}
        <div className="dash-heading">
          <div>
            <h1 className="dash-title">Dashboard</h1>
            <p className="dash-subtitle">Selamat datang di panel admin SOD 🌿</p>
          </div>
          <div className="dash-badge">🟢 Online</div>
        </div>

        {/* Hero */}
        <div className="dash-hero">
          <div className="dash-hero-text">
            <div className="dash-hero-greeting">Halo, {adminName} 👋</div>
            <div className="dash-hero-title">Sayur on Delivery</div>
            <div className="dash-hero-sub">Pantau toko sayurmu dari sini dengan mudah</div>
          </div>
          <div className="dash-hero-emoji">🥦</div>
        </div>

        {/* Stats */}
        <div className="dash-stats">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon-wrap" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                {s.icon}
              </div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color }}>
                {loading
                  ? <span className="skel" style={{ width: 80, height: 28, display: 'block' }} />
                  : s.value}
              </div>
              <div className="stat-desc">{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="dash-bottom">

          {/* Pesanan Terbaru */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">📋 Pesanan Terbaru</span>
              <Link href="/pesanan" className="dash-card-link">Lihat semua →</Link>
            </div>
            {loading ? (
              <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <span key={i} className="skel" style={{ height: 40, display: 'block', borderRadius: 8 }} />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="dash-empty">
                <div className="dash-empty-icon">📦</div>
                <div className="dash-empty-text">Belum ada pesanan masuk</div>
              </div>
            ) : (
              recentOrders.map((o) => {
                const m = getMeta(o.status);
                return (
                  <div key={o.ID} className="ord-row">
                    <div>
                      <div className="ord-id">#{o.ID}</div>
                      <div className="ord-date">{formatDate(o.CreatedAt)}</div>
                    </div>
                    <span className="status-chip" style={{ color: m.color, background: m.bg, borderColor: m.border }}>
                      <span className="status-dot" style={{ background: m.dot }} />
                      {m.label}
                    </span>
                    <div className="ord-price">Rp {o.total_amount.toLocaleString('id-ID')}</div>
                  </div>
                );
              })
            )}
          </div>

          {/* Stok Menipis */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">⚠️ Stok Menipis</span>
              <Link href="/produk" className="dash-card-link">Kelola produk →</Link>
            </div>
            {loading ? (
              <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <span key={i} className="skel" style={{ height: 40, display: 'block', borderRadius: 8 }} />
                ))}
              </div>
            ) : lowStock.length === 0 ? (
              <div className="dash-empty">
                <div className="dash-empty-icon">🌱</div>
                <div className="dash-empty-text">Semua stok aman ✅</div>
              </div>
            ) : (
              lowStock.slice(0, 6).map((p) => (
                <div key={p.ID} className="stock-row">
                  {p.imageUrl
                    ? <img src={p.imageUrl} alt={p.name} className="stock-img" />
                    : <div className="stock-img-ph">🥦</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="stock-name">{p.name}</div>
                    <div className="stock-cat">{p.category?.name || '-'}</div>
                  </div>
                  <span className={`stock-badge ${p.stock === 0 ? 'stock-critical' : 'stock-warning'}`}>
                    {p.stock === 0 ? '🔴 Habis' : `⚠️ ${p.stock} sisa`}
                  </span>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </>
  );
}