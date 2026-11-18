'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Palette,
  RefreshCw,
  Save,
  Settings,
} from 'lucide-react';
import {
  AdminApiError,
  getStoreConfig,
  updateStoreConfig,
} from '@/lib/admin-api';
import type { AdminStoreConfig, StoreConfigPayload } from '@/types/admin';
import { themes } from '@/config/store-theme';
import { useToast } from '@/components/admin/toast';
import {
  AdminButton,
  AdminLinkButton,
  Card,
  Field,
  Input,
  JsonEditor,
  LoadingBlock,
  PageHeader,
  Panel,
} from '@/components/admin/ui';

interface GeneralForm {
  storeName: string;
  tagline: string;
  domain: string;
  currency: string;
  locale: string;
  country: string;
  whatsappNumber: string;
  themeId: string;
}

const EMPTY: GeneralForm = {
  storeName: '',
  tagline: '',
  domain: '',
  currency: 'BOB',
  locale: 'es-BO',
  country: 'Bolivia',
  whatsappNumber: '',
  themeId: 'joyeria',
};

interface JsonState {
  navigation: string;
  footer: string;
  valueProps: string;
  homeLayout: string;
}

const EMPTY_JSON: JsonState = {
  navigation: '{\n  "groups": []\n}',
  footer: '{}',
  valueProps: '{\n  "items": []\n}',
  homeLayout: '[]',
};

