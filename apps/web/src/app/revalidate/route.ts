import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

const API_INTERNAL_URL =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

const ALLOWED_TAGS = new Set(['products', 'categories', 'store-config', 'shipping']);

/**
 * POST /revalidate
 * Invalida al instante las cachés del storefront tras un cambio en el panel.
 * Requiere el mismo Bearer token del admin, validado contra la API.
 */
export async function POST(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const session = await fetch(`${API_INTERNAL_URL.replace(/\/$/, '')}/api/admin/auth/me`, {
      headers: { Authorization: authorization },
      cache: 'no-store',
    });
    if (!session.ok) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
  } catch {
    return NextResponse.json(
      { message: 'No se pudo validar la sesión' },
      { status: 502 },
    );
  }

  const body = (await request.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = Array.isArray(body?.tags) ? body.tags : [];
  const validTags = tags.filter(
    (tag): tag is string => typeof tag === 'string' && ALLOWED_TAGS.has(tag),
  );

  for (const tag of validTags) revalidateTag(tag);

  // Invalida también el HTML cacheado de las rutas dinámicas del storefront.
  revalidatePath('/');
  revalidatePath('/coleccion/[slug]', 'page');
  revalidatePath('/producto/[slug]', 'page');

  return NextResponse.json({ revalidated: validTags });
}
