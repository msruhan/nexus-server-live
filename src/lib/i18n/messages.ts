export type Locale = 'en' | 'id';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'id'];

export const messages: Record<Locale, Record<string, string>> = {
  en: {
    'nav.orders': 'Orders',
    'nav.services': 'Services',
    'nav.wallet': 'Wallet',
    'order.place': 'Place order',
    'order.success': 'Order placed',
    'common.loading': 'Loading…',
    'common.save': 'Save',
  },
  id: {
    'nav.orders': 'Pesanan',
    'nav.services': 'Layanan',
    'nav.wallet': 'Dompet',
    'order.place': 'Buat pesanan',
    'order.success': 'Pesanan berhasil',
    'common.loading': 'Memuat…',
    'common.save': 'Simpan',
  },
};

export function parseEnabledLocales(raw: string | null | undefined): Locale[] {
  if (!raw?.trim()) return ['en'];
  try {
    const parsed = JSON.parse(raw) as string[];
    return parsed.filter((l): l is Locale => l === 'en' || l === 'id');
  } catch {
    return ['en'];
  }
}

export function t(locale: Locale, key: string): string {
  return messages[locale]?.[key] ?? messages.en[key] ?? key;
}