export default function AdminStorePage() {
  const toast = useToast();
  const [config, setConfig] = useState<AdminStoreConfig | null>(null);
  const [form, setForm] = useState<GeneralForm>(EMPTY);
  const [json, setJson] = useState<JsonState>(EMPTY_JSON);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getStoreConfig()
      .then((data) => {
        if (!active) return;
        setConfig(data);
        setForm({
          storeName: data.storeName ?? '',
          tagline: data.tagline ?? '',
          domain: data.domain ?? '',
          currency: data.currency ?? 'BOB',
          locale: data.locale ?? 'es-BO',
          country: data.country ?? 'Bolivia',
          whatsappNumber: data.whatsappNumber ?? '',
          themeId: data.themeId ?? 'joyeria',
        });
        setJson({
          navigation: pretty(data.navigation),
          footer: pretty(data.footer),
          valueProps: pretty(data.valueProps),
          homeLayout: pretty(data.homeLayout),
        });
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof AdminApiError
              ? cause.message
              : 'No se pudo cargar la configuración',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  function patch<K extends keyof GeneralForm>(key: K, value: GeneralForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function patchJson<K extends keyof JsonState>(key: K, value: JsonState[K]) {
    setJson((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setFormError(null);
    if (!form.storeName.trim()) {
      setFormError('El nombre de la tienda es obligatorio.');
      return;
    }

    let navigation: Record<string, unknown>;
    let footer: Record<string, unknown>;
    let valueProps: Record<string, unknown> | unknown[];
    let homeLayout: unknown[];

    try {
      navigation = parseObject('Navegación', json.navigation);
      footer = parseObject('Footer', json.footer);
      valueProps = parseObjectOrArray('Sellos de confianza', json.valueProps);
      const layout = JSON.parse(json.homeLayout);
      if (!Array.isArray(layout)) throw new Error('El home debe ser un array JSON.');
      homeLayout = layout;
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'JSON inválido.');
      return;
    }

    const payload: StoreConfigPayload = {
      storeName: form.storeName.trim(),
      tagline: form.tagline.trim(),
      domain: form.domain.trim() || undefined,
      currency: form.currency.trim() || 'BOB',
      locale: form.locale.trim() || 'es-BO',
      country: form.country.trim() || 'Bolivia',
      whatsappNumber: form.whatsappNumber.replace(/[^\d]/g, ''),
      themeId: form.themeId,
      navigation,
      footer,
      valueProps,
      homeLayout,
    };

    setSaving(true);
    try {
      const updated = await updateStoreConfig(payload);
      setConfig(updated);
      toast.success('Configuración guardada');
    } catch (cause) {
      const message =
        cause instanceof AdminApiError
          ? cause.message
          : 'No se pudo guardar la configuración';
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Tienda y CMS" />
        <Card>
          <LoadingBlock label="Cargando configuración…" />
        </Card>
      </>
    );
  }

  if (error || !config) {
    return (
      <>
        <PageHeader title="Tienda y CMS" />
        <Card>
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <p className="text-sm text-slate-600">
              {error ?? 'No se pudo cargar la configuración.'}
            </p>
            <AdminButton variant="accent" onClick={() => setRefresh((value) => value + 1)}>
              Reintentar
            </AdminButton>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Tienda y CMS"
        description="Datos generales, tema visual y bloques JSON que alimentan el storefront."
        eyebrow="Configuración"
        actions={
          <>
            <AdminButton
              variant="secondary"
              icon={RefreshCw}
              onClick={() => setRefresh((value) => value + 1)}
            >
              Descartar cambios
            </AdminButton>
            <AdminButton variant="accent" icon={Save} loading={saving} onClick={save}>
              Guardar configuración
            </AdminButton>
          </>
        }
      />

      {formError ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {formError}
        </div>
      ) : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Panel
            title="Datos generales"
            description="Información que se muestra en la tienda y en el checkout."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre de la tienda" required>
                <Input
                  value={form.storeName}
                  onChange={(event) => patch('storeName', event.target.value)}
                  placeholder="Turquesa Joyería"
                />
              </Field>
              <Field label="Dominio" hint="Solo informativo.">
                <Input
                  value={form.domain}
                  onChange={(event) => patch('domain', event.target.value)}
                  placeholder="turquesa.bo"
                />
              </Field>
              <Field label="Tagline" className="sm:col-span-2">
                <Input
                  value={form.tagline}
                  onChange={(event) => patch('tagline', event.target.value)}
                  placeholder="Alta joyería de autor hecha a mano en Bolivia"
                />
              </Field>
              <Field
                label="WhatsApp de la tienda"
                hint="Formato internacional sin + ni espacios. Ej: 59171234567"
                className="sm:col-span-2"
              >
                <Input
                  value={form.whatsappNumber}
                  onChange={(event) => patch('whatsappNumber', event.target.value)}
                  placeholder="59171234567"
                  inputMode="numeric"
                />
              </Field>
              <Field label="Moneda">
                <Input
                  value={form.currency}
                  onChange={(event) => patch('currency', event.target.value)}
                  placeholder="BOB"
                />
              </Field>
              <Field label="Locale">
                <Input
                  value={form.locale}
                  onChange={(event) => patch('locale', event.target.value)}
                  placeholder="es-BO"
                />
              </Field>
              <Field label="País">
                <Input
                  value={form.country}
                  onChange={(event) => patch('country', event.target.value)}
                  placeholder="Bolivia"
                />
              </Field>
            </div>
          </Panel>

          <Panel
            title="Tema visual"
            description="Los tokens de cada tema cambian colores, tipografía y bordes sin tocar componentes."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {Object.values(themes).map((theme) => {
                const selected = form.themeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => patch('themeId', theme.id)}
                    className={`rounded-lg border p-3 text-left transition ${
                      selected
                        ? 'border-teal-500 bg-teal-50/40 ring-1 ring-teal-500'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800">
                        {theme.label}
                      </span>
                      {selected ? (
                        <Check className="h-4 w-4 text-teal-600" />
                      ) : (
                        <Palette className="h-4 w-4 text-slate-300" />
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">{theme.id}</p>
                    <div className="mt-2 flex gap-1">
                      {[
                        theme.colors.bg,
                        theme.colors.fg,
                        theme.colors.accent,
                        theme.colors.accentSoft,
                      ].map((color) => (
                        <span
                          key={color}
                          className="h-4 w-4 rounded-full border border-black/10"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              El tema se aplica al storefront desde <code className="rounded bg-slate-100 px-1 py-0.5">StoreConfig.themeId</code>.
              La variable <code className="rounded bg-slate-100 px-1 py-0.5">NEXT_PUBLIC_STORE_THEME</code> actúa como fallback.
            </p>
          </Panel>

          <Panel
            title="Navegación y mega menú"
            description="Estructura JSON del header. Cada grupo puede incluir columnas y una promo."
          >
            <JsonEditor
              label="navigation"
              value={json.navigation}
              onChange={(value) => patchJson('navigation', value)}
              rows={16}
              hint='Ej: { "groups": [{ "label": "Tienda", "href": "/coleccion/todo", "mega": { "columns": [{ "title": "Categorías", "links": [{ "label": "Anillos", "href": "/coleccion/anillos" }] }] } }], "announcement": "Envíos a todo el país" }'
            />
          </Panel>

          <Panel
            title="Footer"
            description="Columnas, redes sociales y texto legal del pie de página."
          >
            <JsonEditor
              label="footer"
              value={json.footer}
              onChange={(value) => patchJson('footer', value)}
              rows={12}
              hint='Ej: { "description": "Joyería de autor", "columns": [{ "title": "Ayuda", "links": [{ "label": "Envíos", "href": "/envios" }] }], "social": [{ "label": "Instagram", "href": "https://instagram.com" }] }'
            />
          </Panel>

          <Panel
            title="Sellos de confianza"
            description="Barra de propuestas de valor que aparece en el home."
          >
            <JsonEditor
              label="valueProps"
              value={json.valueProps}
              onChange={(value) => patchJson('valueProps', value)}
              rows={10}
              hint='Acepta un array o un objeto con "items". Ej: [{ "icon": "shield", "title": "Garantía", "description": "Certificado de autenticidad" }]'
            />
          </Panel>

          <Panel
            title="Bloques del home"
            description="Layout modular: hero, categorías, productos, storytelling, etc."
          >
            <JsonEditor
              label="homeLayout"
              value={json.homeLayout}
              onChange={(value) => patchJson('homeLayout', value)}
              rows={20}
              hint='Ej: [{ "type": "hero", "title": "Nueva colección", "media": { "type": "image", "src": "https://…" } }, { "type": "product-showcase", "title": "Destacados", "products": [] }]'
            />
          </Panel>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">
              Los cambios de CMS se reflejan tras la revalidación del storefront (60 s).
            </p>
            <AdminButton variant="accent" icon={Save} loading={saving} onClick={save}>
              Guardar configuración
            </AdminButton>
          </div>
        </div>

        <aside className="space-y-5">
          <Panel title="Vista de la tienda">
            <p className="text-sm leading-relaxed text-slate-600">
              Revisa cómo se ve la tienda con la configuración actual.
            </p>
            <AdminLinkButton
              href="/"
              variant="secondary"
              icon={ExternalLink}
              external
              className="mt-3 w-full"
            >
              Abrir storefront
            </AdminLinkButton>
          </Panel>

          <Panel title="Estado del CMS">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Tema</dt>
                <dd className="font-medium text-slate-800">
                  {themes[form.themeId]?.label ?? form.themeId}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Grupos de menú</dt>
                <dd className="font-medium text-slate-800">
                  {countNavigationGroups(json.navigation)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Bloques del home</dt>
                <dd className="font-medium text-slate-800">
                  {countArray(json.homeLayout)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">WhatsApp</dt>
                <dd className="font-medium text-slate-800">
                  {form.whatsappNumber ? 'Configurado' : 'Sin configurar'}
                </dd>
              </div>
            </dl>
          </Panel>

          <Card className="p-5">
            <h3 className="flex items-center gap-2 font-sans text-sm font-semibold text-slate-900">
              <Settings className="h-4 w-4 text-slate-400" />
              Consejos
            </h3>
            <ul className="mt-2 space-y-2 text-xs leading-relaxed text-slate-500">
              <li>• Usa el botón «Formatear JSON» antes de editar bloques grandes.</li>
              <li>• Las URLs de imágenes deben ser HTTPS públicas.</li>
              <li>• El número de WhatsApp se guarda sin «+» ni espacios.</li>
              <li>• El tema guardado en la base de datos tiene prioridad sobre la variable de entorno.</li>
            </ul>
          </Card>
        </aside>
      </div>
    </>
  );
}

function pretty(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseObject(label: string, text: string): Record<string, unknown> {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label}: se esperaba un objeto JSON.`);
  }
  return parsed as Record<string, unknown>;
}

function parseObjectOrArray(
  label: string,
  text: string,
): Record<string, unknown> | unknown[] {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`${label}: se esperaba un objeto o un array JSON.`);
  }
  return parsed as Record<string, unknown> | unknown[];
}

function countNavigationGroups(value: string): number {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed?.groups) ? parsed.groups.length : 0;
  } catch {
    return 0;
  }
}

function countArray(value: string): number {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}
