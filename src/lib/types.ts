export interface SellableOption {
  id: string;
  product_id: string;
  unit_label: string;
  price_idr: number;
  pack_quantity: number | null;
  source_price_column?: string | null;
  sort_order: number;
  active?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order?: number;
  product_count?: number;
}

export interface Product {
  id: string;
  display_name: string;
  slug: string;
  source_key: string;
  sku?: string | null;
  description?: string | null;
  availability: 'ask_admin' | 'available' | 'unavailable';
  status?: 'draft' | 'published' | 'archived';
  category?: Category | null;
  category_id?: string | null;
  category_name?: string | null;
  image_url?: string | null;
  options: SellableOption[];
}

export interface CartItem {
  productId: string;
  optionId: string;
  productName: string;
  unitLabel: string;
  priceIdr: number;
  qty: number;
}

export interface CheckoutPreviewLine {
  line_position: number;
  product_id: string;
  sellable_option_id: string;
  product_name: string;
  unit_label: string;
  qty: number;
  unit_price_idr: number;
  line_subtotal_idr: number;
  price_changed: boolean;
  old_price_idr: number;
  availability: string;
}

export interface CheckoutPreviewResponse {
  subtotal_idr: number;
  has_price_change: boolean;
  has_unavailable_item: boolean;
  lines: CheckoutPreviewLine[];
}

export interface CheckoutIntentResponse {
  intent_id: string;
  public_ref: string;
  buyer_name: string;
  business_name: string | null;
  subtotal_idr: number;
  message_snapshot: string;
  whatsapp_url: string | null;
  whatsapp_number_configured: boolean;
  lines: any[];
}
