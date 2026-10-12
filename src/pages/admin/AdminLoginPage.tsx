import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle } from 'lucide-react';

interface Props {
  onLoginSuccess: (user: any) => void;
  onNavigateHome: () => void;
}

export const AdminLoginPage: React.FC<Props> = ({ onLoginSuccess, onNavigateHome }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login gagal.');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-sm w-full bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mx-auto text-zinc-900 border border-zinc-200/80">
            <Lock size={20} />
          </div>
          <h1 className="text-lg font-bold text-zinc-900">Masuk Panel Admin</h1>
          <p className="text-xs text-zinc-500">
            Toko Timbang Sepakat Back Office
          </p>
        </div>

        {error && (
          <div className="p-3 bg-zinc-100 border border-zinc-300 rounded-xl flex items-center gap-2 text-xs text-zinc-800">
            <AlertCircle size={15} className="shrink-0 text-zinc-700" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700">Email Staf/Owner</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@tokotimbangsepakat.com"
              className="w-full mt-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-[#BA3C07] focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700">Kata Sandi</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full mt-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-[#BA3C07] focus:bg-white transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#BA3C07] hover:bg-[#9E3205] text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-2xs active:scale-98"
          >
            <span>{loading ? 'Memproses...' : 'Masuk Dashboard'}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        <div className="pt-2 border-t border-zinc-100 text-center">
          <button
            onClick={onNavigateHome}
            className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            Kembali ke Toko Publik
          </button>
        </div>
      </div>
    </div>
  );
};
