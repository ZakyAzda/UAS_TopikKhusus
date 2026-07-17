'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Tags, Plus, Trash2 } from 'lucide-react';

export default function KategoriPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState('');

  const fetchCategories = async () => {
    try {
      const res = await api.get('/product-categories');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/product-categories', { name });
      setName('');
      fetchCategories();
    } catch (err) {
      alert('Gagal nambah kategori! (Cek Token Admin lu lek)');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Yakin hapus?')) {
      try {
        await api.delete(`/admin/product-categories/${id}`);
        fetchCategories();
      } catch (err) {
        alert('Gagal hapus!');
      }
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .kat-wrap { font-family: 'Inter', sans-serif; }

        .kat-heading { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .kat-title-icon { width: 44px; height: 44px; background: #111111; border: 1px solid #333333; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .kat-title { font-size: 24px; font-weight: 800; color: #ffffff; margin: 0; letter-spacing: -0.4px; }
        .kat-count { font-size: 13px; color: #666666; margin: 2px 0 0; }

        /* Grid layout */
        .kat-grid { display: grid; grid-template-columns: 300px 1fr; gap: 20px; align-items: start; }
        @media (max-width: 768px) { .kat-grid { grid-template-columns: 1fr; } }

        /* Form card */
        .kat-form-card { background: #0a0a0a; border: 1px solid #222222; border-radius: 16px; overflow: hidden; }
        .kat-form-header { background: linear-gradient(135deg, #0d1f14, #14532d); padding: 16px 20px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #1a3a20; }
        .kat-form-header-title { font-size: 14px; font-weight: 700; color: white; }
        .kat-form-body { padding: 20px; }

        .kat-field-label { display: block; font-size: 12px; font-weight: 600; color: #888888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .kat-field-input { width: 100%; border: 1px solid #333333; border-radius: 10px; padding: 10px 14px; font-size: 14px; color: #ffffff; background: #111111; outline: none; transition: border-color 0.15s; margin-bottom: 14px; font-family: 'Inter', sans-serif; box-sizing: border-box; }
        .kat-field-input:focus { border-color: #4ade80; }
        .kat-field-input::placeholder { color: #555555; }

        .kat-tips { background: #0d1f14; border: 1px solid #1a3a20; border-radius: 8px; padding: 10px 12px; font-size: 12px; color: #4ade80; margin-bottom: 14px; display: flex; align-items: flex-start; gap: 6px; }

        .kat-submit-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(135deg, #16a34a, #15803d); color: white; border: none; border-radius: 10px; padding: 11px 16px; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.15s, transform 0.1s; font-family: 'Inter', sans-serif; }
        .kat-submit-btn:hover { opacity: 0.9; transform: translateY(-1px); }

        /* Table card */
        .kat-table-card { background: #0a0a0a; border: 1px solid #222222; border-radius: 16px; overflow: hidden; }
        .kat-table-header { padding: 14px 20px; border-bottom: 1px solid #1a1a1a; display: flex; align-items: center; justify-content: space-between; }
        .kat-table-title { font-size: 14px; font-weight: 700; color: #ffffff; }
        .kat-total-badge { background: #111111; color: #4ade80; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; border: 1px solid #222222; }

        .kat-table { width: 100%; border-collapse: collapse; }
        .kat-table thead { background: #0d0d0d; }
        .kat-table thead th { padding: 11px 20px; text-align: left; font-size: 12px; font-weight: 700; color: #4ade80; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #1a1a1a; }
        .kat-table thead th:last-child { text-align: right; }
        .kat-table tbody tr { border-bottom: 1px solid #111111; transition: background 0.1s; }
        .kat-table tbody tr:last-child { border-bottom: none; }
        .kat-table tbody tr:hover { background: #0d0d0d; }
        .kat-table td { padding: 14px 20px; font-size: 14px; vertical-align: middle; }
        .kat-table td:last-child { text-align: right; }

        .kat-id { font-size: 12px; color: #666666; font-weight: 500; }
        .kat-name-text { font-weight: 600; color: #ffffff; }
        .kat-icon-cell { font-size: 20px; }

        .kat-del-btn { border: none; background: none; cursor: pointer; color: #ff5555; padding: 7px; border-radius: 8px; transition: background 0.15s; display: inline-flex; }
        .kat-del-btn:hover { background: #2a0a0a; color: #ff3333; }

        /* Empty */
        .kat-empty { text-align: center; padding: 50px 20px; color: #666666; }
        .kat-empty-icon { font-size: 40px; margin-bottom: 10px; opacity: 0.5; }
        .kat-empty-text { font-size: 14px; }
      `}</style>

      <div className="kat-wrap">
        {/* Heading */}
        <div className="kat-heading">
          <div className="kat-title-icon">
            <Tags size={22} color="#16a34a" />
          </div>
          <div>
            <h1 className="kat-title">Kategori Produk</h1>
            <p className="kat-count">{categories.length} kategori terdaftar</p>
          </div>
        </div>

        <div className="kat-grid">
          {/* Form tambah */}
          <div className="kat-form-card">
            <div className="kat-form-header">
              <Plus size={16} color="white" />
              <span className="kat-form-header-title">Tambah Kategori Baru</span>
            </div>
            <div className="kat-form-body">
              <form onSubmit={handleAdd}>
                <label className="kat-field-label" htmlFor="kat-name">Nama Kategori</label>
                <input
                  id="kat-name"
                  type="text"
                  className="kat-field-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Sayuran Hijau"
                  required
                />
                <div className="kat-tips">
                  💡 Masukkan nama kategori sayuran yang spesifik agar mudah dicari pelanggan.
                </div>
                <button type="submit" className="kat-submit-btn">
                  <Plus size={15} /> Simpan Kategori
                </button>
              </form>
            </div>
          </div>

          {/* Table list */}
          <div className="kat-table-card">
            <div className="kat-table-header">
              <span className="kat-table-title">🏷️ Daftar Kategori</span>
              <span className="kat-total-badge">{categories.length} total</span>
            </div>
            <table className="kat-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}></th>
                  <th>ID</th>
                  <th>Nama Kategori</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.ID}>
                    <td className="kat-icon-cell">🥬</td>
                    <td><span className="kat-id">#{cat.ID}</span></td>
                    <td><span className="kat-name-text">{cat.name}</span></td>
                    <td>
                      <button
                        className="kat-del-btn"
                        onClick={() => handleDelete(cat.ID)}
                        title="Hapus kategori"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      <div className="kat-empty">
                        <div className="kat-empty-icon">🏷️</div>
                        <div className="kat-empty-text">Belum ada kategori, tambah dulu yuk!</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}