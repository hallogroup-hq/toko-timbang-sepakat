export function formatRupiah(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return 'Rp0';
  return 'Rp' + amount.toLocaleString('id-ID');
}
