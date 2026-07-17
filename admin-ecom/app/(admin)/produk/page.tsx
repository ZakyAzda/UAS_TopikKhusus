'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { Package, Plus, Trash2, Search, Pencil, X, Check, Upload, ImageIcon } from 'lucide-react';

type Product = {
  ID: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  categoryId: number;
  category?: { ID: number; name: string };
};

type Category = { ID: number; name: string };
type EditForm = { name: string; description: string; price: string; stock: string; image: string };

// ==========================================
// Komponen Drag-and-Drop Image Uploader
// ==========================================
function ImageUploader({
  onUploaded,
  currentUrl = '',
}: {
  onUploaded: (url: string) => void;
  currentUrl?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');

  useEffect(() => { setPreview(currentUrl); }, [currentUrl]);

  const doUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadErr('File harus berupa gambar (jpg, png, webp).');
      return;
    }
    setUploading(true);
    setUploadErr('');
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await api.post('/admin/products/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data.image_url;
      setPreview(url);
      onUploaded(url);
    } catch (e: any) {
      setUploadErr(e?.response?.data?.error || 'Gagal upload gambar.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) doUpload(file);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
    e.target.value = '';
  };

  return (
    <div>
      <div
        className={`img-drop-zone ${dragging ? 'img-drop-drag' : ''} ${preview ? 'img-drop-has' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {uploading ? (
          <div className="img-drop-inner">
            <div className="img-spinner" />
            <span className="img-drop-hint">Mengupload gambar...</span>
          </div>
        ) : preview ? (
          <div className="img-drop-preview-wrap">
            <img src={preview} alt="preview" className="img-drop-preview" />
            <div className="img-drop-overlay">
              <Upload size={20} color="white" />
              <span style={{ color: 'white', fontSize: '12px', fontWeight: 600 }}>Ganti Gambar</span>
            </div>
          </div>
        ) : (
          <div className="img-drop-inner">
            <div className="img-drop-icon-wrap">
              <ImageIcon size={28} color="#16a34a" />
            </div>
            <span className="img-drop-title">Drag & drop gambar di sini</span>
            <span className="img-drop-hint">atau <u>klik untuk pilih file</u></span>
            <span className="img-drop-types">JPG, PNG, WEBP — maks 5MB</span>
          </div>
        )}
      </div>
      {uploadErr && (
        <div className="img-upload-err">⚠️ {uploadErr}</div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  );
}

// ==========================================
// Halaman Utama
// ==========================================
export default function ProdukPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: '', description: '', price: '', stock: '', image: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', description: '', price: '', stock: '', imageUrl: '', categoryId: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (filterCategory) params.categoryId = filterCategory;
      const res = await api.get('/products', { params });
      setProducts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, filterCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/product-categories');
      setCategories(res.data || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => {
    const t = setTimeout(() => fetchProducts(), 350);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin mau ditarik dari etalase?')) return;
    try {
      await api.delete(`/admin/products/${id}`);
      fetchProducts();
    } catch { alert('Gagal hapus produk!'); }
  };

  const openEdit = (prod: Product) => {
    setEditTarget(prod);
    setEditForm({ name: prod.name, description: prod.description || '', price: String(prod.price), stock: String(prod.stock), image: prod.imageUrl || '' });
    setEditError('');
    setEditSuccess(false);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditLoading(true);
    setEditError('');
    try {
      await api.put(`/admin/products/${editTarget.ID}`, {
        name: editForm.name,
        description: editForm.description,
        price: parseInt(editForm.price),
        stock: parseInt(editForm.stock),
        image: editForm.image,
      });
      setEditSuccess(true);
      fetchProducts();
      setTimeout(() => { setEditTarget(null); setEditSuccess(false); }, 1200);
    } catch {
      setEditError('Gagal update produk! Cek koneksi atau token Admin.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      await api.post('/admin/products', {
        name: addForm.name,
        description: addForm.description,
        price: parseInt(addForm.price),
        stock: parseInt(addForm.stock),
        imageUrl: addForm.imageUrl,
        categoryId: parseInt(addForm.categoryId),
      });
      setShowAdd(false);
      setAddForm({ name: '', description: '', price: '', stock: '', imageUrl: '', categoryId: '' });
      fetchProducts();
    } catch {
      setAddError('Gagal tambah produk! Cek token Admin.');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .prod-wrap { font-family: 'Inter', sans-serif; }

        /* Heading */
        .prod-heading { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
        .prod-title-group { display:flex; align-items:center; gap:12px; }
        .prod-title-icon { width:44px; height:44px; background:#111111; border:1px solid #333333; border-radius:12px; display:flex; align-items:center; justify-content:center; }
        .prod-title { font-size:24px; font-weight:800; color:#ffffff; margin:0; letter-spacing:-0.4px; }
        .prod-count { font-size:13px; color:#666666; margin:2px 0 0; }
        .prod-add-btn { display:flex; align-items:center; gap:8px; background:linear-gradient(135deg,#16a34a,#15803d); color:#fff; border:none; padding:10px 18px; border-radius:10px; font-size:14px; font-weight:600; cursor:pointer; transition:opacity .15s,transform .1s; font-family:'Inter',sans-serif; }
        .prod-add-btn:hover { opacity:.9; transform:translateY(-1px); }

        /* Toolbar */
        .prod-toolbar { display:flex; align-items:center; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
        .prod-search { position:relative; flex:1; min-width:180px; max-width:280px; }
        .prod-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#666666; pointer-events:none; }
        .prod-search-input { width:100%; padding:9px 12px 9px 36px; border:1px solid #333333; border-radius:10px; font-size:13.5px; background:#0a0a0a; color:#ffffff; outline:none; transition:border-color .15s; font-family:'Inter',sans-serif; box-sizing:border-box; }
        .prod-search-input:focus { border-color:#4ade80; }
        .prod-search-input::placeholder { color:#555555; }
        .prod-filter-select { appearance:none; padding:9px 30px 9px 12px; border:1px solid #333333; border-radius:10px; font-size:13.5px; background:#0a0a0a; color:#cccccc; outline:none; cursor:pointer; font-family:'Inter',sans-serif; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24' stroke='%23666666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 9px center; transition:border-color .15s; }
        .prod-filter-select:focus { border-color:#4ade80; }

        /* Table */
        .prod-table-card { background:#0a0a0a; border:1px solid #222222; border-radius:16px; overflow:hidden; }
        .prod-table { width:100%; border-collapse:collapse; }
        .prod-table thead { background:#0d0d0d; }
        .prod-table thead th { padding:11px 18px; text-align:left; font-size:11.5px; font-weight:700; color:#4ade80; text-transform:uppercase; letter-spacing:.5px; border-bottom:1px solid #1a1a1a; white-space:nowrap; }
        .prod-table thead th:last-child { text-align:right; }
        .prod-table tbody tr { border-bottom:1px solid #111111; transition:background .1s; }
        .prod-table tbody tr:last-child { border-bottom:none; }
        .prod-table tbody tr:hover { background:#0d0d0d; }
        .prod-table td { padding:13px 18px; font-size:13.5px; color:#cccccc; vertical-align:middle; }
        .prod-table td:last-child { text-align:right; }
        .prod-img { width:42px; height:42px; border-radius:8px; object-fit:cover; border:1px solid #222222; }
        .prod-img-ph { width:42px; height:42px; border-radius:8px; background:#111111; border:1px solid #222222; display:flex; align-items:center; justify-content:center; font-size:20px; }
        .prod-info { display:flex; align-items:center; gap:10px; }
        .prod-name { font-weight:600; color:#ffffff; }
        .prod-desc { font-size:11.5px; color:#666666; margin-top:2px; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .cat-badge { background:#0d1f14; color:#4ade80; font-size:11px; font-weight:600; padding:3px 10px; border-radius:20px; border:1px solid #1a3a20; white-space:nowrap; }
        .price-text { font-weight:700; color:#4ade80; }
        .stock-low { color:#ff5555; font-weight:600; }
        .stock-ok { color:#4ade80; font-weight:600; }
        .action-btn { border:none; background:none; cursor:pointer; padding:6px; border-radius:8px; transition:background .15s; display:inline-flex; }
        .btn-edit { color:#38bdf8; } .btn-edit:hover { background:#0a1a2a; }
        .btn-del  { color:#ff5555; } .btn-del:hover  { background:#2a0a0a; }

        /* Skeleton */
        .prod-skeleton { height:52px; background:linear-gradient(90deg,#111111 25%,#1a1a1a 50%,#111111 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:8px; margin:4px 18px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .prod-empty { text-align:center; padding:60px 20px; color:#666666; }
        .prod-empty-icon { font-size:48px; margin-bottom:12px; opacity:.5; }

        /* ========= IMAGE UPLOADER ========= */
        .img-drop-zone { border: 2px dashed #333333; border-radius: 12px; background: #0d0d0d; cursor: pointer; transition: border-color .2s, background .2s; overflow: hidden; min-height: 130px; display: flex; align-items: center; justify-content: center; }
        .img-drop-zone:hover { border-color: #4ade80; background: #0d1a0d; }
        .img-drop-drag { border-color: #4ade80 !important; background: #0d1a0d !important; }
        .img-drop-inner { display:flex; flex-direction:column; align-items:center; gap:6px; padding:20px; text-align:center; }
        .img-drop-icon-wrap { width:52px; height:52px; border-radius:14px; background:#111111; border:1px solid #333333; display:flex; align-items:center; justify-content:center; margin-bottom:4px; }
        .img-drop-title { font-size:14px; font-weight:600; color:#4ade80; }
        .img-drop-hint { font-size:12.5px; color:#666666; }
        .img-drop-types { font-size:11px; color:#555555; margin-top:2px; }
        .img-spinner { width:24px; height:24px; border:3px solid #333333; border-top-color:#4ade80; border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg)} }

        .img-drop-preview-wrap { position:relative; width:100%; }
        .img-drop-preview { width:100%; height:150px; object-fit:cover; display:block; }
        .img-drop-overlay { position:absolute; inset:0; background:rgba(0,0,0,.5); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; opacity:0; transition:opacity .2s; }
        .img-drop-zone:hover .img-drop-overlay { opacity:1; }
        .img-upload-err { margin-top:6px; font-size:12.5px; color:#ff5555; background:#1a0505; border:1px solid #4a1a1a; border-radius:8px; padding:6px 10px; }

        /* ========= MODAL ========= */
        .modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.7); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn .15s ease; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .modal-box { background:#0d0d0d; border:1px solid #222222; border-radius:20px; width:100%; max-width:500px; max-height:92vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.6); animation:slideUp .2s ease; }
        @keyframes slideUp { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
        .modal-header { display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:1px solid #1a1a1a; position:sticky; top:0; background:#0d0d0d; border-radius:20px 20px 0 0; z-index:1; }
        .modal-title { font-size:15px; font-weight:800; color:#ffffff; }
        .modal-close { border:none; background:none; cursor:pointer; color:#666666; padding:6px; border-radius:8px; transition:background .15s; display:flex; }
        .modal-close:hover { background:#1a1a1a; color:#ffffff; }
        .modal-body { padding:20px 22px; display:flex; flex-direction:column; gap:14px; }

        .mf-label { display:block; font-size:12px; font-weight:600; color:#888888; text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px; }
        .mf-input { width:100%; padding:10px 14px; border:1px solid #333333; border-radius:10px; font-size:14px; color:#ffffff; background:#111111; outline:none; transition:border-color .15s; font-family:'Inter',sans-serif; box-sizing:border-box; }
        .mf-input:focus { border-color:#4ade80; }
        .mf-input::placeholder { color:#555555; }
        .mf-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

        .modal-current { background:#0d1f14; border:1px solid #1a3a20; border-radius:10px; padding:9px 13px; font-size:12.5px; color:#4ade80; display:flex; align-items:center; gap:6px; }
        .modal-err { background:#1a0505; border:1px solid #4a1a1a; color:#ff5555; padding:9px 13px; border-radius:10px; font-size:13px; }
        .modal-ok  { background:#0d1f14; border:1px solid #1a3a20; color:#4ade80; padding:9px 13px; border-radius:10px; font-size:13px; display:flex; align-items:center; gap:6px; }

        .modal-submit { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:12px; border:none; border-radius:10px; background:linear-gradient(135deg,#16a34a,#15803d); color:#fff; font-size:14px; font-weight:600; cursor:pointer; transition:opacity .15s,transform .1s; font-family:'Inter',sans-serif; margin-top:4px; }
        .modal-submit:hover:not(:disabled) { opacity:.9; transform:translateY(-1px); }
        .modal-submit:disabled { opacity:.6; cursor:not-allowed; }
        .mspin { display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }
      `}</style>

      <div className="prod-wrap">

        {/* Heading */}
        <div className="prod-heading">
          <div className="prod-title-group">
            <div className="prod-title-icon"><Package size={22} color="#16a34a" /></div>
            <div>
              <h1 className="prod-title">Manajemen Produk</h1>
              <p className="prod-count">{products.length} produk ditemukan</p>
            </div>
          </div>
          <button className="prod-add-btn" onClick={() => { setShowAdd(true); setAddError(''); setAddForm({ name:'', description:'', price:'', stock:'', imageUrl:'', categoryId:'' }); }}>
            <Plus size={16} /> Tambah Produk
          </button>
        </div>

        {/* Toolbar */}
        <div className="prod-toolbar">
          <div className="prod-search">
            <Search size={14} className="prod-search-icon" />
            <input type="text" className="prod-search-input" placeholder="Cari nama produk..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="prod-filter-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">🥬 Semua Kategori</option>
            {categories.map((cat) => <option key={cat.ID} value={String(cat.ID)}>{cat.name}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="prod-table-card">
          <table className="prod-table">
            <thead>
              <tr>
                <th>Produk</th>
                <th>Kategori</th>
                <th>Harga</th>
                <th>Stok</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} style={{ padding: '6px 18px' }}><div className="prod-skeleton" /></td></tr>
                ))
              ) : products.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className="prod-empty">
                    <div className="prod-empty-icon">🥬</div>
                    <div>{search || filterCategory ? 'Tidak ada produk yang cocok dengan filter' : 'Belum ada produk di etalase'}</div>
                  </div>
                </td></tr>
              ) : (
                products.map((prod) => (
                  <tr key={prod.ID}>
                    <td>
                      <div className="prod-info">
                        {prod.imageUrl
                          ? <img src={prod.imageUrl} alt={prod.name} className="prod-img" />
                          : <div className="prod-img-ph">🥦</div>}
                        <div>
                          <div className="prod-name">{prod.name}</div>
                          {prod.description && <div className="prod-desc">{prod.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td><span className="cat-badge">{prod.category?.name || '-'}</span></td>
                    <td><span className="price-text">Rp {prod.price.toLocaleString('id-ID')}</span></td>
                    <td><span className={prod.stock <= 5 ? 'stock-low' : 'stock-ok'}>{prod.stock}{prod.stock <= 5 ? ' ⚠️' : ''}</span></td>
                    <td>
                      <button className="action-btn btn-edit" onClick={() => openEdit(prod)} title="Edit"><Pencil size={15} /></button>
                      <button className="action-btn btn-del"  onClick={() => handleDelete(prod.ID)} title="Hapus"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== EDIT MODAL ===== */}
      {editTarget && (
        <div className="modal-backdrop" onClick={() => !editLoading && setEditTarget(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">✏️ Edit Produk</span>
              <button className="modal-close" onClick={() => !editLoading && setEditTarget(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="modal-current">🥦 Mengedit: <strong>{editTarget.name}</strong> (ID #{editTarget.ID})</div>
              {editError   && <div className="modal-err">⚠️ {editError}</div>}
              {editSuccess && <div className="modal-ok"><Check size={14} /> Produk berhasil diupdate!</div>}
              <form onSubmit={handleEditSave} style={{ display:'contents' }}>
                <div>
                  <label className="mf-label" htmlFor="e-name">Nama Produk</label>
                  <input id="e-name" type="text" className="mf-input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Bayam, Wortel..." required />
                </div>
                <div>
                  <label className="mf-label" htmlFor="e-desc">Deskripsi</label>
                  <textarea id="e-desc" className="mf-input" rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Segar langsung dari petani..." style={{ resize: 'vertical', minHeight: '80px' }} />
                </div>
                <div className="mf-row">
                  <div>
                    <label className="mf-label" htmlFor="e-price">Harga (Rp)</label>
                    <input id="e-price" type="number" className="mf-input" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} placeholder="5000" min={0} required />
                  </div>
                  <div>
                    <label className="mf-label" htmlFor="e-stock">Stok</label>
                    <input id="e-stock" type="number" className="mf-input" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} placeholder="100" min={0} required />
                  </div>
                </div>
                <div>
                  <label className="mf-label">Ganti Foto Produk (opsional)</label>
                  <ImageUploader
                    currentUrl={editForm.image}
                    onUploaded={(url) => setEditForm({ ...editForm, image: url })}
                  />
                </div>
                <button type="submit" className="modal-submit" disabled={editLoading || editSuccess}>
                  {editLoading ? <><span className="mspin" /> Menyimpan...</> : editSuccess ? <><Check size={14} /> Tersimpan!</> : 'Simpan Perubahan'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD MODAL ===== */}
      {showAdd && (
        <div className="modal-backdrop" onClick={() => !addLoading && setShowAdd(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">🌱 Tambah Produk Baru</span>
              <button className="modal-close" onClick={() => !addLoading && setShowAdd(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {addError && <div className="modal-err">⚠️ {addError}</div>}
              <form onSubmit={handleAdd} style={{ display:'contents' }}>
                <div>
                  <label className="mf-label" htmlFor="a-name">Nama Produk</label>
                  <input id="a-name" type="text" className="mf-input" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Bayam, Wortel, Kangkung..." required />
                </div>
                <div>
                  <label className="mf-label" htmlFor="a-desc">Deskripsi</label>
                  <input id="a-desc" type="text" className="mf-input" value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} placeholder="Segar langsung dari petani..." />
                </div>
                <div className="mf-row">
                  <div>
                    <label className="mf-label" htmlFor="a-price">Harga (Rp)</label>
                    <input id="a-price" type="number" className="mf-input" value={addForm.price} onChange={(e) => setAddForm({ ...addForm, price: e.target.value })} placeholder="5000" min={0} required />
                  </div>
                  <div>
                    <label className="mf-label" htmlFor="a-stock">Stok</label>
                    <input id="a-stock" type="number" className="mf-input" value={addForm.stock} onChange={(e) => setAddForm({ ...addForm, stock: e.target.value })} placeholder="100" min={0} required />
                  </div>
                </div>
                <div>
                  <label className="mf-label" htmlFor="a-cat">Kategori</label>
                  <select id="a-cat" className="mf-input" style={{ appearance:'none', backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center', paddingRight:'32px' }} value={addForm.categoryId} onChange={(e) => setAddForm({ ...addForm, categoryId: e.target.value })} required>
                    <option value="">-- Pilih Kategori --</option>
                    {categories.map((cat) => <option key={cat.ID} value={String(cat.ID)}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mf-label">Foto Produk</label>
                  <ImageUploader
                    currentUrl={addForm.imageUrl}
                    onUploaded={(url) => setAddForm({ ...addForm, imageUrl: url })}
                  />
                </div>
                <button type="submit" className="modal-submit" disabled={addLoading}>
                  {addLoading ? <><span className="mspin" /> Menambahkan...</> : <><Plus size={14} /> Tambah Produk</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}