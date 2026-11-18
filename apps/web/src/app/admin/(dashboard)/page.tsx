'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  Boxes,
  ChevronRight,
  Package,
  Plus,
  Settings,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AdminApiError, getStats } from '@/lib/admin-api';
import type { AdminStats } from '@/types/admin';
import {
  AdminButton,
  AdminLinkButton,
  Card,
  EmptyState,
  LoadingBlock,
  OrderStatusPill,
  PageHeader,
  Panel,
  StatCard,
  Table,
  Td,
  Th,
  formatDate,
  formatMoney,
} from '@/components/admin/ui';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setStats(await getStats());
    } catch (cause) {
      setError(
        cause instanceof AdminApiError ? cause.message : 'No se pudo cargar el panel',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <>
        <PageHeader title="Dashboard" description="Resumen general de tu tienda." />
        <Card>
          <LoadingBlock label="Cargando métricas…" />
        </Card>
      </>
    );
  }

  if (error || !stats) {
    return (
      <>
        <PageHeader title="Dashboard" description="Resumen general de tu tienda." />
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="No se pudo cargar el dashboard"
            description={error ?? 'Intenta nuevamente en unos segundos.'}
            action={
              <AdminButton variant="accent" onClick={load}>
                Reintentar
              </AdminButton>
            }
          />
        </Card>
      </>
    );
  }

  const currency = stats.currency;
  const maxRevenue = Math.max(...stats.salesByDay.map((day) => day.revenue), 1);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Ventas, catálogo y actividad reciente en un solo vistazo."
        eyebrow="Resumen general"
        actions={
          <>
            <AdminLinkButton href="/admin/pedidos" variant="secondary" icon={ShoppingCart}>
              Ver pedidos
            </AdminLinkButton>
            <AdminLinkButton href="/admin/productos/nuevo" variant="accent" icon={Plus}>
              Nuevo producto
            </AdminLinkButton>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ingresos confirmados"
          value={formatMoney(stats.revenue, currency)}
          hint={`${stats.acceptedOrders} pedidos confirmados`}
          icon={Banknote}
          tone="teal"
        />
        <StatCard
          label="Pedidos totales"
          value={stats.orders}
          hint={`${stats.pendingOrders} pendientes de gestión`}
          icon={ShoppingBag}
          tone={stats.pendingOrders > 0 ? 'amber' : 'slate'}
        />
        <StatCard
          label="Productos publicados"
          value={stats.activeProducts}
          hint={`${stats.products} en total · ${stats.draftProducts} borradores`}
          icon={Package}
          tone="slate"
        />
        <StatCard
          label="Clientes"
          value={stats.customers}
          hint={`Ticket promedio ${formatMoney(stats.averageTicket, currency)}`}
          icon={Users}
          tone="emerald"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Panel
          title="Ventas de los últimos 7 días"
          description="Pedidos no cancelados, incluido envío."
          className="xl:col-span-2"
          actions={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-700">
              <TrendingUp className="h-3.5 w-3.5" />
              {stats.salesByDay.reduce((acc, day) => acc + day.orders, 0)} pedidos
            </span>
          }
        >
          <div className="flex h-52 items-end gap-2 sm:gap-4">
            {stats.salesByDay.map((day) => {
              const height = Math.max(4, Math.round((day.revenue / maxRevenue) * 100));
              return (
                <div key={day.date} className="group flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex h-40 w-full items-end">
                    <div
                      className="w-full rounded-t-md bg-teal-500/80 transition-all duration-300 group-hover:bg-teal-600"
                      style={{ height: `${height}%` }}
                      title={`${day.date} · ${formatMoney(day.revenue, currency)} · ${day.orders} pedidos`}
                    />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    {day.label}
                  </span>
                  <span className="hidden text-[10px] text-slate-500 sm:block">
                    {day.orders > 0 ? formatMoney(day.revenue, currency) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel
          title="Stock bajo"
          description="Productos y variantes con 5 unidades o menos."
          actions={
            <Link
              href="/admin/inventario?lowStock=1"
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
            >
              Inventario
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {stats.lowStockProducts.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="Todo el stock está saludable"
              description="No hay productos por debajo del umbral configurado."
            />
          ) : (
            <ul className="-my-1 divide-y divide-slate-100">
              {stats.lowStockProducts.map((product) => {
                const variantStock = product.variants.reduce(
                  (acc, variant) => acc + variant.stock,
                  0,
                );
                const stock = product.variants.length > 0 ? variantStock : product.stock;
                return (
                  <li key={product.id} className="flex items-center gap-3 py-2.5">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-slate-100">
                      {product.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-800">
                        {product.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {product.variants.length} variantes
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        stock === 0
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {stock} u.
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-sans text-sm font-semibold text-slate-900">
                Pedidos recientes
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Últimos movimientos del checkout.
              </p>
            </div>
            <Link
              href="/admin/pedidos"
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
            >
              Ver todos
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Aún no hay pedidos"
              description="Cuando un cliente finalice el checkout aparecerá aquí."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Pedido</Th>
                  <Th>Cliente</Th>
                  <Th>Total</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/60">
                    <Td>
                      <Link
                        href={`/admin/pedidos/${order.orderNumber}`}
                        className="font-medium text-slate-800 hover:text-teal-700"
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="text-[11px] text-slate-400">{formatDate(order.createdAt)}</p>
                    </Td>
                    <Td>
                      <p className="text-xs font-medium text-slate-700">
                        {order.customerName}
                      </p>
                      <p className="text-[11px] text-slate-400">{order.email}</p>
                    </Td>
                    <Td className="whitespace-nowrap font-medium">
                      {formatMoney(order.total, order.currency)}
                    </Td>
                    <Td>
                      <OrderStatusPill status={order.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <div className="space-y-5">
          <Panel title="Más vendidos" description="Por unidades confirmadas.">
            {stats.topProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Todavía no hay ventas confirmadas.
              </p>
            ) : (
              <ul className="-my-1 space-y-1">
                {stats.topProducts.map((product, index) => (
                  <li key={`${product.productId}-${index}`} className="flex items-center gap-3 py-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-semibold text-slate-500">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-800">
                        {product.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {product.quantity} unidades · {formatMoney(product.revenue, currency)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Accesos rápidos">
            <div className="grid gap-2">
              <Link
                href="/admin/productos/nuevo"
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 transition hover:border-teal-300 hover:bg-teal-50/50"
              >
                <Plus className="h-4 w-4 text-teal-600" />
                Crear producto
              </Link>
              <Link
                href="/admin/pedidos"
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 transition hover:border-teal-300 hover:bg-teal-50/50"
              >
                <ShoppingCart className="h-4 w-4 text-teal-600" />
                Gestionar pedidos
                {stats.pendingOrders > 0 ? (
                  <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    {stats.pendingOrders}
                  </span>
                ) : null}
              </Link>
              <Link
                href="/admin/tienda"
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 transition hover:border-teal-300 hover:bg-teal-50/50"
              >
                <Settings className="h-4 w-4 text-teal-600" />
                Configurar tienda
              </Link>
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Ticket promedio"
          value={formatMoney(stats.averageTicket, currency)}
          hint={`${stats.unitsSold} unidades vendidas`}
          icon={TrendingUp}
        />
        <StatCard
          label="Categorías"
          value={stats.categories}
          hint="Estructura del catálogo"
          icon={Boxes}
        />
        <StatCard
          label="Stock bajo"
          value={stats.lowStockCount}
          hint="Productos que necesitan reposición"
          icon={AlertTriangle}
          tone={stats.lowStockCount > 0 ? 'rose' : 'emerald'}
        />
      </div>
    </>
  );
}
