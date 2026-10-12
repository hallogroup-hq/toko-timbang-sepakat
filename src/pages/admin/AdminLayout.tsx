import React from 'react';
import {
  LayoutDashboard,
  Package,
  CircleDollarSign,
  FileSpreadsheet,
  Image as ImageIcon,
  MessageSquare,
  ShoppingBag,
  Settings,
  LogOut,
  ExternalLink
} from 'lucide-react';

interface Props {
  currentPath: string;
  adminUser: any;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<Props> = ({
  currentPath,
  adminUser,
  onNavigate,
  onLogout,
  children
}) => {
  const menuItems = [
    { label: 'Ringkasan', path: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Katalog Produk', path: '/admin/produk', icon: Package, exact: false },
    { label: 'Kelola Harga', path: '/admin/harga', icon: CircleDollarSign, exact: false },
    { label: 'Impor CSV', path: '/admin/import', icon: FileSpreadsheet, exact: false },
    { label: 'Antrean Foto', path: '/admin/foto', icon: ImageIcon, exact: false },
    { label: 'Permintaan WA', path: '/admin/permintaan', icon: MessageSquare, exact: false },
    { label: 'Pesanan Masuk', path: '/admin/pesanan', icon: ShoppingBag, exact: false },
    { label: 'Pengaturan Toko', path: '/admin/pengaturan', icon: Settings, exact: false }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-zinc-200/90 shrink-0 min-h-screen">
        <div className="p-4 border-b border-zinc-200/80 flex items-center justify-between">
          <div>
            <span className="font-bold text-sm text-zinc-900 block">Toko Timbang Sepakat</span>
            <span className="text-[11px] text-zinc-500 block">Admin Panel v1.0</span>
          </div>
          <button
            onClick={() => onNavigate('/')}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-md"
            title="Buka Toko Publik"
          >
            <ExternalLink size={15} />
          </button>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          {menuItems.map((item) => {
            const isActive = item.exact
              ? currentPath === item.path
              : currentPath.startsWith(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#BA3C07] text-white font-bold shadow-xs'
                    : 'text-zinc-600 hover:bg-orange-50/50 hover:text-zinc-900'
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.2 : 1.7} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-zinc-200/80">
          <div className="px-3 py-2 bg-zinc-50 rounded-xl mb-2">
            <span className="text-xs font-semibold text-zinc-900 block truncate">
              {adminUser?.displayName || 'Admin'}
            </span>
            <span className="text-[10px] text-zinc-500 block truncate">
              {adminUser?.email}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl text-xs font-medium transition-colors"
          >
            <LogOut size={15} />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* Top Nav for Mobile */}
      <header className="md:hidden bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div>
          <span className="font-bold text-sm text-zinc-900 block">Toko Timbang Sepakat</span>
          <span className="text-[10px] text-zinc-500 block">Admin Back Office</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('/')}
            className="px-2.5 py-1 text-xs text-zinc-600 bg-zinc-100 rounded-lg"
          >
            Toko
          </button>
          <button
            onClick={onLogout}
            className="p-1.5 text-zinc-500 hover:text-zinc-900"
            title="Keluar"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Mobile Horizontal Navigation Chips */}
      <div className="md:hidden bg-white border-b border-zinc-200 px-3 py-2 flex gap-1.5 overflow-x-auto no-scrollbar">
        {menuItems.map((item) => {
          const isActive = item.exact
            ? currentPath === item.path
            : currentPath.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-[#BA3C07] text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full">
        {children}
      </main>
    </div>
  );
};
