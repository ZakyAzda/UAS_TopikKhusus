'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { ShoppingCart, Search, ChevronDown, Eye, X } from 'lucide-react';

const STATUS_OPTIONS = ['Semua', 'BELUM_BAYAR', 'PENGIRIMAN', 'SELESAI', 'DIBATALKAN'];

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  BELUM_BAYAR:  { label: 'Belum Bayar',  color: '#b45309', bg: '#fef9c3', border: '#fde68a', dot: '#eab308' },
  PENGIRIMAN:   { label: 'Pengiriman',   color: '#0369a1', bg: '#e0f2fe', border: '#bae6fd', dot: '#0284c7' },
  SELESAI:      { label: 'Selesai',      color: '#15803d', bg: '#dcfce7', border: '#bbf7d0', dot: '#16a34a' },
  DIBATALKAN:   { label: 'Dibatalkan',   color: '#dc2626', bg: '#fee2e2', border: '#fecaca', dot: '#ef4444' },
};

type Order = {
  ID: number;
  user_id: number;
  total_amount: number;
  address: string;
  status: string;
  payment_method: string;
  order_items: {
    ID: number;
    quantity: number;
    price: number;
    product: { name: string; imageUrl: string };
  }[];
  CreatedAt: string;
};

export default function PesananPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterPayment, setFilterPayment] = useState('Semua');
  const [search, setSearch] = useState('');
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/orders');
      setOrders(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    setUpdating(orderId);
    try {
      await api.put(`/admin/orders/${orderId}`, { status: newStatus });
      setOrders((prev) =>
        prev.map((o) => (o.ID === orderId ? { ...o, status: newStatus } : o))
      );
      if (detailOrder?.ID === orderId) {
        setDetailOrder((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      alert('Gagal update status pesanan!');
    } finally {
      setUpdating(null);
    }
  };

  const paymentMethods = ['Semua', ...Array.from(new Set(orders.map((o) => o.payment_method).filter(Boolean)))];

  const filtered = orders.filter((o) => {
    const matchStatus = filterStatus === 'Semua' || o.status === filterStatus;
    const matchPayment = filterPayment === 'Semua' || o.payment_method === filterPayment;
    const matchSearch = search === '' || String(o.ID).includes(search) || String(o.user_id).includes(search);
    return matchStatus && matchPayment && matchSearch;
  });

  const getMeta = (status: string) => STATUS_META[status] || { label: status, color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb', dot: '#9ca3af' };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .ord-wrap { font-family: 'Inter', sans-serif; }

        .ord-heading { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
        .ord-title-group { display:flex; align-items:center; gap:12px; }
        .ord-title-icon { width:44px; height:44px; background:#111111; border:1px solid #333333; border-radius:12px; display:flex; align-items:center; justify-content:center; }
        .ord-title { font-size:24px; font-weight:800; color:#ffffff; margin:0; letter-spacing:-0.4px; }
        .ord-count { font-size:13px; color:#666666; margin:2px 0 0; }

        /* Toolbar */
        .ord-toolbar { display:flex; align-items:center; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
        .ord-search { position:relative; flex:1; min-width:180px; max-width:280px; }
        .ord-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#666666; pointer-events:none; }
        .ord-search-input { width:100%; padding:9px 12px 9px 36px; border:1px solid #333333; border-radius:10px; font-size:13.5px; background:#0a0a0a; color:#ffffff; outline:none; transition:border-color .15s; font-family:'Inter',sans-serif; box-sizing:border-box; }
        .ord-search-input:focus { border-color:#4ade80; }
        .ord-search-input::placeholder { color:#555555; }

        .ord-select { appearance:none; padding:9px 32px 9px 12px; border:1px solid #333333; border-radius:10px; font-size:13.5px; background:#0a0a0a; color:#cccccc; outline:none; cursor:pointer; font-family:'Inter',sans-serif; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24' stroke='%23666666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; transition:border-color .15s; }
        .ord-select:focus { border-color:#4ade80; }

        /* Table card */
        .ord-table-card { background:#0a0a0a; border:1px solid #222222; border-radius:16px; overflow:hidden; }
        .ord-table { width:100%; border-collapse:collapse; }
        .ord-table thead { background:#0d0d0d; }
        .ord-table thead th { padding:11px 18px; text-align:left; font-size:11.5px; font-weight:700; color:#4ade80; text-transform:uppercase; letter-spacing:.5px; border-bottom:1px solid #1a1a1a; white-space:nowrap; }
        .ord-table tbody tr { border-bottom:1px solid #111111; transition:background .1s; }
        .ord-table tbody tr:last-child { border-bottom:none; }
        .ord-table tbody tr:hover { background:#0d0d0d; }
        .ord-table td { padding:13px 18px; font-size:13.5px; color:#cccccc; vertical-align:middle; }

        .ord-id { font-weight:700; color:#4ade80; font-size:13px; }
        .ord-price { font-weight:700; color:#ffffff; }

        .status-chip { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:20px; font-size:11.5px; font-weight:600; white-space:nowrap; border:1px solid; }
        .status-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

        .ord-status-select { appearance:none; font-size:12px; font-weight:600; border-radius:20px; border:1px solid; padding:3px 22px 3px 8px; cursor:pointer; outline:none; font-family:'Inter',sans-serif; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='none' viewBox='0 0 24 24' stroke='%23666666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 6px center; background-color:transparent; transition:opacity .15s; }
        .ord-status-select:disabled { opacity:.6; cursor:wait; }

        .ord-view-btn { border:none; background:none; cursor:pointer; color:#4ade80; padding:6px; border-radius:8px; transition:background .15s; display:inline-flex; }
        .ord-view-btn:hover { background:#111111; }

        /* Empty */
        .ord-empty { text-align:center; padding:60px 20px; color:#666666; }
        .ord-empty-icon { font-size:48px; margin-bottom:12px; opacity:.5; }

        /* Skeleton */
        .ord-skeleton { height:52px; background:linear-gradient(90deg,#111111 25%,#1a1a1a 50%,#111111 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:8px; margin:4px 18px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        /* Modal */
        .ord-modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.7); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn .15s ease; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .ord-modal { background:#0d0d0d; border:1px solid #222222; border-radius:20px; width:100%; max-width:520px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.6); animation:slideUp .2s ease; }
        @keyframes slideUp { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
        .ord-modal-header { display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-bottom:1px solid #1a1a1a; position:sticky; top:0; background:#0d0d0d; border-radius:20px 20px 0 0; z-index:1; }
        .ord-modal-title { font-size:16px; font-weight:800; color:#ffffff; }
        .ord-modal-close { border:none; background:none; cursor:pointer; color:#666666; padding:6px; border-radius:8px; transition:background .15s; display:flex; }
        .ord-modal-close:hover { background:#1a1a1a; color:#ffffff; }
        .ord-modal-body { padding:20px 24px; }
        .ord-modal-section { margin-bottom:18px; }
        .ord-modal-section-title { font-size:11px; font-weight:700; color:#4ade80; text-transform:uppercase; letter-spacing:.8px; margin-bottom:10px; }
        .ord-modal-row { display:flex; justify-content:space-between; align-items:flex-start; font-size:13.5px; margin-bottom:7px; gap:12px; }
        .ord-modal-label { color:#666666; flex-shrink:0; }
        .ord-modal-val { font-weight:600; color:#ffffff; text-align:right; word-break:break-word; }
        .ord-item-row { display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid #1a1a1a; font-size:13.5px; gap:8px; }
        .ord-item-row:last-child { border-bottom:none; }
        .ord-item-name { font-weight:600; color:#ffffff; }
        .ord-item-sub { font-size:12px; color:#666666; }
        .ord-item-price { font-weight:700; color:#4ade80; white-space:nowrap; }
        .ord-modal-total { display:flex; justify-content:space-between; padding:12px 16px; background:#111111; border:1px solid #222222; border-radius:10px; margin-top:12px; font-weight:800; color:#ffffff; font-size:15px; }

        .ord-modal-select { width:100%; appearance:none; padding:10px 32px 10px 14px; border:1px solid #333333; border-radius:10px; font-size:13.5px; background:#111111; color:#ffffff; outline:none; cursor:pointer; font-family:'Inter',sans-serif; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24' stroke='%23666666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; transition:border-color .15s; margin-top:6px; }
        .ord-modal-select:focus { border-color:#4ade80; }
      `}</style>

      <div className="ord-wrap">
        {/* Heading */}
        <div className="ord-heading">
          <div className="ord-title-group">
            <div className="ord-title-icon">
              <ShoppingCart size={22} color="#16a34a" />
            </div>
            <div>
              <h1 className="ord-title">Manajemen Pesanan</h1>
              <p className="ord-count">{filtered.length} dari {orders.length} pesanan ditampilkan</p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="ord-toolbar">
          <div className="ord-search">
            <Search size={14} className="ord-search-icon" />
            <input
              type="text"
              className="ord-search-input"
              placeholder="Cari ID / User ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="ord-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === 'Semua' ? '🔍 Semua Status' : getMeta(s).label}</option>
            ))}
          </select>
          <select className="ord-select" value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)}>
            {paymentMethods.map((p) => (
              <option key={p} value={p}>{p === 'Semua' ? '💳 Semua Pembayaran' : p}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="ord-table-card">
          <table className="ord-table">
            <thead>
              <tr>
                <th>ID Pesanan</th>
                <th>User ID</th>
                <th>Total</th>
                <th>Pembayaran</th>
                <th>Status</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} style={{ padding: '6px 18px' }}>
                      <div className="ord-skeleton" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="ord-empty">
                      <div className="ord-empty-icon">📦</div>
                      <div>Belum ada pesanan yang masuk</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((order) => {
                  const meta = getMeta(order.status);
                  return (
                    <tr key={order.ID}>
                      <td><span className="ord-id">#{order.ID}</span></td>
                      <td style={{ color: '#6b7280' }}>User #{order.user_id}</td>
                      <td><span className="ord-price">Rp {order.total_amount.toLocaleString('id-ID')}</span></td>
                      <td style={{ fontSize: '12.5px', fontWeight: 500 }}>{order.payment_method || '-'}</td>
                      <td>
                        <select
                          className="ord-status-select"
                          style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}
                          value={order.status}
                          disabled={updating === order.ID}
                          onChange={(e) => handleUpdateStatus(order.ID, e.target.value)}
                        >
                          {Object.entries(STATUS_META).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button className="ord-view-btn" onClick={() => setDetailOrder(order)} title="Lihat detail">
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {detailOrder && (
        <div className="ord-modal-backdrop" onClick={() => setDetailOrder(null)}>
          <div className="ord-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ord-modal-header">
              <span className="ord-modal-title">📦 Detail Pesanan #{detailOrder.ID}</span>
              <button className="ord-modal-close" onClick={() => setDetailOrder(null)}><X size={18} /></button>
            </div>
            <div className="ord-modal-body">
              {/* Info */}
              <div className="ord-modal-section">
                <div className="ord-modal-section-title">Informasi Pesanan</div>
                <div className="ord-modal-row"><span className="ord-modal-label">User ID</span><span className="ord-modal-val">#{detailOrder.user_id}</span></div>
                <div className="ord-modal-row"><span className="ord-modal-label">Alamat</span><span className="ord-modal-val">{detailOrder.address || '-'}</span></div>
                <div className="ord-modal-row"><span className="ord-modal-label">Pembayaran</span><span className="ord-modal-val">{detailOrder.payment_method || '-'}</span></div>
                <div className="ord-modal-row">
                  <span className="ord-modal-label">Status</span>
                  <span className="status-chip" style={{ color: getMeta(detailOrder.status).color, background: getMeta(detailOrder.status).bg, borderColor: getMeta(detailOrder.status).border }}>
                    <span className="status-dot" style={{ background: getMeta(detailOrder.status).dot }} />
                    {getMeta(detailOrder.status).label}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="ord-modal-section">
                <div className="ord-modal-section-title">Item Pesanan</div>
                {(detailOrder.order_items || []).map((item) => (
                  <div key={item.ID} className="ord-item-row">
                    <div>
                      <div className="ord-item-name">{item.product?.name || 'Produk dihapus'}</div>
                      <div className="ord-item-sub">{item.quantity} × Rp {item.price.toLocaleString('id-ID')}</div>
                    </div>
                    <div className="ord-item-price">Rp {(item.quantity * item.price).toLocaleString('id-ID')}</div>
                  </div>
                ))}
                <div className="ord-modal-total">
                  <span>Total Pembayaran</span>
                  <span>Rp {detailOrder.total_amount.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Update Status */}
              <div className="ord-modal-section">
                <div className="ord-modal-section-title">Update Status Pesanan</div>
                <select
                  className="ord-modal-select"
                  value={detailOrder.status}
                  disabled={updating === detailOrder.ID}
                  onChange={(e) => handleUpdateStatus(detailOrder.ID, e.target.value)}
                >
                  {Object.entries(STATUS_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
