'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Mail,
  MapPin,
  Phone,
  Repeat2,
  ShoppingBag,
  Users,
  Wallet,
} from 'lucide-react';
import { AdminApiError, listCustomers } from '@/lib/admin-api';
import type { AdminCustomersResponse } from '@/types/admin';
import {
  AdminButton,
  Card,
  EmptyState,
  LoadingBlock,
  PageHeader,
  SearchInput,
  StatCard,
  Table,
  Td,
  Th,
  formatDate,
  formatMoney,
} from '@/components/admin/ui';

export default function AdminCustomersPage() {
  const [data, setData] = useState<AdminCustomersResponse | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listCustomers(debouncedSearch || undefined)
      .then((response) => {
        if (active) setData(response);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof AdminApiError
              ? cause.message
              : 'No se pudieron cargar los clientes',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedSearch, refresh]);

  const currency = data?.items[0]?.currency ?? 'BOB';

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Clientes que ya completaron al menos un pedido. Se agrupan por correo electrónico."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Clientes"
          value={data?.stats.totalCustomers ?? 0}
          hint="Con pedidos no cancelados"
          icon={Users}
          tone="teal"
        />
        <StatCard
          label="Recurrentes"
          value={data?.stats.repeatCustomers ?? 0}
          hint="Más de un pedido"
          icon={Repeat2}
          tone="emerald"
        />
        <StatCard
          label="Valor promedio"
          value={formatMoney(data?.stats.averageLifetimeValue ?? 0, currency)}
          hint="Gasto acumulado por cliente"
          icon={Wallet}
        />
      </div>

      <Card className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre, email o teléfono…"
            className="max-w-md flex-1"
          />
          <p className="text-xs text-slate-500">
            {data?.total ?? 0} clientes encontrados
          </p>
        </div>

        {loading ? (
          <LoadingBlock label="Cargando clientes…" />
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="No se pudieron cargar los clientes"
            description={error}
            action={
              <AdminButton variant="accent" onClick={() => setRefresh((value) => value + 1)}>
                Reintentar
              </AdminButton>
            }
          />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? 'Sin resultados' : 'Aún no hay clientes'}
            description={
              search
                ? 'Prueba con otro término de búsqueda.'
                : 'Los clientes aparecen cuando completan su primer pedido.'
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Cliente</Th>
                <Th>Contacto</Th>
                <Th>Ubicación</Th>
                <Th>Pedidos</Th>
                <Th>Total gastado</Th>
                <Th>Último pedido</Th>
                <Th className="text-right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((customer) => (
                <tr key={customer.email} className="hover:bg-slate-50/60">
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold uppercase text-teal-700">
                        {customer.name.charAt(0) || 'C'}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {customer.name}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          Desde {formatDate(customer.firstOrderAt)}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <a
                      href={`mailto:${customer.email}`}
                      className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-teal-700"
                    >
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {customer.email}
                    </a>
                    {customer.phone ? (
                      <a
                        href={`tel:${customer.phone}`}
                        className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 hover:text-teal-700"
                      >
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {customer.phone}
                      </a>
                    ) : null}
                  </Td>
                  <Td className="text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {[customer.city, customer.department].filter(Boolean).join(', ') ||
                        '—'}
                    </span>
                  </Td>
                  <Td>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {customer.orders}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap text-sm font-medium text-slate-800">
                    {formatMoney(customer.totalSpent, customer.currency)}
                  </Td>
                  <Td className="whitespace-nowrap text-[11px] text-slate-500">
                    {formatDate(customer.lastOrderAt)}
                    <br />
                    <Link
                      href={`/admin/pedidos/${customer.lastOrderNumber}`}
                      className="text-teal-700 hover:underline"
                    >
                      {customer.lastOrderNumber}
                    </Link>
                  </Td>
                  <Td>
                    <div className="flex justify-end">
                      <Link
                        href={`/admin/pedidos?search=${encodeURIComponent(customer.email)}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        Ver pedidos
                      </Link>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
