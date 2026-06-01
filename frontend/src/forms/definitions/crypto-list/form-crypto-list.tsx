import { useCallback, useEffect, useMemo, useState } from 'react';
import { CRYPTO_LIST_FORM_PATH, fetchCryptoList } from '@/core/application/api/crypto-adapter';
import { ResourceListPage } from '@/core/form/resource-list-page';
import { useTheme } from '@/core/theme/use-theme';
import { Button } from '@/components/ui/button';
import type { CryptoRow } from './types';
import { buildCryptoColumns } from './crypto-columns';
import { defaultFilterValues } from './form-default';
import type { CryptoFilterValues } from './form-schema';

/**
 * Province `form-province.tsx` ile aynı düzen:
 * - üstte useMemo ile kolon/config
 * - veri erişimi ayrı adapter katmanında
 * - formPath sabiti (ileride registry / route ile eşlenebilir)
 */
export default function FormCryptoList() {
  const { mode, cycleMode } = useTheme();
  const [filter, setFilter] = useState<CryptoFilterValues['exchange']>(defaultFilterValues.exchange);
  const [rows, setRows] = useState<CryptoRow[]>([]);
  const [errors, setErrors] = useState<Array<Record<string, unknown>>>([]);
  const [partial, setPartial] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const columns = useMemo(() => buildCryptoColumns(), []);

  const load = useCallback(async () => {
    const source = filter === 'all' ? 'all' : filter;
    console.log('[frontend][form] load triggered', { source });
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCryptoList(source);
      setRows(res.rows);
      setErrors(res.errors);
      setPartial(res.partial);
      console.log('[frontend][form] load success', {
        source,
        rows: res.rows.length,
        errors: res.errors.length,
        partial: res.partial,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Bilinmeyen hata');
      setRows([]);
      console.error('[frontend][form] load failed', e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const unavailableExchanges = useMemo(() => {
    const set = new Set<string>();
    for (const item of errors) {
      const exchange = item.exchange;
      if (typeof exchange === 'string' && exchange !== '*') {
        set.add(exchange.toLowerCase());
      }
    }
    return set;
  }, [errors]);

  const exchangeLabel = (value: string) => {
    if (value === 'all') return 'Tüm kaynaklar';
    if (value === 'okx') return 'OKX';
    if (value === 'btcturk') return 'BTCTurk';
    return value;
  };

  const emptyState = useMemo(() => {
    if (filter === 'all') {
      return {
        title: 'Uzgunuz, su an verilere ulasamadik',
        description: 'Tum kaynaklardan veri alinamadi. Birazdan tekrar deneyebilir veya Yenile butonunu kullanabilirsiniz.',
      };
    }

    const selected = exchangeLabel(filter);
    const sourceLooksDown = unavailableExchanges.has(filter);
    return {
      title: `Uzgunuz, ${selected} verisine ulasamadik`,
      description: sourceLooksDown
        ? `${selected} kaynagindan su an cevap alinmiyor olabilir. Lutfen birazdan tekrar deneyin.`
        : `${selected} icin gosterilecek bir deger bulunamadi. Lutfen farkli bir kaynak secin veya Yenile yapin.`,
    };
  }, [filter, unavailableExchanges]);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setFilter('all')} disabled={filter === 'all'}>
        Tümü
      </Button>
      <Button variant="outline" size="sm" onClick={() => setFilter('okx')} disabled={filter === 'okx'}>
        OKX
      </Button>
      <Button variant="outline" size="sm" onClick={() => setFilter('btcturk')} disabled={filter === 'btcturk'}>
        BTCTurk
      </Button>
      <Button variant="primary" size="sm" onClick={() => void load()}>
        Yenile
      </Button>
      <Button variant="secondary" size="sm" onClick={cycleMode}>
        Tema: {mode === 'system' ? 'Sistem' : mode === 'light' ? 'Acik' : 'Koyu'}
      </Button>
    </div>
  );

  return (
    <ResourceListPage<CryptoRow>
      name="crypto-list"
      formPath={CRYPTO_LIST_FORM_PATH}
      getRowId={(r) => `${r.exchange}-${r.symbol}`}
      title="Kripto Para Dashboard"
      description="Anlik fiyat takibi, coklu borsa kaynaklari ve sade filtreleme deneyimi."
      columns={columns}
      rows={rows}
      loading={loading}
      error={error}
      partial={partial && errors.length > 0}
      partialNote="Bazi kaynaklardan veri alinmadi. Ekranda ulasilabilen guncel kayitlar gosteriliyor."
      emptyTitle={emptyState.title}
      emptyDescription={emptyState.description}
      toolbar={toolbar}
      footer={
        <div className="flex w-full items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">API: {import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'}</span>
          <span className="text-muted-foreground">Kayit: {rows.length}</span>
        </div>
      }
    />
  );
}
