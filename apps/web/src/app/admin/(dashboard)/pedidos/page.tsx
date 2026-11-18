'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Download,
  Eye,
  ShoppingBag,
} from 'lucide-react';
import { AdminApiError, listOrders } from '@/lib/admin-api';
import {
  ORDER_STATUS_LABELS,
  type AdminOrderSummary,
  type AdminOrdersResponse,
  type OrderStatus,
} from '@/types/admin';
import { useToast } from '@/components/admin/toast';
import {
  AdminButton,
  AdminLinkButton,
  Card,
  EmptyState,
  Input,
  LoadingBlock,
  OrderStatusPill,
  PageHeader,
  Pagination,
  SearchInput,
  Table,
  Td,
  Th,
  formatDate,
  formatMoney,
} from '@/components/admin/ui';

const TAKE = 20;
const TABS: Array<{ value: '' | OrderStatus; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'CONFIRMED_WHATSAPP', label: 'WhatsApp' },
  { value: 'PAID', label: 'Pagados' },
  { value: 'SHIPPED', label: 'Enviados' },
  { value: 'DELIVERED', label: 'Entregados' },
  { value: 'CANCELLED', label: 'Cancelados' },
];

export default function AdminOrdersPage() {
  const toast = useToast();
  const [items, setItems] = useState<AdminOrderSummary[]>([]);
  const [statusCounts, setStatusCounts] = useState<AdminOrdersResponse['statusCounts']>({});
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [status, setStatus] = useState<'' | OrderStatus>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get('search');
    const statusParam = params.get('status');
    if (searchParam) setSearch(searchParam);
    if (statusParam && statusParam in ORDER_STATUS_LABELS) {
      setStatus(statusParam as OrderStatus);
    }
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
    listOrders({
      status: status || undefined,
      search: debouncedSearch || undefined,
      from: from || undefined,
      to: to || undefined,
      take: TAKE,
      skip,
    })
      .then((response) => {
        if (!active) return;
        setItems(response.items);
        setTotal(response.total);
        setStatusCounts(response.statusCounts);
      })
      .catch((cause) => {
        if (!active) return;
        setError(
          cause instanceof AdminApiError
            ? cause.message
            : 'No se pudieron cargar los pedidos',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status, debouncedSearch, from, to, skip, refresh]);

  function changeTab(next: '' | OrderStatus) {
    setStatus(next);
    setSkip(0);
  }

  function exportCsv() {
    const rows = [
      ['Pedido', 'Fecha', 'Cliente', 'Email', 'Teléfono', 'Departamento', 'Items', 'Total', 'Estado'],
      ...items.map((order) => [
        order.orderNumber,
        new Date(order.createdAt).toISOString(),
        order.customerName,
        order.email,
        order.phone ?? '',
        order.shippingDepartment ?? '',
        String(order._count?.items ?? 0),
        String(order.total / 100),
        ORDER_STATUS_LABELS[order.status],
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado');
  }

  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Revisa, actualiza el estado y gestiona los pedidos recibidos por WhatsApp."
        actions={
          <AdminButton
            variant="secondary"
            icon={Download}
            onClick={exportCsv}
            disabled={items.length === 0}
          >
            Exportar CSV
          </AdminButton>
        }
      />

      <Card>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-3">
          {TABS.map((tab) => {
            const count =
              tab.value === '' ? undefined : statusCounts[tab.value as OrderStatus] ?? 0;
            const active = status === tab.value;
            return (
              <button
                key={tab.value || 'all'}
                type="button"
                onClick={() => changeTab(tab.value)}
                className={`flex shrink-0 items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-xs font-medium transition ${
                  active
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
                {count !== undefined && count > 0 ? (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      active ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por pedido, cliente, email o teléfono…"
            className="min-w-[240px] flex-1"
          />
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setSkip(0);
              }}
              className="w-auto"
              aria-label="Desde"
            />
            <span className="text-xs text-slate-400">a</span>
            <Input
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setSkip(0);
              }}
              className="w-auto"
              aria-label="Hasta"
            />
          </div>
        </div>

        {loading ? (
          <LoadingBlock label="Cargando pedidos…" />
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="No se pudieron cargar los pedidos"
            description={error}
            action={
              <AdminButton variant="accent" onClick={() => setRefresh((value) => value + 1)}>
                Reintentar
              </AdminButton>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No hay pedidos con estos filtros"
            description="Los pedidos creados desde el checkout aparecerán aquí."
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Pedido</Th>
                  <Th>Cliente</Th>
                  <Th>Departamento</Th>
                  <Th>Items</Th>
                  <Th>Total</Th>
                  <Th>Estado</Th>
                  <Th className="text-right">Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/60">
                    <Td>
                      <Link
                        href={`/admin/pedidos/${order.orderNumber}`}
                        className="text-sm font-medium text-slate-800 hover:text-teal-700"
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="text-[11px] text-slate-400">
                        {formatDate(order.createdAt)}
                      </p>
                    </Td>
                    <Td>
                      <p className="text-xs font-medium text-slate-700">
                        {order.customerName}
                      </p>
                      <p className="text-[11px] text-slate-400">{order.email}</p>
                      {order.phone ? (
                        <p className="text-[11px] text-slate-400">{order.phone}</p>
                      ) : null}
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-slate-600">
                      {order.shippingDepartment ?? '—'}
                    </Td>
                    <Td className="text-xs text-slate-600">{order._count?.items ?? 0}</Td>
                    <Td className="whitespace-nowrap text-sm font-medium text-slate-800">
                      {formatMoney(order.total, order.currency)}
                    </Td>
                    <Td>
                      <OrderStatusPill status={order.status} />
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        <AdminLinkButton
                          href={`/admin/pedidos/${order.orderNumber}`}
                          variant="secondary"
                          size="sm"
                          icon={Eye}
                        >
                          Ver
                        </AdminLinkButton>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination
              total={total}
              take={TAKE}
              skip={skip}
              onPage={setSkip}
              itemLabel="pedidos"
            />
          </>
        )}
      </Card>
    </>
  );
}
