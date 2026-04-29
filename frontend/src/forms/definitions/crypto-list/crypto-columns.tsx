import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import type { ListColumn } from '@/core/form/resource-list-page';
import type { CryptoRow } from './types';

function formatUsd(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: n < 1 ? 6 : 2,
  }).format(n);
}

/** Province `dataGridProps.columns` benzeri: kolonlar tek fonksiyonda toplanır. */
export function buildCryptoColumns(): ListColumn<CryptoRow>[] {
  const exchangeMeta: Record<string, { label: string; variant: 'info' | 'warning' | 'secondary' }> = {
    binance: { label: 'Binance', variant: 'info' },
    kucoin: { label: 'KuCoin', variant: 'warning' },
    btcturk: { label: 'BTCTurk', variant: 'secondary' },
    paribu: { label: 'Paribu', variant: 'info' },
    coingecko: { label: 'CoinGecko', variant: 'secondary' },
  };

  return [
    {
      id: 'symbol',
      header: 'Coin',
      cell: (r) => <span className="font-medium">{r.symbol}</span>,
    },
    {
      id: 'exchange',
      header: 'Borsa',
      cell: (r): ReactNode => {
        const meta = exchangeMeta[r.exchange] ?? { label: r.exchange, variant: 'secondary' };
        return (
          <Badge variant={meta.variant} appearance="light" size="sm">
            {meta.label}
          </Badge>
        );
      },
    },
    {
      id: 'last',
      header: 'Son fiyat',
      cell: (r) => formatUsd(r.last),
    },
    {
      id: 'pct',
      header: '24s %',
      cell: (r) => (
        <span
          className={
            r.percentage >= 0
              ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-700 dark:text-emerald-300'
              : 'rounded-full bg-rose-500/15 px-2 py-0.5 text-rose-700 dark:text-rose-300'
          }
        >
          {r.percentage.toFixed(2)}%
        </span>
      ),
    },
    {
      id: 'volume',
      header: 'Hacim',
      cell: (r) => formatUsd(r.volume),
    },
    {
      id: 'hl',
      header: 'High / Low',
      cell: (r) => (
        <span className="text-muted-foreground text-xs">
          {formatUsd(r.high)} / {formatUsd(r.low)}
        </span>
      ),
    },
  ];
}
