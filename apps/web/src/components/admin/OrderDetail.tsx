'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  MapPin,
  MessageCircle,
  Phone,
  Mail,
  Save,
  StickyNote,
  Truck,
  User,
} from 'lucide-react';
import {
  AdminApiError,
  getOrder,
  updateOrderNotes,
  updateOrderStatus,
} from '@/lib/admin-api';
import {
  ORDER_STATUS_LABELS,
  type AdminOrder,
  type OrderStatus,
} from '@/types/admin';
import { useToast } from '@/components/admin/toast';
import {
  AdminButton,
  AdminLinkButton,
  Card,
  CopyButton,
  EmptyState,
  Field,
  LoadingBlock,
  OrderStatusPill,
  PageHeader,
  Panel,
  Select,
  Table,
  Td,
  Textarea,
  Th,
  formatDate,
  formatMoney,
} from '@/components/admin/ui';

export function OrderDetail({ orderNumber }: { orderNumber: string }) {
  const toast = useToast();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<OrderStatus>('PENDING');
  const [savingStatus, setSavingStatus] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getOrder(orderNumber)
      .then((data) => {
        if (!active) return;
        setOrder(data);
        setStatus(data.status);
        setNotes(data.notes ?? '');
      })
      .catch((cause) => {
        if (!active) return;
        setError(
          cause instanceof AdminApiError ? cause.message : 'No se pudo cargar el pedido',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderNumber]);

  async function saveStatus() {
    if (!order) return;
    setSavingStatus(true);
    try {
      const updated = await updateOrderStatus(order.orderNumber, status);
      setOrder((current) =>
        current
          ? { ...current, status: updated.status, updatedAt: updated.updatedAt }
          : current,
      );
      toast.success(`Estado actualizado a «${ORDER_STATUS_LABELS[updated.status]}»`);
    } catch (cause) {
      toast.error(
        cause instanceof AdminApiError ? cause.message : 'No se pudo actualizar el estado',
      );
    } finally {
      setSavingStatus(false);
    }
  }

  async function saveNotes() {
    if (!order) return;
    setSavingNotes(true);
    try {
      const updated = await updateOrderNotes(order.orderNumber, notes);
      setOrder((current) =>
        current ? { ...current, notes: updated.notes } : current,
      );
      toast.success('Nota guardada');
    } catch (cause) {
      toast.error(
        cause instanceof AdminApiError ? cause.message : 'No se pudo guardar la nota',
      );
    } finally {
      setSavingNotes(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Detalle del pedido" />
        <Card>
          <LoadingBlock label="Cargando pedido…" />
        </Card>
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <PageHeader title="Detalle del pedido" />
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="No se pudo cargar el pedido"
            description={error ?? 'El pedido no existe o fue eliminado.'}
            action={
              <AdminLinkButton href="/admin/pedidos" variant="secondary" icon={ArrowLeft}>
                Volver a pedidos
              </AdminLinkButton>
            }
          />
        </Card>
      </>
    );
  }

  const address = order.shippingAddress as Record<string, unknown>;
  const text = (key: string) =>
    typeof address[key] === 'string' && address[key] ? String(address[key]) : null;
  const totalItems = order.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        description={`Creado el ${formatDate(order.createdAt)} · ${totalItems} unidades · ${formatMoney(order.total, order.currency)}`}
        eyebrow="Pedido"
        actions={
          <>
            <AdminLinkButton href="/admin/pedidos" variant="secondary" icon={ArrowLeft}>
              Volver
            </AdminLinkButton>
            {order.whatsappUrl ? (
              <AdminLinkButton
                href={order.whatsappUrl}
                variant="accent"
                icon={MessageCircle}
                external
              >
                Abrir WhatsApp
              </AdminLinkButton>
            ) : null}
          </>
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Panel
            title="Productos del pedido"
            description={`${order.items.length} líneas · ${totalItems} unidades`}
          >
            <Table>
              <thead>
                <tr>
                  <Th>Producto</Th>
                  <Th>Detalle</Th>
                  <Th>Cant.</Th>
                  <Th>Precio</Th>
                  <Th className="text-right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <Td>
                      <p className="text-sm font-medium text-slate-800">{item.name}</p>
                      <p className="text-[11px] text-slate-400">SKU {item.sku}</p>
                      {Object.keys(item.options ?? {}).length > 0 ? (
                        <p className="mt-1 text-[11px] text-slate-500">
                          {Object.entries(item.options)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(' · ')}
                        </p>
                      ) : null}
                    </Td>
                    <Td>
                      {item.engraving?.enabled ? (
                        <div className="rounded-md border border-teal-200 bg-teal-50/60 px-2.5 py-1.5 text-[11px] leading-relaxed text-teal-900">
                          <p className="font-semibold">Grabado: «{item.engraving.text}»</p>
                          <p>
                            {item.engraving.fontLabel ?? item.engraving.font} ·{' '}
                            {item.engraving.placementLabel ?? item.engraving.placement}
                          </p>
                          {item.engraving.price ? (
                            <p>+{formatMoney(item.engraving.price, order.currency)}</p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Sin grabado</span>
                      )}
                    </Td>
                    <Td className="text-sm">{item.quantity}</Td>
                    <Td className="whitespace-nowrap text-xs text-slate-600">
                      {formatMoney(item.unitPrice, order.currency)}
                    </Td>
                    <Td className="whitespace-nowrap text-right text-sm font-medium">
                      {formatMoney(item.total, order.currency)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <div className="mt-4 ml-auto max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="text-slate-800">
                  {formatMoney(order.subtotal, order.currency)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Envío</span>
                <span className="text-slate-800">
                  {formatMoney(order.shipping, order.currency)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-semibold text-slate-900">
                <span>Total</span>
                <span>{formatMoney(order.total, order.currency)}</span>
              </div>
            </div>
          </Panel>

          {order.whatsappMessage ? (
            <Panel
              title="Mensaje de WhatsApp"
              description="Mensaje exacto que recibió (o recibirá) la tienda."
              actions={<CopyButton text={order.whatsappMessage} label="Copiar mensaje" />}
            >
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-700">
                {order.whatsappMessage}
              </pre>
            </Panel>
          ) : null}

          <Panel
            title="Notas internas"
            description="Solo visibles para el equipo. Útiles para seguimiento o incidencias."
          >
            <Field label="Nota del pedido">
              <Textarea
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ej: el cliente pidió cambiar la dirección de entrega…"
              />
            </Field>
            <div className="mt-3 flex justify-end">
              <AdminButton
                variant="secondary"
                icon={Save}
                loading={savingNotes}
                onClick={saveNotes}
              >
                Guardar nota
              </AdminButton>
            </div>
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel title="Estado del pedido">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">Estado actual</span>
              <OrderStatusPill status={order.status} />
            </div>
            <div className="mt-3 space-y-3">
              <Field label="Cambiar estado">
                <Select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as OrderStatus)}
                >
                  {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <AdminButton
                variant="accent"
                className="w-full"
                loading={savingStatus}
                disabled={status === order.status}
                onClick={saveStatus}
              >
                Actualizar estado
              </AdminButton>
            </div>
          </Panel>

          <Panel title="Cliente">
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2.5">
                <User className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-800">{order.customerName}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-slate-400" />
                <a
                  href={`mailto:${order.email}`}
                  className="truncate text-slate-600 hover:text-teal-700"
                >
                  {order.email}
                </a>
              </li>
              {order.phone ? (
                <li className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <a
                    href={`tel:${order.phone}`}
                    className="text-slate-600 hover:text-teal-700"
                  >
                    {order.phone}
                  </a>
                </li>
              ) : null}
            </ul>
          </Panel>

          <Panel title="Envío">
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div className="space-y-0.5 text-sm text-slate-600">
                <p className="font-medium text-slate-800">
                  {text('fullName') ?? order.customerName}
                </p>
                <p>{text('line1')}</p>
                {text('line2') ? <p>{text('line2')}</p> : null}
                <p>
                  {text('city') ?? '—'}
                  {order.shippingDepartment ? `, ${order.shippingDepartment}` : ''}
                </p>
                {text('reference') ? (
                  <p className="text-xs text-slate-500">Ref: {text('reference')}</p>
                ) : null}
                {text('phone') ? (
                  <p className="text-xs text-slate-500">Tel: {text('phone')}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <Truck className="h-4 w-4 text-slate-400" />
              <span>
                {order.shippingZone
                  ? `${order.shippingZone.department} · ${order.shippingZone.estimatedDays}`
                  : 'Zona no asignada'}
              </span>
            </div>
          </Panel>

          <Panel title="Resumen">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Artículos</dt>
                <dd className="font-medium text-slate-800">{order.items.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Unidades</dt>
                <dd className="font-medium text-slate-800">{totalItems}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Pago</dt>
                <dd className="font-medium text-slate-800">
                  {order.status === 'PAID' ||
                  order.status === 'SHIPPED' ||
                  order.status === 'DELIVERED'
                    ? 'Confirmado'
                    : 'Por confirmar'}
                </dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <dt className="text-slate-500">Total</dt>
                <dd className="text-base font-semibold text-slate-900">
                  {formatMoney(order.total, order.currency)}
                </dd>
              </div>
            </dl>
          </Panel>

          <div className="text-center">
            <Link
              href="/admin/pedidos"
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              ← Volver a pedidos
            </Link>
          </div>
        </aside>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500 print:hidden">
        <StickyNote className="h-3.5 w-3.5" />
        El mensaje de WhatsApp se generó en el checkout y no se modifica al cambiar el
        estado.
      </div>
    </>
  );
}
