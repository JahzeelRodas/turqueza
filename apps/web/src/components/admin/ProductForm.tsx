'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import {
  AdminApiError,
  createProduct,
  deleteProduct,
  getProduct,
  listCategories,
  updateProduct,
} from '@/lib/admin-api';
import type {
  AdminCategory,
  AdminProduct,
  ProductPayload,
  ProductVariantPayload,
} from '@/types/admin';
import type { EngravingOption } from '@/types/store';
import { useToast } from '@/components/admin/toast';
import {
  AdminButton,
  AdminLinkButton,
  Card,
  ConfirmDialog,
  Field,
  Input,
  LoadingBlock,
  PageHeader,
  Panel,
  Select,
  Textarea,
  Toggle,
  formatMoney,
} from '@/components/admin/ui';

interface MetadataRow {
  key: string;
  value: string;
}

interface VariantRow {
  id?: string;
  sku: string;
  name: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  isActive: boolean;
  options: string;
}

interface FormState {
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  price: string;
  compareAtPrice: string;
  currency: string;
  categoryId: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  isFeatured: boolean;
  stock: string;
  tags: string;
  images: string[];
  badges: string;
  hasSizeGuide: boolean;
  engravingEnabled: boolean;
  engravingPrice: string;
  engravingMaxChars: string;
  fonts: EngravingOption[];
  placements: EngravingOption[];
  metadata: MetadataRow[];
  variants: VariantRow[];
}

const EMPTY: FormState = {
  name: '',
  slug: '',
  subtitle: '',
  description: '',
  price: '',
  compareAtPrice: '',
  currency: 'BOB',
  categoryId: '',
  status: 'DRAFT',
  isFeatured: false,
  stock: '0',
  tags: '',
  images: [''],
  badges: '',
  hasSizeGuide: false,
  engravingEnabled: false,
  engravingPrice: '',
  engravingMaxChars: '18',
  fonts: [
    { id: 'serif', label: 'Clásica' },
    { id: 'sans', label: 'Moderna' },
  ],
  placements: [
    { id: 'interior', label: 'Interior' },
    { id: 'exterior', label: 'Exterior' },
  ],
  metadata: [{ key: '', value: '' }],
  variants: [],
};

