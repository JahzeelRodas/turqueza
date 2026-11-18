import type { Metadata } from 'next';
import { ProductForm } from '@/components/admin/ProductForm';

export const metadata: Metadata = { title: 'Nuevo producto' };

export default function NewProductPage() {
  return <ProductForm />;
}
