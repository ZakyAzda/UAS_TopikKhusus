export type PayMethod = 'COD' | 'TRANSFER';

export type SavedAddress = {
  id: string;
  label: string;
  detail: string;
  lat?: number;
  lng?: number;
};

export type CheckoutParams = {
  from?: string | string[];
  cart_ids?: string | string[];
  product_id?: string | string[];
  quantity?: string | string[];
  total?: string | string[];
};

export const PAY_METHODS: {
  id: PayMethod;
  label: string;
  icon: string;
  desc: string;
}[] = [
  {
    id: 'TRANSFER',
    label: 'Bayar Online (Midtrans)',
    icon: '💳',
    desc: 'Kartu kredit, QRIS, GoPay, OVO, Transfer Bank',
  },
  {
    id: 'COD',
    label: 'Bayar di Tempat (COD)',
    icon: '💵',
    desc: 'Bayar tunai saat barang tiba',
  },
];

export const STORAGE_KEY_ADDRESSES = 'saved_addresses';