import React, { useEffect, useState } from 'react';
import { Check, X, ExternalLink } from 'lucide-react';
import { useToast } from '../../components/Toast.tsx';

export const AdminImagesPage: React.FC = () => {
  const { showToast } = useToast();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  const loadCandidates = () => {
    setLoading(true);
    let url = '/api/admin/images/candidates';
    if (statusFilter) url += `?status=${statusFilter}`;
    fetch(url)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setCandidates(res.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCandidates();
  }, [statusFilter]);

  const handleReview = async (id: string, reviewStatus: 'approved' | 'rejected') => {
    const note = prompt(
      reviewStatus === 'approved'
        ? 'Catatan persetujuan (hak lisensi/varian terverifikasi):'
        : 'Alasan penolakan kandidat foto:'
    );
    if (note === null) return;

    try {
      const res = await fetch(`/api/admin/images/candidates/${id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_status: reviewStatus, reviewer_note: note })
      });
      if (res.ok) {
        showToast(`Kandidat berhasil di-${reviewStatus}.`);
        loadCandidates();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">
          Antrean Review Foto Produk
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Tinjau kandidat foto resmi sebelum dipublikasikan. Foto tanpa bukti hak cipta atau varian tidak cocok wajib ditolak.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              statusFilter === st
                ? 'bg-[#BA3C07] text-white shadow-2xs'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {st === 'pending' ? 'Perlu Review' : st === 'approved' ? 'Disetujui' : 'Ditolak'}
          </button>
        ))}
      </div>

      {/* Candidates List */}
      <div className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-100 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="text-center py-8 text-xs text-zinc-400">Memuat antrean foto...</div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-400">
            Tidak ada kandidat foto pada status ini.
          </div>
        ) : (
          candidates.map((c) => (
            <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-zinc-400 font-medium">
                    {c.source_key}
                  </span>
                  <span className="font-bold text-zinc-900">{c.product_name}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <span>Hak: {c.rights_status}</span>
                  <span>•</span>
                  <span>Kecocokan: {c.identity_status}</span>
                </div>
                <a
                  href={c.source_page_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#BA3C07] hover:underline font-medium"
                >
                  <span className="truncate max-w-xs">{c.source_page_url}</span>
                  <ExternalLink size={11} />
                </a>
              </div>

              {c.review_status === 'pending' && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleReview(c.id, 'rejected')}
                    className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <X size={13} />
                    <span>Tolak</span>
                  </button>
                  <button
                    onClick={() => handleReview(c.id, 'approved')}
                    className="px-3.5 py-1.5 bg-[#BA3C07] hover:bg-[#9E3205] text-white font-semibold rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
                  >
                    <Check size={13} />
                    <span>Setujui</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
