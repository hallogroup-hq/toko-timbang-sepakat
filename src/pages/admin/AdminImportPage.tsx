import React, { useEffect, useState } from 'react';
import { UploadCloud, Check, ArrowRight } from 'lucide-react';
import { useToast } from '../../components/Toast.tsx';

export const AdminImportPage: React.FC = () => {
  const { showToast } = useToast();
  const [csvText, setCsvText] = useState('');
  const [filename, setFilename] = useState('');
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [committing, setCommitting] = useState(false);

  const loadBatches = () => {
    fetch('/api/admin/import/batches')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setBatches(res.data);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(String(event.target?.result || ''));
    };
    reader.readAsText(file);
  };

  const handlePreview = async () => {
    if (!csvText.trim()) {
      showToast('Masukkan konten atau unggah file CSV terlebih dahulu.', 'error');
      return;
    }

    setLoadingPreview(true);
    try {
      const res = await fetch('/api/admin/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: filename || 'manual_import.csv',
          csv_content: csvText
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses pratinjau impor.');

      setPreviewResult(data);
      showToast('Pratinjau impor berhasil disiapkan.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCommit = async () => {
    if (!previewResult?.batch_id) return;
    setCommitting(true);

    try {
      const res = await fetch(`/api/admin/import/commit/${previewResult.batch_id}`, {
        method: 'POST'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengomit impor.');

      showToast(`Impor berhasil dikomit: ${data.committed_updates} perubahan diterapkan.`);
      setPreviewResult(null);
      setCsvText('');
      setFilename('');
      loadBatches();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">
          Impor Katalog & Pembaruan Harga Massal
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Unggah file CSV daftar harga baru. Sistem akan menampilkan perbandingan diff sebelum diterapkan secara permanen.
        </p>
      </div>

      {/* Upload & Input Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-2xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
          Langkah 1: Unggah atau Tempel Data CSV
        </h2>

        <div className="space-y-3">
          <label className="border-2 border-dashed border-zinc-200 hover:border-zinc-400 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer bg-zinc-50/50 transition-colors">
            <UploadCloud size={28} className="text-zinc-400 mb-1" />
            <span className="text-xs font-semibold text-zinc-800">
              {filename ? filename : 'Pilih file CSV dari komputer'}
            </span>
            <span className="text-[11px] text-zinc-400 mt-0.5">
              Format UTF-8 standar dengan kolom source_key, harga_karton_pack_idr, harga_pcs_idr
            </span>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Atau Tempel Teks CSV:
            </label>
            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="source_key,nama_produk_asli,harga_karton_pack_idr,harga_pcs_idr..."
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono outline-none focus:border-zinc-900 focus:bg-white transition-colors"
            />
          </div>

          <button
            onClick={handlePreview}
            disabled={loadingPreview || !csvText.trim()}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs rounded-xl transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            <span>{loadingPreview ? 'Menganalisis diff...' : 'Proses Pratinjau Diff'}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Diff Result Card */}
      {previewResult && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                Langkah 2: Pratinjau Perubahan (Diff)
              </h2>
              <span className="text-xs text-zinc-500">
                Batch ID: {previewResult.batch_id}
              </span>
            </div>

            <button
              onClick={handleCommit}
              disabled={committing}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs rounded-xl transition-colors disabled:opacity-40 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Check size={14} />
              <span>{committing ? 'Menerapkan...' : 'Konfirmasi & Komit Perubahan'}</span>
            </button>
          </div>

          {/* Metric Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-zinc-400 block text-[10px]">Total Baris</span>
              <span className="text-base font-bold text-zinc-900">
                {previewResult.summary.total_rows}
              </span>
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-zinc-400 block text-[10px]">Harga Berubah</span>
              <span className="text-base font-bold text-zinc-900">
                {previewResult.summary.update}
              </span>
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-zinc-400 block text-[10px]">Produk Baru</span>
              <span className="text-base font-bold text-zinc-900">
                {previewResult.summary.create}
              </span>
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-zinc-400 block text-[10px]">Tidak Berubah</span>
              <span className="text-base font-bold text-zinc-900">
                {previewResult.summary.unchanged}
              </span>
            </div>
          </div>

          {/* Sample Rows Table */}
          <div className="overflow-x-auto max-h-64 border border-zinc-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider font-semibold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Baris</th>
                  <th className="py-2.5 px-3">Kode</th>
                  <th className="py-2.5 px-3">Tindakan</th>
                  <th className="py-2.5 px-3">Nilai Sebelumnya</th>
                  <th className="py-2.5 px-3">Nilai Baru</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                {previewResult.sample_rows.map((row: any) => (
                  <tr key={row.row_number} className="hover:bg-zinc-50/60">
                    <td className="py-2 px-3 text-zinc-400">{row.row_number}</td>
                    <td className="py-2 px-3 text-zinc-700 font-bold">{row.source_key || '-'}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 bg-zinc-100 text-zinc-800 rounded font-sans text-[10px] font-semibold">
                        {row.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-zinc-500">
                      {row.before ? JSON.stringify(row.before) : '-'}
                    </td>
                    <td className="py-2 px-3 text-zinc-900 font-bold">
                      {row.after ? JSON.stringify(row.after) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History of Batches */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-3 shadow-2xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
          Riwayat Batch Impor
        </h2>
        <div className="divide-y divide-zinc-100 text-xs">
          {batches.length === 0 ? (
            <p className="text-zinc-400 py-3 text-center">Belum ada riwayat batch impor.</p>
          ) : (
            batches.map((b) => (
              <div key={b.id} className="py-2.5 flex items-center justify-between gap-3">
                <div>
                  <span className="font-semibold text-zinc-900 block">{b.source_filename}</span>
                  <span className="text-[11px] text-zinc-400">
                    {new Date(b.created_at).toLocaleString('id-ID')} • {b.row_count} baris
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded text-[11px] font-medium">
                  Status: {b.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
