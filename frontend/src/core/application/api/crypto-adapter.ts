import axios from 'axios';
import type { CryptoRow } from '@/forms/definitions/crypto-list/types';

const apiBase = () => import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

/**
 * Province’deki FormAdapter benzeri ince katman: UI buradan beslenir,
 * URL / mapping tek yerde kalır (ileride auth header, retry vb. eklenebilir).
 */
export type CryptoListResult = {
  rows: CryptoRow[];
  errors: Array<Record<string, unknown>>;
  partial: boolean;
};

export type CryptoSourceFilter = 'all' | 'okx' | 'btcturk';

export async function fetchCryptoList(source: CryptoSourceFilter): Promise<CryptoListResult> {
  console.log('[frontend][adapter] GET /api/crypto request started', { baseUrl: apiBase(), source });
  const { data } = await axios.get<{
    success: boolean;
    data: CryptoRow[];
    errors?: Array<Record<string, unknown>>;
    partial?: boolean;
  }>(`${apiBase()}/api/crypto`, {
    params: { source },
  });

  if (!data.success) {
    console.error('[frontend][adapter] API response success=false', data);
    throw new Error('API başarısız yanıt döndü');
  }

  console.log('[frontend][adapter] GET /api/crypto response', {
    source,
    rows: data.data?.length ?? 0,
    errors: data.errors?.length ?? 0,
    partial: !!data.partial,
  });

  return {
    rows: data.data ?? [],
    errors: (data.errors as Array<Record<string, unknown>>) ?? [],
    partial: !!data.partial,
  };
}

/** İleride form registry / route map ile eşlenecek sembolik path (province formPath gibi). */
export const CRYPTO_LIST_FORM_PATH = 'definitions.cryptoList' as const;
