import React from 'react';
import { Milk, Wine, Coffee, GlassWater, Package, UtensilsCrossed, Tag } from 'lucide-react';

interface Props {
  categoryId?: string | null;
  className?: string;
  size?: number;
}

export const ProductPlaceholder: React.FC<Props> = ({ categoryId, className = 'w-full h-full', size = 28 }) => {
  let Icon = Tag;

  if (categoryId?.includes('dairy')) {
    Icon = Milk;
  } else if (categoryId?.includes('syrup')) {
    Icon = Wine;
  } else if (categoryId?.includes('powder')) {
    Icon = Coffee;
  } else if (categoryId?.includes('beverage')) {
    Icon = GlassWater;
  } else if (categoryId?.includes('packaging')) {
    Icon = Package;
  } else if (categoryId?.includes('food')) {
    Icon = UtensilsCrossed;
  }

  return (
    <div
      className={`bg-zinc-100 text-zinc-400 flex items-center justify-center rounded-lg border border-zinc-200/60 ${className}`}
      aria-label="Foto belum tersedia"
    >
      <Icon size={size} strokeWidth={1.5} className="text-zinc-400" />
    </div>
  );
};
