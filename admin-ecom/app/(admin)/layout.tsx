'use client';

import Sidebar from "@/components/Sidebar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [adminName, setAdminName] = useState("Admin SOD");
  const [adminInitial, setAdminInitial] = useState("A");
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // ── Auth Guard ──────────────────────────────────────────────────────────
    // Cek token & role di client-side sebelum render konten admin apapun.
    // Jika tidak ada token atau role bukan 'admin', langsung redirect ke login.
    const token = localStorage.getItem("admin_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const payloadStr = token.split(".")[1];
      const payload = JSON.parse(atob(payloadStr));

      // Cek expiry (exp field dalam detik Unix)
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        localStorage.removeItem("admin_token");
        router.replace("/login");
        return;
      }

      // Cek role
      if (String(payload.role).toLowerCase() !== "admin") {
        localStorage.removeItem("admin_token");
        router.replace("/login");
        return;
      }

      // Semua valid — set nama admin dari token
      if (payload.name) {
        setAdminName(payload.name);
        setAdminInitial(payload.name.charAt(0).toUpperCase());
      }

      setAuthorized(true);
    } catch (e) {
      // Token tidak bisa di-decode → hapus dan redirect
      console.error("Error decoding token:", e);
      localStorage.removeItem("admin_token");
      router.replace("/login");
    } finally {
      setAuthChecked(true);
    }
  }, [router]);

  // Tampilkan loading saat sedang mengecek auth — cegah konten protected muncul sekilas
  if (!authChecked || !authorized) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      }}>
        <div style={{
          width: '44px', height: '44px',
          border: '3px solid rgba(22,163,74,0.2)',
          borderTopColor: '#16a34a',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ color: '#4ade80', fontSize: '14px', fontWeight: 600 }}>
          Memverifikasi akses...
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#000000', color: '#ffffff', fontFamily: "'Inter', sans-serif" }}>
      {/* SIDEBAR DI KIRI */}
      <Sidebar />

      {/* AREA KONTEN UTAMA DI KANAN */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        {/* Top Header */}
        <header style={{
          height: '64px',
          background: '#0a0a0a',
          borderBottom: '1px solid #222222',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '8px', height: '8px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #16a34a, #4ade80)',
              boxShadow: '0 0 6px rgba(22,163,74,0.5)',
            }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>Panel Admin</span>
            <span style={{ fontSize: '14px', color: '#333333', margin: '0 4px' }}>·</span>
            <span style={{ fontSize: '14px', color: '#888888' }}>Sayur on Delivery</span>
          </div>
            <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#111111',
            border: '1px solid #333333',
            borderRadius: '20px',
            padding: '5px 12px 5px 6px',
          }}>
            <div style={{
              width: '28px', height: '28px',
              background: 'linear-gradient(135deg, #16a34a, #4ade80)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, color: '#000000',
            }}>{adminInitial}</div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>{adminName}</span>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ padding: '28px 32px', flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
}