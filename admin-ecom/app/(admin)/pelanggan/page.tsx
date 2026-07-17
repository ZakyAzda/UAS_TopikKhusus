'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Users, Search, RefreshCw, AlertTriangle, LogOut, Pencil, X, Check, ShieldCheck, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';

type User = {
  ID: number;
  name: string;
  email: string;
  whatsapp_number: string;
  role: string;
  CreatedAt: string;
};

const ROLE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ADMIN:    { label: 'Admin',     color: '#15803d', bg: '#dcfce7', border: '#86efac' },
  CUSTOMER: { label: 'Pelanggan', color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' },
};

export default function PelangganPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('Semua');

  // Edit role state
  const [roleTarget, setRoleTarget] = useState<User | null>(null);
  const [roleValue, setRoleValue] = useState('');
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState('');
  const [roleSuccess, setRoleSuccess] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/users');
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setUsers(data);
    } catch (err: any) {
      const status = err?.response?.status ?? 0;
      const msg = err?.response?.data?.error ?? err?.message ?? 'Terjadi kesalahan';
      setError({ status, message: msg });
      console.error('[PelangganPage]', status, msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleLogoutRelogin = () => {
    localStorage.removeItem('admin_token');
    router.push('/login');
  };

  const openRoleEdit = (user: User) => {
    setRoleTarget(user);
    setRoleValue(user.role);
    setRoleError('');
    setRoleSuccess(false);
  };

  const handleRoleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleTarget) return;
    setRoleLoading(true);
    setRoleError('');
    try {
      await api.put(`/admin/users/${roleTarget.ID}/role`, { role: roleValue });
      setRoleSuccess(true);
      fetchUsers();
      setTimeout(() => { setRoleTarget(null); setRoleSuccess(false); }, 1400);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message || 'Terjadi kesalahan';
      if (status === 405) {
        setRoleError(`Method tidak diizinkan (405) — pastikan backend sudah di-restart setelah route baru ditambahkan.`);
      } else if (status === 403) {
        setRoleError(`Akses ditolak (403) — token Admin kamu mungkin sudah kedaluwarsa, coba logout & login ulang.`);
      } else if (status === 404) {
        setRoleError(`User tidak ditemukan (404).`);
      } else {
        setRoleError(`Gagal mengubah role${status ? ` (${status})` : ''}: ${msg}`);
      }
    } finally {
      setRoleLoading(false);
    }
  };

  const filtered = users.filter((u) => {
    const matchRole = filterRole === 'Semua' || u.role === filterRole;
    const matchSearch = search === '' ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      (u.whatsapp_number || '').includes(search);
    return matchRole && matchSearch;
  });

  const getRoleMeta = (role: string) =>
    ROLE_META[role] || { label: role, color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getInitial = (name: string) => (name || '?').charAt(0).toUpperCase();
  const avatarColors = ['#16a34a', '#0891b2', '#7c3aed', '#ea580c', '#db2777'];
  const getAvatarColor = (id: number) => avatarColors[id % avatarColors.length];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .pel-wrap { font-family: 'Inter', sans-serif; }

        .pel-heading { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
        .pel-title-group { display:flex; align-items:center; gap:12px; }
        .pel-title-icon { width:44px; height:44px; background:#111111; border:1px solid #333333; border-radius:12px; display:flex; align-items:center; justify-content:center; }
        .pel-title { font-size:24px; font-weight:800; color:#ffffff; margin:0; letter-spacing:-0.4px; }
        .pel-count { font-size:13px; color:#666666; margin:2px 0 0; }

        .pel-refresh-btn { display:flex; align-items:center; gap:6px; background:#111111; border:1px solid #333333; color:#4ade80; padding:8px 14px; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; font-family:'Inter',sans-serif; transition:background .15s; }
        .pel-refresh-btn:hover { background:#1a1a1a; }

        /* Stats */
        .pel-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:20px; }
        @media(max-width:600px){ .pel-stats{ grid-template-columns:1fr 1fr; } }
        .pel-stat { background:#0a0a0a; border:1px solid #222222; border-radius:14px; padding:16px 18px; }
        .pel-stat-label { font-size:11.5px; color:#666666; font-weight:600; text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px; }
        .pel-stat-val { font-size:22px; font-weight:800; color:#ffffff; }

        /* Error cards */
        .err-card { border-radius:14px; padding:16px 20px; margin-bottom:20px; display:flex; align-items:flex-start; gap:12px; }
        .err-card-403 { background:#1a0505; border:1px solid #4a1a1a; }
        .err-card-0   { background:#1a1200; border:1px solid #332900; }
        .err-icon { flex-shrink:0; margin-top:2px; }
        .err-title { font-size:14px; font-weight:700; margin-bottom:4px; }
        .err-403 .err-title { color:#ff5555; }
        .err-0   .err-title { color:#ffcc00; }
        .err-body { font-size:13px; line-height:1.6; }
        .err-403 .err-body { color:#ff8888; }
        .err-0   .err-body { color:#ffcc66; }
        .err-actions { display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
        .err-btn { display:inline-flex; align-items:center; gap:6px; font-size:12.5px; font-weight:600; padding:7px 14px; border-radius:8px; border:none; cursor:pointer; font-family:'Inter',sans-serif; transition:opacity .15s; }
        .err-btn-red { background:#dc2626; color:#fff; }
        .err-btn-red:hover { opacity:.88; }
        .err-btn-yellow { background:#d97706; color:#fff; }
        .err-btn-yellow:hover { opacity:.88; }
        .err-btn-outline { background:transparent; border:1px solid currentColor; }
        .err-btn-outline-red { color:#ff5555; }
        .err-btn-outline-yellow { color:#ffcc00; }

        /* Toolbar */
        .pel-toolbar { display:flex; align-items:center; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
        .pel-search { position:relative; flex:1; min-width:180px; max-width:320px; }
        .pel-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#666666; pointer-events:none; }
        .pel-search-input { width:100%; padding:9px 12px 9px 36px; border:1px solid #333333; border-radius:10px; font-size:13.5px; background:#0a0a0a; color:#ffffff; outline:none; transition:border-color .15s; font-family:'Inter',sans-serif; box-sizing:border-box; }
        .pel-search-input:focus { border-color:#4ade80; }
        .pel-search-input::placeholder { color:#555555; }
        .pel-select { appearance:none; padding:9px 30px 9px 12px; border:1px solid #333333; border-radius:10px; font-size:13.5px; background:#0a0a0a; color:#cccccc; outline:none; cursor:pointer; font-family:'Inter',sans-serif; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24' stroke='%23666666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 9px center; transition:border-color .15s; }
        .pel-select:focus { border-color:#4ade80; }

        /* Table */
        .pel-table-card { background:#0a0a0a; border:1px solid #222222; border-radius:16px; overflow:hidden; }
        .pel-table { width:100%; border-collapse:collapse; }
        .pel-table thead { background:#0d0d0d; }
        .pel-table thead th { padding:11px 18px; text-align:left; font-size:11.5px; font-weight:700; color:#4ade80; text-transform:uppercase; letter-spacing:.5px; border-bottom:1px solid #1a1a1a; white-space:nowrap; }
        .pel-table thead th:last-child { text-align:right; }
        .pel-table tbody tr { border-bottom:1px solid #111111; transition:background .1s; }
        .pel-table tbody tr:last-child { border-bottom:none; }
        .pel-table tbody tr:hover { background:#0d0d0d; }
        .pel-table td { padding:13px 18px; font-size:13.5px; color:#cccccc; vertical-align:middle; }
        .pel-table td:last-child { text-align:right; }
        .pel-user-cell { display:flex; align-items:center; gap:10px; }
        .pel-avatar { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; color:#fff; flex-shrink:0; }
        .pel-name { font-weight:600; color:#ffffff; font-size:13.5px; }
        .pel-email { font-size:12px; color:#666666; }
        .role-chip { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:11.5px; font-weight:600; border:1px solid; white-space:nowrap; }
        .pel-wa { color:#4ade80; font-size:13px; font-weight:500; }
        .pel-id { font-weight:700; color:#4ade80; font-size:12.5px; }
        .pel-date { font-size:12px; color:#666666; }
        .action-btn { border:none; background:none; cursor:pointer; padding:6px; border-radius:8px; transition:background .15s; display:inline-flex; }
        .btn-edit-role { color:#a78bfa; } .btn-edit-role:hover { background:#1a1030; }

        /* Skeleton */
        .pel-skeleton { height:52px; background:linear-gradient(90deg,#111111 25%,#1a1a1a 50%,#111111 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:8px; margin:4px 18px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        /* Empty */
        .pel-empty { text-align:center; padding:60px 20px; color:#666666; }
        .pel-empty-icon { font-size:48px; margin-bottom:12px; opacity:.5; }
        .pel-empty-text { font-size:14px; }

        /* ========= MODAL ========= */
        .modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.7); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn .15s ease; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .modal-box { background:#0d0d0d; border:1px solid #222222; border-radius:20px; width:100%; max-width:420px; box-shadow:0 20px 60px rgba(0,0,0,.6); animation:slideUp .2s ease; }
        @keyframes slideUp { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
        .modal-header { display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:1px solid #1a1a1a; border-radius:20px 20px 0 0; }
        .modal-title { font-size:15px; font-weight:800; color:#ffffff; }
        .modal-close { border:none; background:none; cursor:pointer; color:#666666; padding:6px; border-radius:8px; transition:background .15s; display:flex; }
        .modal-close:hover { background:#1a1a1a; color:#ffffff; }
        .modal-body { padding:20px 22px; display:flex; flex-direction:column; gap:14px; }

        .mf-label { display:block; font-size:12px; font-weight:600; color:#888888; text-transform:uppercase; letter-spacing:.5px; margin-bottom:8px; }
        .modal-current { background:#0d1f14; border:1px solid #1a3a20; border-radius:10px; padding:10px 14px; font-size:13px; color:#4ade80; display:flex; align-items:center; gap:8px; }
        .modal-err { background:#1a0505; border:1px solid #4a1a1a; color:#ff5555; padding:9px 13px; border-radius:10px; font-size:13px; }
        .modal-ok  { background:#0d1f14; border:1px solid #1a3a20; color:#4ade80; padding:9px 13px; border-radius:10px; font-size:13px; display:flex; align-items:center; gap:6px; }

        /* Role option cards */
        .role-options { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .role-option { border:2px solid #222222; border-radius:12px; padding:14px 12px; cursor:pointer; transition:all .15s; text-align:center; background:#111111; display:flex; flex-direction:column; align-items:center; gap:6px; }
        .role-option:hover { border-color:#4ade80; background:#0d1f14; }
        .role-option.selected-admin { border-color:#16a34a; background:#0d1f14; }
        .role-option.selected-customer { border-color:#0369a1; background:#0a1a2a; }
        .role-option-icon { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; }
        .role-option-label { font-size:13px; font-weight:700; color:#ffffff; }
        .role-option-sub { font-size:11px; color:#666666; }

        .modal-submit { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:12px; border:none; border-radius:10px; background:linear-gradient(135deg,#7c3aed,#6d28d9); color:#fff; font-size:14px; font-weight:600; cursor:pointer; transition:opacity .15s,transform .1s; font-family:'Inter',sans-serif; margin-top:4px; }
        .modal-submit:hover:not(:disabled) { opacity:.9; transform:translateY(-1px); }
        .modal-submit:disabled { opacity:.6; cursor:not-allowed; }
        .mspin { display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      <div className="pel-wrap">

        {/* Heading */}
        <div className="pel-heading">
          <div className="pel-title-group">
            <div className="pel-title-icon"><Users size={22} color="#16a34a" /></div>
            <div>
              <h1 className="pel-title">Data Pelanggan</h1>
              <p className="pel-count">{filtered.length} dari {users.length} pengguna ditampilkan</p>
            </div>
          </div>
          <button className="pel-refresh-btn" onClick={fetchUsers} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Error: 403 Forbidden */}
        {error?.status === 403 && (
          <div className="err-card err-card-403">
            <AlertTriangle size={20} color="#dc2626" className="err-icon" />
            <div className="err-403">
              <div className="err-title">Akses Ditolak (403 Forbidden)</div>
              <div className="err-body">
                Token login kamu tidak memiliki hak akses Admin. Ini terjadi karena kamu login <strong>sebelum</strong> backend diperbarui sehingga token lama tidak menyimpan field <code>role</code>.<br />
                Silakan <strong>logout dan login ulang</strong> untuk mendapatkan token baru.
              </div>
              <div className="err-actions">
                <button className="err-btn err-btn-red" onClick={handleLogoutRelogin}>
                  <LogOut size={13} /> Logout &amp; Login Ulang
                </button>
                <button className="err-btn err-btn-outline err-btn-outline-red" onClick={fetchUsers}>
                  <RefreshCw size={13} /> Coba Lagi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error: Network / Unknown */}
        {error && error.status !== 403 && (
          <div className="err-card err-card-0">
            <AlertTriangle size={20} color="#d97706" className="err-icon" />
            <div className="err-0">
              <div className="err-title">Gagal Memuat Data {error.status > 0 ? `(Error ${error.status})` : '(Network Error)'}</div>
              <div className="err-body">
                {error.status === 0
                  ? 'Tidak bisa terhubung ke server backend. Pastikan Go server sudah berjalan di port 3000.'
                  : error.message}
              </div>
              <div className="err-actions">
                <button className="err-btn err-btn-yellow" onClick={fetchUsers}>
                  <RefreshCw size={13} /> Coba Lagi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        {!error && (
          <div className="pel-stats">
            <div className="pel-stat">
              <div className="pel-stat-label">Total Pengguna</div>
              <div className="pel-stat-val">{loading ? '…' : users.length}</div>
            </div>
            <div className="pel-stat">
              <div className="pel-stat-label">Pelanggan</div>
              <div className="pel-stat-val">{loading ? '…' : users.filter((u) => u.role === 'CUSTOMER').length}</div>
            </div>
            <div className="pel-stat">
              <div className="pel-stat-label">Admin</div>
              <div className="pel-stat-val">{loading ? '…' : users.filter((u) => u.role === 'ADMIN').length}</div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="pel-toolbar">
          <div className="pel-search">
            <Search size={14} className="pel-search-icon" />
            <input
              type="text"
              className="pel-search-input"
              placeholder="Cari nama, email, WA..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="pel-select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="Semua">👥 Semua Role</option>
            <option value="CUSTOMER">Pelanggan</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        {/* Table */}
        <div className="pel-table-card">
          <table className="pel-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Pengguna</th>
                <th>No. WhatsApp</th>
                <th>Role</th>
                <th>Bergabung</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} style={{ padding: '6px 18px' }}><div className="pel-skeleton" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="pel-empty">
                      <div className="pel-empty-icon">👥</div>
                      <div className="pel-empty-text">
                        {error ? 'Gagal memuat data pengguna' : search ? `Tidak ada pengguna "${search}"` : 'Belum ada data pengguna'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const roleMeta = getRoleMeta(user.role);
                  return (
                    <tr key={user.ID}>
                      <td><span className="pel-id">#{user.ID}</span></td>
                      <td>
                        <div className="pel-user-cell">
                          <div className="pel-avatar" style={{ background: getAvatarColor(user.ID) }}>
                            {getInitial(user.name)}
                          </div>
                          <div>
                            <div className="pel-name">{user.name}</div>
                            <div className="pel-email">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="pel-wa">{user.whatsapp_number || '-'}</span></td>
                      <td>
                        <span className="role-chip" style={{ color: roleMeta.color, background: roleMeta.bg, borderColor: roleMeta.border }}>
                          {roleMeta.label}
                        </span>
                      </td>
                      <td><span className="pel-date">{formatDate(user.CreatedAt)}</span></td>
                      <td>
                        <button
                          className="action-btn btn-edit-role"
                          onClick={() => openRoleEdit(user)}
                          title="Ubah Role"
                        >
                          <Pencil size={15} />
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

      {/* ===== EDIT ROLE MODAL ===== */}
      {roleTarget && (
        <div className="modal-backdrop" onClick={() => !roleLoading && setRoleTarget(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">🛡️ Ubah Role Pengguna</span>
              <button className="modal-close" onClick={() => !roleLoading && setRoleTarget(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="modal-current">
                <div className="pel-avatar" style={{ background: getAvatarColor(roleTarget.ID), width: 28, height: 28, fontSize: 12, borderRadius: 8, minWidth: 28 }}>
                  {getInitial(roleTarget.name)}
                </div>
                <div>
                  <strong>{roleTarget.name}</strong>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{roleTarget.email}</div>
                </div>
              </div>

              {roleError   && <div className="modal-err">⚠️ {roleError}</div>}
              {roleSuccess && <div className="modal-ok"><Check size={14} /> Role berhasil diubah!</div>}

              <form onSubmit={handleRoleSave} style={{ display: 'contents' }}>
                <div>
                  <label className="mf-label">Pilih Role Baru</label>
                  <div className="role-options">
                    {/* CUSTOMER option */}
                    <div
                      className={`role-option ${roleValue === 'CUSTOMER' ? 'selected-customer' : ''}`}
                      onClick={() => setRoleValue('CUSTOMER')}
                    >
                      <div className="role-option-icon" style={{ background: roleValue === 'CUSTOMER' ? '#e0f2fe' : '#f3f4f6' }}>
                        <UserRound size={22} color={roleValue === 'CUSTOMER' ? '#0369a1' : '#9ca3af'} />
                      </div>
                      <div className="role-option-label" style={{ color: roleValue === 'CUSTOMER' ? '#0369a1' : '#374151' }}>Pelanggan</div>
                      <div className="role-option-sub">Akses belanja saja</div>
                    </div>
                    {/* ADMIN option */}
                    <div
                      className={`role-option ${roleValue === 'ADMIN' ? 'selected-admin' : ''}`}
                      onClick={() => setRoleValue('ADMIN')}
                    >
                      <div className="role-option-icon" style={{ background: roleValue === 'ADMIN' ? '#dcfce7' : '#f3f4f6' }}>
                        <ShieldCheck size={22} color={roleValue === 'ADMIN' ? '#15803d' : '#9ca3af'} />
                      </div>
                      <div className="role-option-label" style={{ color: roleValue === 'ADMIN' ? '#15803d' : '#374151' }}>Admin</div>
                      <div className="role-option-sub">Akses penuh dashboard</div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="modal-submit"
                  disabled={roleLoading || roleSuccess || roleValue === roleTarget.role}
                >
                  {roleLoading
                    ? <><span className="mspin" /> Menyimpan...</>
                    : roleSuccess
                    ? <><Check size={14} /> Tersimpan!</>
                    : roleValue === roleTarget.role
                    ? 'Tidak ada perubahan'
                    : 'Simpan Perubahan'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`.spin { animation: spin .7s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