export function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [extraAttributes, setExtraAttributes] = useState<Record<string, unknown>>({});
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [original, setOriginal] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);

    Promise.all([
      listCategories(),
      productId ? getProduct(productId) : Promise.resolve(null),
    ])
      .then(([categoryList, product]) => {
        if (!active) return;
        setCategories(categoryList);
        if (product) {
          setOriginal(product);
          setForm(fromProduct(product));
          const attributes = (product.attributes ?? {}) as Record<string, unknown>;
          const { badges: _badges, hasSizeGuide: _hasSizeGuide, ...extra } = attributes;
          setExtraAttributes(extra);
        } else {
          setExtraAttributes({});
        }
      })
      .catch((cause) => {
        if (!active) return;
        setLoadError(
          cause instanceof AdminApiError
            ? cause.message
            : 'No se pudo cargar el producto',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId]);

  const previewImage = form.images.find(Boolean) ?? original?.images?.[0] ?? null;
  const totalStock = useMemo(() => {
    const active = form.variants.filter((variant) => variant.isActive);
    if (active.length > 0) {
      return active.reduce((acc, variant) => acc + numberOrZero(variant.stock), 0);
    }
    return numberOrZero(form.stock);
  }, [form.variants, form.stock]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateVariant(index: number, changes: Partial<VariantRow>) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, i) =>
        i === index ? { ...variant, ...changes } : variant,
      ),
    }));
  }

  function addVariant() {
    setForm((current) => ({
      ...current,
      variants: [
        ...current.variants,
        {
          sku: '',
          name: current.name ? `${current.name} · ` : '',
          price: '',
          compareAtPrice: '',
          stock: '0',
          isActive: true,
          options: '',
        },
      ],
    }));
  }

  function removeVariant(index: number) {
    setForm((current) => ({
      ...current,
      variants: current.variants.filter((_, i) => i !== index),
    }));
  }

  async function save() {
    setError(null);
    const name = form.name.trim();
    if (!name) {
      setError('El nombre del producto es obligatorio.');
      return;
    }
    const price = parseBs(form.price);
    if (price === null || price < 0) {
      setError('Ingresa un precio válido en bolivianos.');
      return;
    }
    for (const variant of form.variants) {
      if (!variant.sku.trim() || !variant.name.trim()) {
        setError('Cada variante necesita SKU y nombre.');
        return;
      }
    }

    const payload = buildPayload(form, extraAttributes, price);
    setSaving(true);
    try {
      if (productId) {
        const updated = await updateProduct(productId, payload);
        setOriginal(updated);
        setForm(fromProduct(updated));
        toast.success('Producto guardado');
      } else {
        const created = await createProduct(payload);
        toast.success('Producto creado');
        router.replace(`/admin/productos/${created.id}`);
      }
    } catch (cause) {
      const message =
        cause instanceof AdminApiError ? cause.message : 'No se pudo guardar el producto';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!productId) return;
    setDeleting(true);
    try {
      await deleteProduct(productId);
      toast.success('Producto eliminado');
      router.push('/admin/productos');
    } catch (cause) {
      toast.error(
        cause instanceof AdminApiError ? cause.message : 'No se pudo eliminar',
      );
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title={productId ? 'Editar producto' : 'Nuevo producto'} />
        <Card>
          <LoadingBlock label="Cargando producto…" />
        </Card>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <PageHeader title="Producto" />
        <Card>
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <p className="text-sm text-slate-600">{loadError}</p>
            <AdminLinkButton href="/admin/productos" variant="secondary" icon={ArrowLeft}>
              Volver a productos
            </AdminLinkButton>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={productId ? 'Editar producto' : 'Nuevo producto'}
        description={
          productId
            ? 'Actualiza la información, variantes y configuración del producto.'
            : 'Completa la ficha para agregar una nueva pieza al catálogo.'
        }
        actions={
          <>
            <AdminLinkButton href="/admin/productos" variant="secondary" icon={ArrowLeft}>
              Cancelar
            </AdminLinkButton>
            {original?.status === 'ACTIVE' && original.slug ? (
              <AdminLinkButton
                href={`/producto/${original.slug}`}
                variant="secondary"
                icon={ExternalLink}
                external
              >
                Ver en tienda
              </AdminLinkButton>
            ) : null}
            <AdminButton variant="accent" icon={Save} loading={saving} onClick={save}>
              Guardar producto
            </AdminButton>
          </>
        }
      />

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <Panel
            title="Información general"
            description="Nombre, descripción y dirección pública del producto."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" required className="sm:col-span-2">
                <Input
                  value={form.name}
                  onChange={(event) => patch('name', event.target.value)}
                  placeholder="Anillo Solitario Aurora"
                />
              </Field>

              <Field
                label="Slug (URL)"
                hint="Si lo dejas vacío se genera automáticamente."
                className="sm:col-span-2"
              >
                <div className="flex gap-2">
                  <Input
                    value={form.slug}
                    onChange={(event) => patch('slug', event.target.value)}
                    placeholder="anillo-solitario-aurora"
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

              <Field label="Subtítulo" className="sm:col-span-2">
                <Input
                  value={form.subtitle}
                  onChange={(event) => patch('subtitle', event.target.value)}
                  placeholder="Oro blanco 18k · Turquesa natural"
                />
              </Field>

              <Field label="Descripción" className="sm:col-span-2">
                <Textarea
                  value={form.description}
                  onChange={(event) => patch('description', event.target.value)}
                  rows={5}
                  placeholder="Describe los materiales, el proceso y los detalles de la pieza…"
                />
              </Field>

              <Field
                label="Etiquetas"
                hint="Separadas por comas. Se usan para búsquedas internas."
                className="sm:col-span-2"
              >
                <Input
                  value={form.tags}
                  onChange={(event) => patch('tags', event.target.value)}
                  placeholder="oro, anillo, turquesa"
                />
              </Field>
            </div>
          </Panel>

          <Panel
            title="Precios e inventario"
            description="Los precios se guardan en céntimos; aquí se editan en bolivianos. Para ofertas masivas usa el botón «Ofertas» en el listado de productos."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Precio (Bs)" required>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => patch('price', event.target.value)}
                  placeholder="1290.00"
                />
              </Field>
              <Field label="Precio comparativo (Bs)" hint="Precio tachado para ofertas.">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.compareAtPrice}
                  onChange={(event) => patch('compareAtPrice', event.target.value)}
                  placeholder="1490.00"
                />
              </Field>
              <Field label="Stock general" hint="Se usa si el producto no tiene variantes.">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(event) => patch('stock', event.target.value)}
                />
              </Field>
              <Field label="Moneda">
                <Select
                  value={form.currency}
                  onChange={(event) => patch('currency', event.target.value)}
                >
                  <option value="BOB">BOB · Boliviano</option>
                  <option value="USD">USD · Dólar</option>
                </Select>
              </Field>
            </div>
          </Panel>

          <Panel
            title="Imágenes"
            description="Agrega URLs de imágenes (Unsplash, Cloudinary o tu CDN). La primera es la principal."
            actions={
              <AdminButton
                size="sm"
                variant="secondary"
                icon={Plus}
                onClick={() => patch('images', [...form.images, ''])}
              >
                Agregar imagen
              </AdminButton>
            }
          >
            <div className="space-y-2">
              {form.images.map((image, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-slate-300">
                        <ImageIcon className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <Input
                    value={image}
                    onChange={(event) =>
                      patch(
                        'images',
                        form.images.map((item, i) =>
                          i === index ? event.target.value : item,
                        ),
                      )
                    }
                    placeholder="https://…"
                  />
                  <AdminButton
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      patch(
                        'images',
                        form.images.filter((_, i) => i !== index).length > 0
                          ? form.images.filter((_, i) => i !== index)
                          : [''],
                      )
                    }
                    aria-label="Quitar imagen"
                  >
                    <X className="h-4 w-4" />
                  </AdminButton>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Variantes"
            description="SKUs con stock y precio propio. Si existen variantes, el checkout usa su stock."
            actions={
              <AdminButton size="sm" variant="secondary" icon={Plus} onClick={addVariant}>
                Agregar variante
              </AdminButton>
            }
          >
            {form.variants.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center">
                <Layers className="mx-auto h-6 w-6 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">
                  Sin variantes: se usará el stock general del producto.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {form.variants.map((variant, index) => (
                  <div
                    key={variant.id ?? index}
                    className="rounded-lg border border-slate-200 bg-slate-50/50 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">
                        Variante {index + 1}
                        {variant.id ? (
                          <span className="ml-2 font-normal text-slate-400">existente</span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Eliminar variante"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <Field label="SKU">
                        <Input
                          value={variant.sku}
                          onChange={(event) =>
                            updateVariant(index, { sku: event.target.value })
                          }
                          placeholder="AUR-AN50"
                        />
                      </Field>
                      <Field label="Nombre">
                        <Input
                          value={variant.name}
                          onChange={(event) =>
                            updateVariant(index, { name: event.target.value })
                          }
                          placeholder="Anillo Aurora · 50"
                        />
                      </Field>
                      <Field label="Precio (Bs)" hint="Vacío = precio base">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={variant.price}
                          onChange={(event) =>
                            updateVariant(index, { price: event.target.value })
                          }
                        />
                      </Field>
                      <Field label="Precio antes (Bs)" hint="Original para ofertas">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={variant.compareAtPrice}
                          onChange={(event) =>
                            updateVariant(index, { compareAtPrice: event.target.value })
                          }
                        />
                      </Field>
                      <Field label="Stock">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={variant.stock}
                          onChange={(event) =>
                            updateVariant(index, { stock: event.target.value })
                          }
                        />
                      </Field>
                      <Field
                        label="Opciones"
                        hint="p. ej. talla:52, color:Oro"
                        className="sm:col-span-2 lg:col-span-3"
                      >
                        <Input
                          value={variant.options}
                          onChange={(event) =>
                            updateVariant(index, { options: event.target.value })
                          }
                          placeholder="talla:52"
                        />
                      </Field>
                      <div className="flex items-end pb-1">
                        <Toggle
                          checked={variant.isActive}
                          onChange={(checked) => updateVariant(index, { isActive: checked })}
                          label="Activa"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="Atributos y metadata"
            description="Los atributos dinámicos se guardan como JSONB y son propios de cada rubro."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Badges / sellos" hint="Separados por comas. Ej: Nuevo, Hecho a mano">
                <Input
                  value={form.badges}
                  onChange={(event) => patch('badges', event.target.value)}
                  placeholder="Nuevo, Edición limitada"
                />
              </Field>
              <div className="flex items-end pb-1">
                <Toggle
                  checked={form.hasSizeGuide}
                  onChange={(checked) => patch('hasSizeGuide', checked)}
                  label="Mostrar guía de tallas"
                  description="Habilita el modal de tallas en la ficha."
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">
                  Atributos dinámicos (metadata)
                </span>
                <AdminButton
                  size="sm"
                  variant="ghost"
                  icon={Plus}
                  onClick={() => patch('metadata', [...form.metadata, { key: '', value: '' }])}
                >
                  Agregar
                </AdminButton>
              </div>
              <div className="space-y-2">
                {form.metadata.map((row, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={row.key}
                      onChange={(event) =>
                        patch(
                          'metadata',
                          form.metadata.map((item, i) =>
                            i === index ? { ...item, key: event.target.value } : item,
                          ),
                        )
                      }
                      placeholder="material"
                      className="sm:max-w-[200px]"
                    />
                    <Input
                      value={row.value}
                      onChange={(event) =>
                        patch(
                          'metadata',
                          form.metadata.map((item, i) =>
                            i === index ? { ...item, value: event.target.value } : item,
                          ),
                        )
                      }
                      placeholder="Oro blanco 18k"
                    />
                    <AdminButton
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        patch(
                          'metadata',
                          form.metadata.filter((_, i) => i !== index),
                        )
                      }
                      aria-label="Quitar atributo"
                    >
                      <X className="h-4 w-4" />
                    </AdminButton>
                  </div>
                ))}
                {form.metadata.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Sin atributos. Agrega material, piedra, medidas, etc.
                  </p>
                ) : null}
              </div>
            </div>
          </Panel>

          <Panel
            title="Grabado láser"
            description="Configura el asistente de personalización que aparece en la ficha."
            actions={
              <Toggle
                checked={form.engravingEnabled}
                onChange={(checked) => {
                  patch('engravingEnabled', checked);
                  if (checked) {
                    if (form.fonts.length === 0) {
                      patch('fonts', [{ id: 'serif', label: 'Clásica' }]);
                    }
                    if (form.placements.length === 0) {
                      patch('placements', [{ id: 'interior', label: 'Interior' }]);
                    }
                  }
                }}
                label="Habilitado"
              />
            }
          >
            {!form.engravingEnabled ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                El grabado está desactivado para este producto.
              </p>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Sobrecosto (Bs)">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.engravingPrice}
                      onChange={(event) => patch('engravingPrice', event.target.value)}
                      placeholder="50.00"
                    />
                  </Field>
                  <Field label="Máximo de caracteres">
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={form.engravingMaxChars}
                      onChange={(event) => patch('engravingMaxChars', event.target.value)}
                    />
                  </Field>
                </div>

                <OptionList
                  title="Tipografías"
                  hint="ID interno + nombre visible."
                  items={form.fonts}
                  onChange={(items) => patch('fonts', items)}
                  placeholderId="serif"
                  placeholderLabel="Clásica"
                />
                <OptionList
                  title="Ubicaciones"
                  hint="ID interno + nombre visible."
                  items={form.placements}
                  onChange={(items) => patch('placements', items)}
                  placeholderId="interior"
                  placeholderLabel="Interior"
                />
              </div>
            )}
          </Panel>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">
              Los cambios se aplican a la tienda al guardar.
            </p>
            <div className="flex items-center gap-2">
              <AdminLinkButton href="/admin/productos" variant="secondary">
                Cancelar
              </AdminLinkButton>
              <AdminButton variant="accent" icon={Save} loading={saving} onClick={save}>
                Guardar producto
              </AdminButton>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <Panel title="Publicación">
            <div className="space-y-4">
              <Field label="Estado">
                <Select
                  value={form.status}
                  onChange={(event) =>
                    patch('status', event.target.value as FormState['status'])
                  }
                >
                  <option value="DRAFT">Borrador</option>
                  <option value="ACTIVE">Publicado</option>
                  <option value="ARCHIVED">Archivado</option>
                </Select>
              </Field>
              <Field label="Categoría">
                <Select
                  value={form.categoryId}
                  onChange={(event) => patch('categoryId', event.target.value)}
                >
                  <option value="">Sin categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.parent ? `${category.parent.name} / ` : ''}
                      {category.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Toggle
                checked={form.isFeatured}
                onChange={(checked) => patch('isFeatured', checked)}
                label="Producto destacado"
                description="Aparece en el home y en los listados destacados."
              />
            </div>
          </Panel>

          <Panel title="Vista previa">
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="aspect-[4/3] bg-slate-100">
                {previewImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewImage}
                    alt={form.name || 'Producto'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-300">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium text-slate-800">
                  {form.name || 'Nombre del producto'}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {form.subtitle || 'Subtítulo del producto'}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {parseBs(form.price) !== null
                    ? formatMoney(parseBs(form.price) ?? 0, form.currency)
                    : 'Bs 0,00'}
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{totalStock} unidades</span>
                  <span>{form.variants.length} variantes</span>
                </div>
              </div>
            </div>
            <p className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Los badges, el grabado y la guía de tallas se reflejan en la ficha pública.
            </p>
          </Panel>

          <Panel title="Resumen">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Variantes</dt>
                <dd className="font-medium text-slate-800">{form.variants.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Stock total</dt>
                <dd className="font-medium text-slate-800">{totalStock} u.</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Grabado</dt>
                <dd className="font-medium text-slate-800">
                  {form.engravingEnabled ? 'Disponible' : 'No'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Imágenes</dt>
                <dd className="font-medium text-slate-800">
                  {form.images.filter(Boolean).length}
                </dd>
              </div>
            </dl>
          </Panel>

          {productId ? (
            <Card className="border-rose-200 p-5">
              <h3 className="font-sans text-sm font-semibold text-rose-700">
                Zona de riesgo
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Elimina el producto del catálogo. Los pedidos históricos conservan su
                snapshot.
              </p>
              <AdminButton
                variant="danger"
                size="sm"
                icon={Trash2}
                className="mt-3"
                onClick={() => setConfirmDelete(true)}
              >
                Eliminar producto
              </AdminButton>
            </Card>
          ) : null}

          <div className="text-center">
            <Link
              href="/admin/productos"
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              ← Volver al listado
            </Link>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        loading={deleting}
        title={`Eliminar «${form.name}»`}
        description="El producto y sus variantes se eliminarán del catálogo."
        confirmLabel="Eliminar definitivamente"
      />
    </>
  );
}

/* ── Subcomponente para listas tipografía/ubicación ─────────────────────── */

function OptionList({
  title,
  hint,
  items,
  onChange,
  placeholderId,
  placeholderLabel,
}: {
  title: string;
  hint: string;
  items: EngravingOption[];
  onChange: (items: EngravingOption[]) => void;
  placeholderId: string;
  placeholderLabel: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-700">{title}</p>
          <p className="text-[11px] text-slate-500">{hint}</p>
        </div>
        <AdminButton
          size="sm"
          variant="ghost"
          icon={Plus}
          onClick={() => onChange([...items, { id: '', label: '' }])}
        >
          Agregar
        </AdminButton>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={item.id}
              onChange={(event) =>
                onChange(
                  items.map((current, i) =>
                    i === index ? { ...current, id: event.target.value } : current,
                  ),
                )
              }
              placeholder={placeholderId}
              className="max-w-[160px]"
            />
            <Input
              value={item.label}
              onChange={(event) =>
                onChange(
                  items.map((current, i) =>
                    i === index ? { ...current, label: event.target.value } : current,
                  ),
                )
              }
              placeholder={placeholderLabel}
            />
            <AdminButton
              size="icon"
              variant="ghost"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              aria-label="Quitar opción"
            >
              <X className="h-4 w-4" />
            </AdminButton>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="text-xs text-slate-500">Sin opciones configuradas.</p>
        ) : null}
      </div>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function fromProduct(product: AdminProduct): FormState {
  const attributes = (product.attributes ?? {}) as Record<string, unknown>;
  const engraving = product.engraving;
  const metadata = Object.entries(product.metadata ?? {}).map(([key, value]) => ({
    key,
    value: typeof value === 'object' ? JSON.stringify(value) : String(value),
  }));

  return {
    name: product.name,
    slug: product.slug,
    subtitle: product.subtitle ?? '',
    description: product.description ?? '',
    price: centsToInput(product.price),
    compareAtPrice: product.compareAtPrice ? centsToInput(product.compareAtPrice) : '',
    currency: product.currency || 'BOB',
    categoryId: product.categoryId ?? '',
    status: product.status,
    isFeatured: product.isFeatured,
    stock: String(product.stock ?? 0),
    tags: (product.tags ?? []).join(', '),
    images: product.images?.length ? [...product.images] : [''],
    badges: Array.isArray(attributes.badges)
      ? (attributes.badges as string[]).join(', ')
      : '',
    hasSizeGuide: attributes.hasSizeGuide === true,
    engravingEnabled: Boolean(engraving?.enabled),
    engravingPrice: engraving ? centsToInput(engraving.price) : '',
    engravingMaxChars: String(engraving?.maxChars ?? 18),
    fonts: engraving?.fonts?.length
      ? engraving.fonts
      : [
          { id: 'serif', label: 'Clásica' },
          { id: 'sans', label: 'Moderna' },
        ],
    placements: engraving?.placements?.length
      ? engraving.placements
      : [
          { id: 'interior', label: 'Interior' },
          { id: 'exterior', label: 'Exterior' },
        ],
    metadata: metadata.length ? metadata : [{ key: '', value: '' }],
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      price: variant.price ? centsToInput(variant.price) : '',
      compareAtPrice: variant.compareAtPrice ? centsToInput(variant.compareAtPrice) : '',
      stock: String(variant.stock ?? 0),
      isActive: variant.isActive,
      options: Object.entries(variant.options ?? {})
        .map(([key, value]) => `${key}:${value}`)
        .join(', '),
    })),
  };
}

function buildPayload(
  form: FormState,
  extraAttributes: Record<string, unknown>,
  priceCents: number,
): ProductPayload {
  const attributes: Record<string, unknown> = {
    ...extraAttributes,
    badges: splitList(form.badges),
    hasSizeGuide: form.hasSizeGuide,
  };

  const metadata = Object.fromEntries(
    form.metadata
      .map((row) => [row.key.trim(), row.value.trim()] as const)
      .filter(([key]) => Boolean(key)),
  );

  const variants: ProductVariantPayload[] = form.variants.map((variant, index) => ({
    ...(variant.id ? { id: variant.id } : {}),
    sku: variant.sku.trim(),
    name: variant.name.trim(),
    price: parseBs(variant.price),
    compareAtPrice: parseBs(variant.compareAtPrice),
    stock: numberOrZero(variant.stock),
    isActive: variant.isActive,
    position: index,
    options: parseOptions(variant.options),
  }));

  return {
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    subtitle: form.subtitle.trim() || undefined,
    description: form.description.trim() || undefined,
    price: priceCents,
    compareAtPrice: parseBs(form.compareAtPrice),
    currency: form.currency,
    images: form.images.map((image) => image.trim()).filter(Boolean),
    categoryId: form.categoryId || null,
    status: form.status,
    isFeatured: form.isFeatured,
    stock: numberOrZero(form.stock),
    tags: splitList(form.tags),
    metadata,
    attributes,
    engraving: form.engravingEnabled
      ? {
          enabled: true,
          price: parseBs(form.engravingPrice) ?? 0,
          maxChars: Math.max(1, numberOrZero(form.engravingMaxChars) || 18),
          fonts: form.fonts.filter((font) => font.id.trim() && font.label.trim()),
          placements: form.placements.filter(
            (placement) => placement.id.trim() && placement.label.trim(),
          ),
        }
      : null,
    variants,
  };
}

function parseBs(value: string): number | null {
  if (!value.trim()) return null;
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

function centsToInput(cents: number): string {
  return String(Math.round(cents) / 100);
}

function numberOrZero(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseOptions(value: string): Record<string, string> {
  const options: Record<string, string> = {};
  for (const part of value.split(',')) {
    const [key, ...rest] = part.split(':');
    const optionKey = key?.trim();
    if (!optionKey) continue;
    options[optionKey] = rest.join(':').trim();
  }
  return options;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
