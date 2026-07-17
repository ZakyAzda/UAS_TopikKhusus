'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Tags, Package, ShoppingCart, Users, LogOut, Leaf } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [adminName, setAdminName] = useState("Admin SOD");
  const [adminInitial, setAdminInitial] = useState("A");

  useEffect(() => {
    try {
      const token = localStorage.getItem("admin_token");
      if (token) {
        const payloadStr = token.split(".")[1];
        const payload = JSON.parse(atob(payloadStr));
        if (payload.name) {
          setAdminName(payload.name);
          setAdminInitial(payload.name.charAt(0).toUpperCase());
        }
      }
    } catch (e) {
      console.error("Error decoding token:", e);
    }
  }, []);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Kategori', icon: Tags, path: '/kategori' },
    { name: 'Produk', icon: Package, path: '/produk' },
    { name: 'Pesanan', icon: ShoppingCart, path: '/pesanan' },
    { name: 'Pelanggan', icon: Users, path: '/pelanggan' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    router.push('/login');
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .sod-sidebar {
          width: 252px;
          min-height: 100vh;
          background: #0a0a0a;
          border-right: 1px solid #222222;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          font-family: 'Inter', sans-serif;
        }

        /* Logo */
        .sod-logo {
          padding: 24px 20px 20px;
          border-bottom: 1px solid #222222;
        }
        .sod-logo-inner {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sod-logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #16a34a, #4ade80);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(22,163,74,0.35);
          flex-shrink: 0;
        }
        .sod-logo-text {
          line-height: 1;
        }
        .sod-logo-name {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.5px;
        }
        .sod-logo-tagline {
          font-size: 10px;
          color: #888888;
          font-weight: 500;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        /* Nav */
        .sod-nav {
          flex: 1;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sod-nav-section-label {
          font-size: 10px;
          font-weight: 600;
          color: #666666;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 8px 8px 4px;
          margin-top: 4px;
        }

        .sod-nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          color: #888888;
          transition: background 0.15s, color 0.15s, transform 0.1s;
          position: relative;
        }
        .sod-nav-link:hover {
          background: #111111;
          color: #ffffff;
        }
        .sod-nav-link.active {
          background: #1a1a1a;
          color: #ffffff;
          font-weight: 600;
        }
        .sod-nav-link.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 25%;
          bottom: 25%;
          width: 3px;
          background: linear-gradient(to bottom, #16a34a, #4ade80);
          border-radius: 0 4px 4px 0;
        }
        .sod-nav-link-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }

        /* Footer */
        .sod-footer {
          padding: 12px 12px 16px;
          border-top: 1px solid #222222;
        }
        .sod-user-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          background: #111111;
          margin-bottom: 8px;
        }
        .sod-avatar {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #16a34a, #4ade80);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }
        .sod-user-name {
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
        }
        .sod-user-role {
          font-size: 11px;
          color: #888888;
        }
        .sod-logout-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 9px 12px;
          border-radius: 10px;
          border: none;
          background: none;
          font-size: 13.5px;
          font-weight: 500;
          color: #ff5555;
          cursor: pointer;
          transition: background 0.15s;
          font-family: 'Inter', sans-serif;
        }
        .sod-logout-btn:hover { background: #220000; }
      `}</style>

      <aside className="sod-sidebar">
        {/* Logo */}
        <div className="sod-logo">
          <div className="sod-logo-inner">
            <div className="sod-logo-icon">
              <Leaf size={20} color="white" />
            </div>
            <div className="sod-logo-text">
              <div className="sod-logo-name">SOD</div>
              <div className="sod-logo-tagline">Sayur on Delivery</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sod-nav">
          <div className="sod-nav-section-label">Menu Utama</div>
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`sod-nav-link ${isActive ? 'active' : ''}`}
              >
                <item.icon className="sod-nav-link-icon" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sod-footer">
          <div className="sod-user-card">
            <div className="sod-avatar">{adminInitial}</div>
            <div>
              <div className="sod-user-name">{adminName}</div>
              <div className="sod-user-role">Admin</div>
            </div>
          </div>
          <button className="sod-logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            Keluar
          </button>
        </div>
      </aside>
    </>
  );
}