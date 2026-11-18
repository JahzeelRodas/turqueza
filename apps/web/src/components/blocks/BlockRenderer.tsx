import type { Block, Product, ValueProp } from '@/types/store';
import { HeroSection } from './HeroSection';
import { ValuePropsBar } from './ValuePropsBar';
import { CategoryGrid } from './CategoryGrid';
import { ProductShowcase } from './ProductShowcase';
import { SplitContentBlock } from './SplitContentBlock';

/**
 * Renderiza el layout JSON de la tienda (bloques del CMS/DB).
 * Añadir un bloque nuevo = crear su componente y un caso aquí.
 */
export function BlockRenderer({
  blocks,
  products,
  valueProps,
}: {
  blocks: Block[];
  products: Product[];
  valueProps?: ValueProp[];
}) {
  return (
    <>
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        switch (block.type) {
          case 'hero':
            return <HeroSection key={key} block={block} />;
          case 'value-props':
            return <ValuePropsBar key={key} items={block.items ?? valueProps ?? []} />;
          case 'category-grid':
            return <CategoryGrid key={key} block={block} />;
          case 'product-showcase':
            return <ProductShowcase key={key} block={block} products={products} />;
          case 'storytelling':
            return <SplitContentBlock key={key} block={block} />;
          default:
            return null;
        }
      })}
    </>
  );
}
