import type { ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardHeading,
  CardTitle,
  CardToolbar,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/** Kolon tanımı — ileride DataGrid column map’e dönüştürülebilir. */
export type ListColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
};

export type ResourceListPageProps<T> = {
  /** Province `name="provinces-list"` benzeri benzersiz liste adı. */
  name: string;
  /** Province `formPath` ile aynı amaç: dokümantasyon / gelecekteki registry anahtarı. */
  formPath: string;
  title: string;
  description?: string;
  columns: ListColumn<T>[];
  rows: T[];
  loading: boolean;
  error: string | null;
  partial?: boolean;
  partialNote?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  toolbar?: ReactNode;
  footer?: ReactNode;
  /** Satır key üretici (opsiyonel). */
  getRowId?: (row: T, index: number) => string;
};

/**
 * Salt okunur liste kabuğu — CrudListForm’un “liste + toolbar” yüzeyinin sadeleştirilmiş hali.
 * İleride Create/Update eklenecekse CrudListForm’a yükseltilebilir.
 */
export function ResourceListPage<T>({
  name,
  formPath,
  title,
  description,
  columns,
  rows,
  loading,
  error,
  partial,
  partialNote,
  emptyTitle,
  emptyDescription,
  toolbar,
  footer,
  getRowId,
}: ResourceListPageProps<T>) {
  return (
    <div
      className="mx-auto max-w-6xl space-y-6 bg-linear-to-br from-primary/10 via-background to-cyan-400/10 p-6"
      data-resource-list={name}
    >
      <Card>
        <CardHeader className="items-start gap-3">
          <CardHeading className="min-w-0 flex-1">
            <div className="min-w-0">
              <CardTitle className="wrap-break-word">{title}</CardTitle>
              {description ? <CardDescription className="wrap-break-word">{description}</CardDescription> : null}
              <p className="text-muted-foreground mt-1 break-all text-xs">formPath: {formPath}</p>
            </div>
          </CardHeading>
          {toolbar ? <CardToolbar className="w-full justify-start md:w-auto md:justify-end">{toolbar}</CardToolbar> : null}
        </CardHeader>

        <CardContent className="space-y-4">
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <div className="font-semibold">Hata</div>
              <div>{error}</div>
            </div>
          ) : null}

          {partial ? (
            <div
              role="status"
              className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-900 dark:text-yellow-100"
            >
              <div className="font-semibold">Kısmi veri</div>
              <div>{partialNote ?? 'Bazı kayıtlar alınamadı; listede gelenler gösteriliyor.'}</div>
            </div>
          ) : null}

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/20 px-4 py-10 text-center">
              <div className="text-base font-semibold">{emptyTitle ?? 'Veri bulunamadı'}</div>
              <div className="text-muted-foreground mx-auto mt-2 max-w-xl text-sm">
                {emptyDescription ?? 'Üzgünüz, bu görünüm için şu an veri alınamadı. Lütfen birazdan tekrar deneyin.'}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => (
                    <TableHead key={c.id}>{c.header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={getRowId ? getRowId(row, idx) : String(idx)}>
                    {columns.map((c) => (
                      <TableCell key={c.id}>{c.cell(row)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {footer ? <CardFooter>{footer}</CardFooter> : null}
      </Card>
    </div>
  );
}
