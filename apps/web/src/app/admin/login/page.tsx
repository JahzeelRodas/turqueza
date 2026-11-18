'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, Mail, ShieldCheck } from 'lucide-react';
import {
  AdminApiError,
  adminLogin,
  getAdminToken,
  isAdminTokenExpired,
  setAdminToken,
} from '@/lib/admin-api';
import { AdminButton, Field, Input } from '@/components/admin/ui';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setExpired(params.get('expired') === '1');
    const token = getAdminToken();
    if (token && !isAdminTokenExpired(token)) {
      router.replace('/admin');
    }
  }, [router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await adminLogin(email, password);
      setAdminToken(result.token);
      router.replace('/admin');
    } catch (cause) {
      setError(
        cause instanceof AdminApiError
          ? cause.message
          : 'No se pudo iniciar sesión. Inténtalo de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-slate-950 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500 font-serif text-xl font-semibold text-slate-950">
              T
            </span>
            <div>
              <p className="text-sm font-semibold tracking-wide text-white">Turquesa</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Plataforma e-commerce
              </p>
            </div>
          </div>
        </div>
        <div className="relative max-w-md">
          <h1 className="font-sans text-4xl font-semibold leading-tight tracking-tight text-white">
            Todo tu negocio,
            <br />
            en un solo panel.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Administra catálogo, inventario, pedidos, clientes, envíos y el contenido de
            tu tienda desde un único lugar.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-300">
            {[
              'Productos, variantes y grabado personalizado',
              'Pedidos y seguimiento por WhatsApp',
              'Stock, categorías y zonas de envío',
              'CMS de navegación, home y tema visual',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 shrink-0 text-teal-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-600">
          Acceso restringido · Solo personal autorizado
        </p>
      </div>

      <div className="flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 font-serif text-xl font-semibold text-teal-400">
              T
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Turquesa</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Panel de administración
              </p>
            </div>
          </div>

          <h2 className="font-sans text-2xl font-semibold tracking-tight text-slate-900">
            Iniciar sesión
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Ingresa con las credenciales de administrador.
          </p>

          {expired ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Tu sesión expiró. Vuelve a iniciar sesión para continuar.
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Correo electrónico" required>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="admin@turquesa.bo"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-9"
                />
              </div>
            </Field>

            <Field label="Contraseña" required>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-9"
                />
              </div>
            </Field>

            {error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            ) : null}

            <AdminButton
              type="submit"
              variant="accent"
              loading={loading}
              className="w-full"
            >
              Entrar al panel
              <ArrowRight className="h-4 w-4" />
            </AdminButton>
          </form>

          {process.env.NODE_ENV !== 'production' ? (
            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">
              <p className="font-medium text-slate-700">Credenciales de desarrollo</p>
              <p className="mt-1">
                admin@turquesa.bo · admin123
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Configura ADMIN_EMAIL, ADMIN_PASSWORD y ADMIN_JWT_SECRET en el .env.
              </p>
            </div>
          ) : null}

          <p className="mt-8 text-center text-[11px] text-slate-400">
            © {new Date().getFullYear()} Turquesa · Plataforma e-commerce
          </p>
        </div>
      </div>
    </div>
  );
}
