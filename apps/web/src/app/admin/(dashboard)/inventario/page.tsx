'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  Check,
  PackageX,
  RefreshCw,
  Warehouse,
} from 'lucide-react';
import {
  AdminApiError,
  listInventory,
  updateProductStock,
  updateVariantStock,
} from '@/lib/admin-api';
import type { AdminInventoryResponse, InventoryItem } from '@/types/admin';
import { useToast } from '@/components/admin/toast';
import {
  AdminButton,
  Card,
  EmptyState,
  Input,
  LoadingBlock,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
  Table,
  Td,
  Th,
  Toggle,
} from '@/components/admin/ui';

const TAKE = 30;

interface StockRow {
  key: string;
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  sku: string;
  category: string;
  image: string | null;
  stock: number;
  isActive: boolean;
}

export default function AdminInventoryPage() {
  const toast = useToast();
  const [data, setData] = useState<AdminInventoryResponse | null>(null);
  const [rows, setRows] = useState<StockRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('lowStock') === '1') setLowStock(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setSkip(0);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listInventory({
      search: debouncedSearch || undefined,
      lowStock: lowStock || undefined,
      take: TAKE,
      skip,
    })
      .then((response) => {
        if (!active) return;
        setData(response);
        const flat = flatten(response.items);
        setRows(flat);
        setDrafts(
          Object.fromEntries(flat.map((row) => [row.key, String(row.stock)])),
        );
      })
      .catch((cause) => {
        if (!active) return;
        setError(
          cause instanceof AdminApiError
            ? cause.message
            : 'No se pudo cargar el inventario',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedSearch, lowStock, skip, refresh]);

  const stats = data?.stats;

  async function saveRow(row: StockRow) {
    const value = Number(drafts[row.key]);
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Ingresa un stock válido (0 o mayor)');
      return;
    }
    setSavingKey(row.key);
    try {
      if (row.variantId) {
        await updateVariantStock(row.productId, row.variantId, Math.floor(value));
      } else {
        await updateProductStock(row.productId, Math.floor(value));
      }
      setRows((current) =>
        current.map((item) =>
          item.key === row.key ? { ...item, stock: Math.floor(value) } : item,
        ),
      );
      toast.success(`Stock actualizado para ${row.sku}`);
    } catch (cause) {
      toast.error(
        cause instanceof AdminApiError ? cause.message : 'No se pudo actualizar el stock',
      );
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Inventario"
        description="Controla las unidades disponibles de cada SKU. Los cambios se reflejan en el checkout al instante."
        actions={
          <AdminButton
            variant="secondary"
            icon={RefreshCw}
            onClick={() => setRefresh((value) => value + 1)}
          >
            Actualizar
          </AdminButton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="SKUs totales"
          value={stats?.totalSkus ?? '—'}
          hint="Variantes + productos simples"
          icon={Warehouse}
          tone="teal"
        />
        <StatCard
          label="Unidades en stock"
          value={stats?.totalUnits ?? '—'}
          hint="Variantes activas + productos simples"
          icon={Boxes}
        />
        <StatCard
          label="Stock bajo"
          value={stats?.lowStock ?? '—'}
          hint="5 unidades o menos"
          icon={AlertTriangle}
          tone={stats && stats.lowStock > 0 ? 'amber' : 'emerald'}
        />
        <StatCard
          label="Agotados"
          value={stats?.outOfStock ?? '—'}
          hint="Sin unidades disponibles"
          icon={PackageX}
          tone={stats && stats.outOfStock > 0 ? 'rose' : 'emerald'}
        />
      </div>

      <Card className="mt-5">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar producto o SKU…"
            className="min-w-[240px] flex-1"
          />
          <Toggle
            checked={lowStock}
            onChange={(checked) => {
              setLowStock(checked);
              setSkip(0);
            }}
            label="Solo stock bajo"
          />
        </div>

        {loading ? (
          <LoadingBlock label="Cargando inventario…" />
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="No se pudo cargar el inventario"
            description={error}
            action={
              <AdminButton variant="accent" onClick={() => setRefresh((value) => value + 1)}>
                Reintentar
              </AdminButton>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={lowStock ? 'No hay SKUs con stock bajo' : 'No hay productos'}
            description={
              lowStock
                ? 'Todo el inventario está por encima del umbral de 5 unidades.'
                : 'Crea productos para empezar a controlar el inventario.'
            }
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Producto</Th>
                  <Th>SKU / Variante</Th>
                  <Th>Categoría</Th>
                  <Th>Stock actual</Th>
                  <Th>Nuevo stock</Th>
                  <Th className="text-right">Acción</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const draft = drafts[row.key] ?? String(row.stock);
                  const changed = Number(draft) !== row.stock;
                  return (
                    <tr key={row.key} className="hover:bg-slate-50/60">
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-slate-100">
                            {row.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={row.image}
                                alt={row.productName}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {row.productName}
                            </p>
                            {!row.variantId ? (
                              <p className="text-[11px] text-slate-400">
                                Producto sin variantes
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <p className="font-mono text-xs text-slate-700">{row.sku}</p>
                        {row.variantName ? (
                          <p className="text-[11px] text-slate-400">{row.variantName}</p>
                        ) : null}
                      </Td>
                      <Td className="text-xs text-slate-600">{row.category}</Td>
                      <Td>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.stock === 0
                              ? 'bg-rose-50 text-rose-700'
                              : row.stock <= 5
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {row.stock} u.
                        </span>
                        {!row.isActive ? (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-400">
                            inactiva
                          </span>
                        ) : null}
                      </Td>
                      <Td>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={draft}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [row.key]: event.target.value,
                            }))
                          }
                          className="h-8 w-24 py-0 text-sm"
                        />
                      </Td>
                      <Td>
                        <div className="flex justify-end">
                          <AdminButton
                            size="sm"
                            variant={changed ? 'accent' : 'secondary'}
                            icon={changed ? Check : undefined}
                            disabled={!changed}
                            loading={savingKey === row.key}
                            onClick={() => saveRow(row)}
                          >
                            Guardar
                          </AdminButton>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination
              total={data?.total ?? 0}
              take={TAKE}
              skip={skip}
              onPage={setSkip}
              itemLabel="productos"
            />
          </>
        )}
      </Card>

      <p className="mt-4 text-xs text-slate-500">
        Umbral de stock bajo: 5 unidades. Para editar precios, nombres o agregar
        variantes, entra a la ficha del producto.
      </p>
    </>
  );
}

function flatten(items: InventoryItem[]): StockRow[] {
  const rows: StockRow[] = [];
  for (const item of items) {
    if (item.variants.length > 0) {
      for (const variant of item.variants) {
        rows.push({
          key: `${item.id}:${variant.id}`,
          productId: item.id,
          variantId: variant.id,
          productName: item.name,
          variantName: variant.name,
          sku: variant.sku,
          category: item.category?.name ?? '—',
          image: item.images?.[0] ?? null,
          stock: variant.stock,
          isActive: variant.isActive,
        });
      }
    } else {
      rows.push({
        key: item.id,
        productId: item.id,
        productName: item.name,
        sku: '—',
        category: item.category?.name ?? '—',
        image: item.images?.[0] ?? null,
        stock: item.stock,
        isActive: true,
      });
    }
  }
  return rows;
}
