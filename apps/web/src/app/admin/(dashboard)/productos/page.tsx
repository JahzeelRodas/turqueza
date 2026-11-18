'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  BadgePercent,
  Copy,
  Download,
  ExternalLink,
  Pencil,
  Plus,
  Package,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  AdminApiError,
  bulkDiscount,
  deleteProduct,
  duplicateProduct,
  listCategories,
  listProducts,
  updateProductStatus,
} from '@/lib/admin-api';
import type { AdminCategory, AdminProduct, BulkDiscountPayload } from '@/types/admin';
import { useToast } from '@/components/admin/toast';
import {
  AdminButton,
  AdminLinkButton,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Table,
  Td,
  Th,
  formatDate,
  formatMoney,
} from '@/components/admin/ui';

const TAKE = 20;

export default function AdminProductsPage() {
  const toast = useToast();
  const [items, setItems] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [saleOpen, setSaleOpen] = useState(false);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [debouncedSearch, status, category, sort, skip]);

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
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
    listProducts({
      search: debouncedSearch || undefined,
      status: status || undefined,
      category: category || undefined,
      sort,
      take: TAKE,
      skip,
    })
      .then((response) => {
        if (!active) return;
        setItems(response.items);
        setTotal(response.total);
      })
      .catch((cause) => {
        if (!active) return;
        setError(
          cause instanceof AdminApiError
            ? cause.message
            : 'No se pudieron cargar los productos',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedSearch, status, category, sort, skip, refresh]);

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((item) => [item.id, item.name]));
    return (id?: string | null) => (id ? map.get(id) ?? '—' : 'Sin categoría');
  }, [categories]);

  const selectedProducts = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds],
  );

  const allOnPageSelected =
    items.length > 0 && items.every((item) => selectedIds.has(item.id));

  function toggleSelect(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((current) => {
      if (items.every((item) => current.has(item.id))) {
        const next = new Set(current);
        for (const item of items) next.delete(item.id);
        return next;
      }
      const next = new Set(current);
      for (const item of items) next.add(item.id);
      return next;
    });
  }

  async function applyDiscount(payload: BulkDiscountPayload) {
    try {
      const result = await bulkDiscount(payload);
      const label =
        payload.discountPercent === null
          ? 'Ofertas retiradas'
          : `Oferta del ${payload.discountPercent}% aplicada`;
      toast.success(`${label} · ${result.affectedProducts} producto(s)`);
      setSaleOpen(false);
      setSelectedIds(new Set());
      setRefresh((value) => value + 1);
    } catch (cause) {
      toast.error(
        cause instanceof AdminApiError
          ? cause.message
          : 'No se pudo actualizar la oferta',
      );
    }
  }

  async function changeStatus(product: AdminProduct, next: string) {
    setBusyId(product.id);
    try {
      const updated = await updateProductStatus(
        product.id,
        next as AdminProduct['status'],
      );
      setItems((current) =>
        current.map((item) => (item.id === product.id ? updated : item)),
      );
      toast.success(`Estado actualizado a ${next === 'ACTIVE' ? 'publicado' : next === 'DRAFT' ? 'borrador' : 'archivado'}`);
    } catch (cause) {
      toast.error(cause instanceof AdminApiError ? cause.message : 'No se pudo actualizar');
    } finally {
      setBusyId(null);
    }
  }

  async function duplicate(product: AdminProduct) {
    setBusyId(product.id);
    try {
      const copy = await duplicateProduct(product.id);
      toast.success(`Copia creada como borrador: ${copy.name}`);
      setItems((current) => [copy, ...current].slice(0, TAKE));
      setTotal((current) => current + 1);
    } catch (cause) {
      toast.error(cause instanceof AdminApiError ? cause.message : 'No se pudo duplicar');
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteProduct(toDelete.id);
      toast.success('Producto eliminado');
      setItems((current) => current.filter((item) => item.id !== toDelete.id));
      setTotal((current) => Math.max(0, current - 1));
      setToDelete(null);
    } catch (cause) {
      toast.error(cause instanceof AdminApiError ? cause.message : 'No se pudo eliminar');
    } finally {
      setDeleting(false);
    }
  }

  function exportCsv() {
    const rows = [
      ['Nombre', 'Slug', 'Categoría', 'Precio', 'Stock', 'Estado', 'Destacado'],
      ...items.map((product) => [
        product.name,
        product.slug,
        categoryName(product.categoryId),
        String(product.price / 100),
        String(effectiveStock(product)),
        product.status,
        product.isFeatured ? 'Sí' : 'No',
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `productos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Productos"
        description="Gestiona el catálogo, precios, variantes, stock y publicación."
        actions={
          <>
            <AdminButton
              variant="secondary"
              icon={BadgePercent}
              onClick={() => setSaleOpen(true)}
            >
              Ofertas
            </AdminButton>
            <AdminButton
              variant="secondary"
              icon={Download}
              onClick={exportCsv}
              disabled={items.length === 0}
            >
              Exportar CSV
            </AdminButton>
            <AdminLinkButton href="/admin/productos/nuevo" variant="accent" icon={Plus}>
              Nuevo producto
            </AdminLinkButton>
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre, SKU o etiqueta…"
            className="min-w-[220px] flex-1"
          />
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setSkip(0);
            }}
            className="w-auto min-w-[140px]"
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Publicados</option>
            <option value="DRAFT">Borradores</option>
            <option value="ARCHIVED">Archivados</option>
          </Select>
          <Select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setSkip(0);
            }}
            className="w-auto min-w-[150px]"
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setSkip(0);
            }}
            className="w-auto min-w-[150px]"
            aria-label="Ordenar"
          >
            <option value="newest">Más recientes</option>
            <option value="oldest">Más antiguos</option>
            <option value="name">Nombre A–Z</option>
            <option value="price-asc">Precio: menor</option>
            <option value="price-desc">Precio: mayor</option>
            <option value="stock-asc">Stock: menor</option>
          </Select>
        </div>

        {selectedIds.size > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 bg-teal-50/70 px-4 py-2.5">
            <p className="text-xs font-medium text-teal-900">
              {selectedIds.size} producto(s) seleccionado(s)
            </p>
            <div className="flex items-center gap-2">
              <AdminButton
                size="sm"
                variant="accent"
                icon={BadgePercent}
                onClick={() => setSaleOpen(true)}
              >
                Aplicar oferta
              </AdminButton>
              <AdminButton
                size="sm"
                variant="ghost"
                icon={X}
                onClick={() => setSelectedIds(new Set())}
              >
                Limpiar selección
              </AdminButton>
            </div>
          </div>
        ) : null}

        {loading ? (
          <LoadingBlock label="Cargando productos…" />
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="No se pudieron cargar los productos"
            description={error}
            action={
              <AdminButton variant="accent" onClick={() => setRefresh((value) => value + 1)}>
                Reintentar
              </AdminButton>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No hay productos con estos filtros"
            description="Crea tu primer producto o cambia los filtros de búsqueda."
            action={
              <AdminLinkButton href="/admin/productos/nuevo" variant="accent" icon={Plus}>
                Crear producto
              </AdminLinkButton>
            }
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th className="w-10">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAll}
                      aria-label="Seleccionar todos los productos de esta página"
                      className="h-4 w-4 cursor-pointer accent-teal-600"
                    />
                  </Th>
                  <Th>Producto</Th>
                  <Th>Categoría</Th>
                  <Th>Precio</Th>
                  <Th>Stock</Th>
                  <Th>Estado</Th>
                  <Th>Actualizado</Th>
                  <Th className="text-right">Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((product) => {
                  const stock = effectiveStock(product);
                  const discount =
                    product.compareAtPrice && product.compareAtPrice > product.price
                      ? Math.round(
                          ((product.compareAtPrice - product.price) / product.compareAtPrice) *
                            100,
                        )
                      : null;
                  return (
                    <tr
                      key={product.id}
                      className={`group hover:bg-slate-50/60 ${
                        selectedIds.has(product.id) ? 'bg-teal-50/40' : ''
                      }`}
                    >
                      <Td>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(product.id)}
                          onChange={() => toggleSelect(product.id)}
                          aria-label={`Seleccionar ${product.name}`}
                          className="h-4 w-4 cursor-pointer accent-teal-600"
                        />
                      </Td>
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            {product.images?.[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/productos/${product.id}`}
                              className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-800 hover:text-teal-700"
                            >
                              {product.name}
                              {product.isFeatured ? (
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              ) : null}
                            </Link>
                            <p className="truncate text-[11px] text-slate-400">
                              {product.variants.length} variantes · {product.slug}
                            </p>
                          </div>
                        </div>
                      </Td>
                      <Td className="whitespace-nowrap text-xs text-slate-600">
                        {categoryName(product.categoryId)}
                      </Td>
                      <Td className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-800">
                            {formatMoney(product.price, product.currency)}
                          </p>
                          {discount ? (
                            <span className="inline-flex rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                              −{discount}%
                            </span>
                          ) : null}
                        </div>
                        {product.compareAtPrice ? (
                          <p className="text-[11px] text-slate-400 line-through">
                            {formatMoney(product.compareAtPrice, product.currency)}
                          </p>
                        ) : null}
                      </Td>
                      <Td>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            stock === 0
                              ? 'bg-rose-50 text-rose-700'
                              : stock <= 5
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {stock} u.
                        </span>
                      </Td>
                      <Td>
                        <Select
                          value={product.status}
                          disabled={busyId === product.id}
                          onChange={(event) => changeStatus(product, event.target.value)}
                          className="h-8 w-auto min-w-[120px] py-0 text-xs"
                          aria-label="Cambiar estado"
                        >
                          <option value="ACTIVE">Publicado</option>
                          <option value="DRAFT">Borrador</option>
                          <option value="ARCHIVED">Archivado</option>
                        </Select>
                      </Td>
                      <Td className="whitespace-nowrap text-[11px] text-slate-500">
                        {formatDate(product.updatedAt)}
                      </Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1">
                          {product.status === 'ACTIVE' ? (
                            <a
                              href={`/producto/${product.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              title="Ver en la tienda"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          ) : null}
                          <Link
                            href={`/admin/productos/${product.id}`}
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => duplicate(product)}
                            disabled={busyId === product.id}
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                            title="Duplicar"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setToDelete(product)}
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination
              total={total}
              take={TAKE}
              skip={skip}
              onPage={setSkip}
              itemLabel="productos"
            />
          </>
        )}
      </Card>

      <BulkSaleModal
        open={saleOpen}
        onClose={() => setSaleOpen(false)}
        selectedProducts={selectedProducts}
        onApply={applyDiscount}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title={`Eliminar «${toDelete?.name ?? ''}»`}
        description="El producto y sus variantes se eliminarán del catálogo."
        confirmLabel="Eliminar producto"
      />

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Archive className="h-3.5 w-3.5" />
        Los productos archivados no se muestran en la tienda, pero conservan su historial.
      </div>
    </>
  );
}

function effectiveStock(product: AdminProduct) {
  const active = product.variants.filter((variant) => variant.isActive);
  if (active.length > 0) {
    return active.reduce((acc, variant) => acc + variant.stock, 0);
  }
  return product.stock;
}

const PRESETS = [10, 15, 20, 25, 30, 40, 50];

function BulkSaleModal({
  open,
  onClose,
  selectedProducts,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  selectedProducts: AdminProduct[];
  onApply: (payload: BulkDiscountPayload) => Promise<void>;
}) {
  const [mode, setMode] = useState<'apply' | 'clear'>('apply');
  const [scope, setScope] = useState<'all' | 'selected'>('all');
  const [percent, setPercent] = useState('20');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('apply');
    setScope(selectedProducts.length > 0 ? 'selected' : 'all');
    setPercent('20');
    setError(null);
  }, [open, selectedProducts.length]);

  const value = Number(percent);
  const valid = Number.isInteger(value) && value >= 1 && value <= 90;
  const selectionCount = selectedProducts.length;
  const targets = scope === 'selected' ? selectedProducts.slice(0, 3) : [];

  async function submit() {
    setError(null);
    if (mode === 'apply' && !valid) {
      setError('El descuento debe ser un número entero entre 1 y 90.');
      return;
    }
    if (scope === 'selected' && selectionCount === 0) {
      setError('Selecciona al menos un producto o aplica la oferta a todo el catálogo.');
      return;
    }
    setSaving(true);
    try {
      await onApply({
        discountPercent: mode === 'clear' ? null : value,
        productIds:
          scope === 'selected' ? selectedProducts.map((product) => product.id) : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'apply' ? 'Ofertas masivas' : 'Retirar ofertas'}
      description="El descuento se aplica sobre el precio original y puede retirarse cuando quieras."
      size="md"
      footer={
        <>
          <AdminButton variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </AdminButton>
          <AdminButton
            variant={mode === 'clear' ? 'danger' : 'accent'}
            loading={saving}
            icon={BadgePercent}
            onClick={submit}
          >
            {mode === 'clear'
              ? `Retirar oferta${scope === 'selected' ? ` (${selectionCount})` : ''}`
              : `Aplicar ${valid ? `${value}%` : 'descuento'}`}
          </AdminButton>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
          {(['apply', 'clear'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              className={`rounded-md px-3 py-2 text-xs font-medium transition ${
                mode === option
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {option === 'apply' ? 'Aplicar oferta' : 'Quitar oferta'}
            </button>
          ))}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-slate-700">¿A qué productos?</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <ScopeCard
              active={scope === 'all'}
              onClick={() => setScope('all')}
              title="Todo el catálogo"
              description="Todos los productos no archivados."
            />
            <ScopeCard
              active={scope === 'selected'}
              onClick={() => setScope('selected')}
              title={`Selección (${selectionCount})`}
              description={
                selectionCount > 0
                  ? 'Solo los productos marcados en la tabla.'
                  : 'Marca productos en la tabla para usar esta opción.'
              }
              disabled={selectionCount === 0}
            />
          </div>
        </div>

        {mode === 'apply' ? (
          <div>
            <Field
              label="Porcentaje de descuento"
              hint="Entre 1% y 90%. El precio original queda tachado en la tienda."
            >
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  max="90"
                  step="1"
                  value={percent}
                  onChange={(event) => {
                    setPercent(event.target.value);
                    setError(null);
                  }}
                  className="pr-10 text-lg font-semibold"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                  %
                </span>
              </div>
            </Field>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPercent(String(preset))}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    Number(percent) === preset
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-700">
            Se restaurará el precio original de los productos seleccionados y se quitará el
            precio tachado de la tienda.
          </div>
        )}

        {mode === 'apply' && valid ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Vista previa
            </p>
            {scope === 'selected' && targets.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {targets.map((product) => {
                  const base = product.compareAtPrice ?? product.price;
                  const next = Math.max(1, Math.round((base * (100 - value)) / 100));
                  return (
                    <li key={product.id} className="flex items-center justify-between gap-3">
                      <span className="truncate text-xs text-slate-700">{product.name}</span>
                      <span className="shrink-0 text-xs">
                        <span className="text-slate-400 line-through">
                          {formatMoney(base, product.currency)}
                        </span>{' '}
                        <span className="font-semibold text-slate-900">
                          {formatMoney(next, product.currency)}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-slate-600">
                Se recalcularán los precios de todo el catálogo no archivado con un{' '}
                <strong className="text-slate-900">{value}%</strong> de descuento.
              </p>
            )}
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function ScopeCard({
  active,
  onClick,
  title,
  description,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-3 py-2.5 text-left transition ${
        active
          ? 'border-teal-600 bg-teal-50/70 ring-1 ring-teal-600'
          : 'border-slate-200 bg-white hover:border-slate-300'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <span className="block text-xs font-semibold text-slate-800">{title}</span>
      <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
        {description}
      </span>
    </button>
  );
}
