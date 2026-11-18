'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  FolderTree,
  Pencil,
  Plus,
  Trash2,
  Wand2,
} from 'lucide-react';
import {
  AdminApiError,
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '@/lib/admin-api';
import type { AdminCategory, CategoryPayload } from '@/types/admin';
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
  SearchInput,
  Select,
  Table,
  Td,
  Textarea,
  Th,
  Toggle,
} from '@/components/admin/ui';

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  parentId: string;
  position: string;
  isActive: boolean;
}

const EMPTY_FORM: CategoryForm = {
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  parentId: '',
  position: '0',
  isActive: true,
};

export default function AdminCategoriesPage() {
  const toast = useToast();
  const [items, setItems] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listCategories()
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof AdminApiError
              ? cause.message
              : 'No se pudieron cargar las categorías',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  const ordered = useMemo(() => buildTree(items), [items]);

  const filtered = useMemo(() => {
    if (!search.trim()) return ordered;
    const term = search.trim().toLowerCase();
    return ordered.filter(
      ({ category }) =>
        category.name.toLowerCase().includes(term) ||
        category.slug.toLowerCase().includes(term),
    );
  }, [ordered, search]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      position: String(items.length),
    });
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(category: AdminCategory) {
    setEditing(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      imageUrl: category.imageUrl ?? '',
      parentId: category.parentId ?? '',
      position: String(category.position ?? 0),
      isActive: category.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function patch<K extends keyof CategoryForm>(key: K, value: CategoryForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('El nombre de la categoría es obligatorio.');
      return;
    }

    const payload: CategoryPayload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      parentId: form.parentId || null,
      position: Number(form.position) || 0,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, payload);
        toast.success('Categoría actualizada');
      } else {
        await createCategory(payload);
        toast.success('Categoría creada');
      }
      setModalOpen(false);
      setRefresh((value) => value + 1);
    } catch (cause) {
      const message =
        cause instanceof AdminApiError ? cause.message : 'No se pudo guardar la categoría';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(category: AdminCategory) {
    setBusyId(category.id);
    try {
      const updated = await updateCategory(category.id, {
        isActive: !category.isActive,
      });
      setItems((current) =>
        current.map((item) =>
          item.id === category.id
            ? { ...item, isActive: updated.isActive }
            : item,
        ),
      );
      toast.success(updated.isActive ? 'Categoría activada' : 'Categoría desactivada');
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
      await deleteCategory(toDelete.id);
      toast.success('Categoría eliminada');
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

  const blockedParents = useMemo(() => {
    if (!editing) return new Set<string>();
    const set = new Set<string>([editing.id]);
    let added = true;
    while (added) {
      added = false;
      for (const item of items) {
        if (item.parentId && set.has(item.parentId) && !set.has(item.id)) {
          set.add(item.id);
          added = true;
        }
      }
    }
    return set;
  }, [editing, items]);

  return (
    <>
      <PageHeader
        title="Categorías"
        description="Organiza el catálogo en categorías y subcategorías. El orden se usa en el menú y los listados."
        actions={
          <AdminButton variant="accent" icon={Plus} onClick={openCreate}>
            Nueva categoría
          </AdminButton>
        }
      />

      <Card>
        <div className="border-b border-slate-100 p-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar categoría…"
            className="max-w-sm"
          />
        </div>

        {loading ? (
          <LoadingBlock label="Cargando categorías…" />
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="No se pudieron cargar las categorías"
            description={error}
            action={
              <AdminButton variant="accent" onClick={() => setRefresh((value) => value + 1)}>
                Reintentar
              </AdminButton>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FolderTree}
            title={search ? 'Sin resultados' : 'Aún no hay categorías'}
            description={
              search
                ? 'Prueba con otro término de búsqueda.'
                : 'Crea la primera categoría para organizar tus productos.'
            }
            action={
              !search ? (
                <AdminButton variant="accent" icon={Plus} onClick={openCreate}>
                  Crear categoría
                </AdminButton>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Categoría</Th>
                <Th>Padre</Th>
                <Th>Productos</Th>
                <Th>Posición</Th>
                <Th>Activa</Th>
                <Th className="text-right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ category, depth }) => (
                <tr key={category.id} className="hover:bg-slate-50/60">
                  <Td>
                    <div
                      className="flex items-center gap-3"
                      style={{ paddingLeft: depth * 20 }}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                        <FolderTree className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {category.name}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          /coleccion/{category.slug}
                          {category.description ? ` · ${category.description}` : ''}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-slate-600">
                    {category.parent?.name ?? '—'}
                  </Td>
                  <Td className="text-xs text-slate-600">
                    {category._count?.products ?? 0}
                    {category._count?.children ? (
                      <span className="text-slate-400">
                        {' '}· {category._count.children} subcat.
                      </span>
                    ) : null}
                  </Td>
                  <Td className="text-xs text-slate-500">{category.position}</Td>
                  <Td>
                    <Toggle
                      checked={category.isActive}
                      disabled={busyId === category.id}
                      onChange={() => toggleActive(category)}
                    />
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(category)}
                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setToDelete(category)}
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
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
        description="Las categorías inactivas no se muestran en la tienda."
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </AdminButton>
            <AdminButton variant="accent" loading={saving} onClick={save}>
              {editing ? 'Guardar cambios' : 'Crear categoría'}
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

          <Field label="Nombre" required>
            <Input
              value={form.name}
              onChange={(event) => patch('name', event.target.value)}
              placeholder="Anillos"
            />
          </Field>

          <Field label="Slug" hint="Se usa en la URL /coleccion/{slug}.">
            <div className="flex gap-2">
              <Input
                value={form.slug}
                onChange={(event) => patch('slug', event.target.value)}
                placeholder="anillos"
              />
              <AdminButton
                variant="secondary"
                icon={Wand2}
                onClick={() => patch('slug', slugify(form.name))}
              >
                Generar
              </AdminButton>
            </div>
          </Field>

          <Field label="Descripción">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(event) => patch('description', event.target.value)}
              placeholder="Piezas que celebran lo esencial…"
            />
          </Field>

          <Field label="Imagen (URL)">
            <Input
              value={form.imageUrl}
              onChange={(event) => patch('imageUrl', event.target.value)}
              placeholder="https://…"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoría padre">
              <Select
                value={form.parentId}
                onChange={(event) => patch('parentId', event.target.value)}
              >
                <option value="">Sin padre (raíz)</option>
                {items
                  .filter((item) => !blockedParents.has(item.id))
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </Select>
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
            label="Categoría activa"
            description="Visible en el menú y la tienda."
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title={`Eliminar «${toDelete?.name ?? ''}»`}
        description={
          toDelete
            ? `Los productos (${toDelete._count?.products ?? 0}) quedarán sin categoría y las subcategorías (${toDelete._count?.children ?? 0}) pasarán a ser raíz.`
            : undefined
        }
        confirmLabel="Eliminar categoría"
      />
    </>
  );
}

function buildTree(items: AdminCategory[]) {
  const result: Array<{ category: AdminCategory; depth: number }> = [];
  const ids = new Set(items.map((item) => item.id));
  const children = new Map<string | null, AdminCategory[]>();

  for (const item of items) {
    const parent = item.parentId && ids.has(item.parentId) ? item.parentId : null;
    const list = children.get(parent) ?? [];
    list.push(item);
    children.set(parent, list);
  }
  for (const list of children.values()) {
    list.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  }

  const seen = new Set<string>();
  function visit(parent: string | null, depth: number) {
    for (const item of children.get(parent) ?? []) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      result.push({ category: item, depth });
      visit(item.id, depth + 1);
    }
  }
  visit(null, 0);
  for (const item of items) {
    if (!seen.has(item.id)) result.push({ category: item, depth: 0 });
  }
  return result;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
