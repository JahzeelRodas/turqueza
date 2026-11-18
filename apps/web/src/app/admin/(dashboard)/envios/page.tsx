'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Truck,
} from 'lucide-react';
import {
  AdminApiError,
  createShippingZone,
  deleteShippingZone,
  listShippingZones,
  updateShippingZone,
} from '@/lib/admin-api';
import type { AdminShippingZone, ShippingZonePayload } from '@/types/admin';
import { useToast } from '@/components/admin/toast';
import {
  AdminButton,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Table,
  Td,
  Th,
  Toggle,
  formatMoney,
} from '@/components/admin/ui';

interface ZoneForm {
  code: string;
  department: string;
  cities: string;
  price: string;
  freeThreshold: string;
  estimatedDays: string;
  position: string;
  isActive: boolean;
}

const EMPTY: ZoneForm = {
  code: '',
  department: '',
  cities: '',
  price: '',
  freeThreshold: '',
  estimatedDays: '2-4 días hábiles',
  position: '0',
  isActive: true,
};

export default function AdminShippingPage() {
  const toast = useToast();
  const [items, setItems] = useState<AdminShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminShippingZone | null>(null);
  const [form, setForm] = useState<ZoneForm>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<AdminShippingZone | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listShippingZones()
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof AdminApiError
              ? cause.message
              : 'No se pudieron cargar las zonas de envío',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  function patch<K extends keyof ZoneForm>(key: K, value: ZoneForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, position: String(items.length + 1) });
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(zone: AdminShippingZone) {
    setEditing(zone);
    setForm({
      code: zone.code,
      department: zone.department,
      cities: zone.cities.join(', '),
      price: centsToInput(zone.price),
      freeThreshold:
        zone.freeThreshold !== null && zone.freeThreshold !== undefined
          ? centsToInput(zone.freeThreshold)
          : '',
      estimatedDays: zone.estimatedDays,
      position: String(zone.position ?? 0),
      isActive: zone.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function save() {
    setFormError(null);
    if (!form.code.trim() || !form.department.trim()) {
      setFormError('El código y el departamento son obligatorios.');
      return;
    }
    const price = parseBs(form.price);
    if (price === null) {
      setFormError('Ingresa un costo de envío válido.');
      return;
    }

    const payload: ShippingZonePayload = {
      code: form.code.trim().toUpperCase(),
      department: form.department.trim(),
      cities: form.cities
        .split(',')
        .map((city) => city.trim())
        .filter(Boolean),
      price,
      freeThreshold: parseBs(form.freeThreshold),
      estimatedDays: form.estimatedDays.trim() || '2-4 días hábiles',
      position: Number(form.position) || 0,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateShippingZone(editing.id, payload);
        toast.success('Zona actualizada');
      } else {
        await createShippingZone(payload);
        toast.success('Zona creada');
      }
      setModalOpen(false);
      setRefresh((value) => value + 1);
    } catch (cause) {
      setFormError(
        cause instanceof AdminApiError ? cause.message : 'No se pudo guardar la zona',
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(zone: AdminShippingZone) {
    setBusyId(zone.id);
    try {
      const updated = await updateShippingZone(zone.id, {
        isActive: !zone.isActive,
      });
      setItems((current) =>
        current.map((item) =>
          item.id === zone.id ? { ...item, isActive: updated.isActive } : item,
        ),
      );
      toast.success(updated.isActive ? 'Zona activada' : 'Zona desactivada');
    } catch (cause) {
      toast.error(
        cause instanceof AdminApiError ? cause.message : 'No se pudo actualizar',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteShippingZone(toDelete.id);
      toast.success('Zona de envío eliminada');
      setToDelete(null);
      setRefresh((value) => value + 1);
    } catch (cause) {
      toast.error(
        cause instanceof AdminApiError ? cause.message : 'No se pudo eliminar',
      );
    } finally {
      setDeleting(false);
    }
  }

  const activeCount = items.filter((zone) => zone.isActive).length;

  return (
    <>
      <PageHeader
        title="Envíos"
        description="Configura departamentos, ciudades, costos y umbrales de envío gratis para Bolivia."
        actions={
          <AdminButton variant="accent" icon={Plus} onClick={openCreate}>
            Nueva zona
          </AdminButton>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Zonas configuradas
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{items.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Zonas activas
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{activeCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Pedidos con zona
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {items.reduce((acc, zone) => acc + (zone._count?.orders ?? 0), 0)}
          </p>
        </Card>
      </div>

      <Card>
        {loading ? (
          <LoadingBlock label="Cargando zonas de envío…" />
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="No se pudieron cargar las zonas"
            description={error}
            action={
              <AdminButton variant="accent" onClick={() => setRefresh((value) => value + 1)}>
                Reintentar
              </AdminButton>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="Aún no hay zonas de envío"
            description="Crea departamentos con sus costos para habilitar el checkout nacional."
            action={
              <AdminButton variant="accent" icon={Plus} onClick={openCreate}>
                Crear zona
              </AdminButton>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Departamento</Th>
                <Th>Ciudades</Th>
                <Th>Costo</Th>
                <Th>Envío gratis</Th>
                <Th>Tiempo estimado</Th>
                <Th>Pedidos</Th>
                <Th>Activa</Th>
                <Th className="text-right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((zone) => (
                <tr key={zone.id} className="hover:bg-slate-50/60">
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-50 text-teal-700">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {zone.department}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400">{zone.code}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <p className="max-w-[220px] text-xs text-slate-600">
                      {zone.cities.length > 0 ? zone.cities.join(', ') : '—'}
                    </p>
                  </Td>
                  <Td className="whitespace-nowrap text-sm font-medium text-slate-800">
                    {formatMoney(zone.price)}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-slate-600">
                    {zone.freeThreshold !== null
                      ? `Desde ${formatMoney(zone.freeThreshold)}`
                      : 'No aplica'}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-slate-600">
                    {zone.estimatedDays}
                  </Td>
                  <Td className="text-xs text-slate-600">{zone._count?.orders ?? 0}</Td>
                  <Td>
                    <Toggle
                      checked={zone.isActive}
                      disabled={busyId === zone.id}
                      onChange={() => toggleActive(zone)}
                    />
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(zone)}
                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setToDelete(zone)}
                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar zona de envío' : 'Nueva zona de envío'}
        description="Los costos se expresan en bolivianos. Una zona inactiva no aparece en el checkout."
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </AdminButton>
            <AdminButton variant="accent" loading={saving} onClick={save}>
              {editing ? 'Guardar cambios' : 'Crear zona'}
            </AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          {formError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {formError}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-[110px_1fr]">
            <Field label="Código" required hint="Ej: LP">
              <Input
                value={form.code}
                onChange={(event) => patch('code', event.target.value.toUpperCase())}
                placeholder="LP"
                maxLength={10}
              />
            </Field>
            <Field label="Departamento" required>
              <Input
                value={form.department}
                onChange={(event) => patch('department', event.target.value)}
                placeholder="La Paz"
              />
            </Field>
          </div>

          <Field label="Ciudades" hint="Separadas por comas.">
            <Input
              value={form.cities}
              onChange={(event) => patch('cities', event.target.value)}
              placeholder="La Paz, El Alto, Viacha"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Costo de envío (Bs)" required>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => patch('price', event.target.value)}
                placeholder="25.00"
              />
            </Field>
            <Field
              label="Envío gratis desde (Bs)"
              hint="Vacío = sin envío gratis."
            >
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.freeThreshold}
                onChange={(event) => patch('freeThreshold', event.target.value)}
                placeholder="1500.00"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tiempo estimado">
              <Input
                value={form.estimatedDays}
                onChange={(event) => patch('estimatedDays', event.target.value)}
                placeholder="2-4 días hábiles"
              />
            </Field>
            <Field label="Posición" hint="Números menores aparecen primero.">
              <Input
                type="number"
                min="0"
                value={form.position}
                onChange={(event) => patch('position', event.target.value)}
              />
            </Field>
          </div>

          <Toggle
            checked={form.isActive}
            onChange={(checked) => patch('isActive', checked)}
            label="Zona activa"
            description="Disponible en el selector de envío del checkout."
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title={`Eliminar zona «${toDelete?.department ?? ''}»`}
        description={
          toDelete
            ? `Los pedidos existentes (${toDelete._count?.orders ?? 0}) conservarán su dirección, pero quedarán sin zona asociada.`
            : undefined
        }
        confirmLabel="Eliminar zona"
      />
    </>
  );
}

function parseBs(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

function centsToInput(cents: number): string {
  return String(Math.round(cents) / 100);
}
