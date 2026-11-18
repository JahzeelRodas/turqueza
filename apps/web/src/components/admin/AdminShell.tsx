'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Boxes,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminSession } from '@/types/admin';
import {
  clearAdminSession,
  getAdminSession,
  getAdminToken,
  isAdminTokenExpired,
} from '@/lib/admin-api';
import { ToastProvider } from './toast';

const NAV: Array<{
  group: string;
  items: Array<{ href: string; label: string; icon: LucideIcon; exact?: boolean }>;
}> = [
  {
    group: 'Resumen',
    items: [{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true }],
  },
  {
    group: 'Catálogo',
    items: [
      { href: '/admin/productos', label: 'Productos', icon: Package },
      { href: '/admin/categorias', label: 'Categorías', icon: FolderTree },
      { href: '/admin/inventario', label: 'Inventario', icon: Boxes },
    ],
  },
  {
    group: 'Ventas',
    items: [
      { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingCart },
      { href: '/admin/clientes', label: 'Clientes', icon: Users },
    ],
  },
  {
    group: 'Configuración',
    items: [
      { href: '/admin/envios', label: 'Envíos', icon: Truck },
      { href: '/admin/tienda', label: 'Tienda y CMS', icon: Settings },
    ],
  },
];

const TITLES: Array<{ match: RegExp; title: string }> = [
  { match: /^\/admin$/, title: 'Dashboard' },
  { match: /^\/admin\/productos\/nuevo/, title: 'Nuevo producto' },
  { match: /^\/admin\/productos\/[^/]+/, title: 'Editar producto' },
  { match: /^\/admin\/productos/, title: 'Productos' },
  { match: /^\/admin\/categorias/, title: 'Categorías' },
  { match: /^\/admin\/inventario/, title: 'Inventario' },
  { match: /^\/admin\/pedidos\/[^/]+/, title: 'Detalle del pedido' },
  { match: /^\/admin\/pedidos/, title: 'Pedidos' },
  { match: /^\/admin\/clientes/, title: 'Clientes' },
  { match: /^\/admin\/envios/, title: 'Envíos' },
  { match: /^\/admin\/tienda/, title: 'Tienda y CMS' },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = getAdminToken();
    if (!token || isAdminTokenExpired(token)) {
      clearAdminSession();
      router.replace('/admin/login');
      return;
    }
    getAdminSession()
      .then(({ admin }) => {
        setSession(admin);
        setReady(true);
      })
      .catch(() => {
        clearAdminSession();
        router.replace('/admin/login');
      });
  }, [router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function logout() {
    clearAdminSession();
    router.replace('/admin/login');
  }

  const title = TITLES.find((entry) => entry.match.test(pathname))?.title ?? 'Panel';

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <span className="flex h-11 w-11 animate-pulse items-center justify-center rounded-xl bg-slate-900 text-lg font-semibold text-white">
            T
          </span>
          <p className="text-sm">Verificando sesión…</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
        {mobileOpen ? (
          <button
            type="button"
            aria-label="Cerrar menú"
            className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}

        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-950 text-slate-300 transition-transform duration-200 lg:translate-x-0',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex items-center justify-between px-5 py-5">
            <Link href="/admin" className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 font-serif text-lg font-semibold text-slate-950">
                T
              </span>
              <span>
                <span className="block text-sm font-semibold tracking-wide text-white">
                  Turquesa
                </span>
                <span className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Panel admin
                </span>
              </span>
            </Link>
            <button
              type="button"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
            {NAV.map((section) => (
              <div key={section.group}>
                <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {section.group}
                </p>
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = item.exact
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
                            active
                              ? 'bg-slate-800 text-white'
                              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100',
                          )}
                        >
                          <item.icon
                            className={cn(
                              'h-4 w-4',
                              active ? 'text-teal-400' : 'text-slate-500',
                            )}
                          />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="border-t border-slate-800 p-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-slate-100"
            >
              <ExternalLink className="h-4 w-4 text-slate-500" />
              Ver tienda
            </a>
            <button
              type="button"
              onClick={logout}
              className="mt-0.5 flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-rose-300"
            >
              <LogOut className="h-4 w-4 text-slate-500" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        <div className="lg:pl-64">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-lg border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50 lg:hidden"
                aria-label="Abrir menú"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Administración
                </p>
                <h2 className="font-sans text-sm font-semibold text-slate-800">{title}</h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 sm:inline-flex"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Tienda
              </a>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold uppercase text-teal-800">
                  {session?.name?.charAt(0) ?? 'A'}
                </span>
                <div className="hidden leading-tight sm:block">
                  <p className="text-xs font-medium text-slate-800">{session?.name}</p>
                  <p className="text-[11px] text-slate-500">{session?.email}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
