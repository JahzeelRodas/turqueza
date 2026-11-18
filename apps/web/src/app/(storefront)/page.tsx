import type { ValueProp } from '@/types/store';
import { getProducts, getStoreConfig } from '@/lib/api';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';

export const revalidate = 60;

export default async function HomePage() {
  const [config, products] = await Promise.all([
    getStoreConfig(),
    getProducts({ featured: true, take: 8 }),
  ]);

  const valueProps: ValueProp[] = Array.isArray(config.valueProps)
    ? config.valueProps
    : (config.valueProps?.items ?? []);

  return (
    <BlockRenderer
      blocks={config.homeLayout}
      products={products}
      valueProps={valueProps}
    />
  );
}
