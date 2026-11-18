-- Precio original por variante para que las ofertas sean reversibles
-- y el porcentaje mostrado coincida con el de cada SKU.
ALTER TABLE "ProductVariant" ADD COLUMN "compareAtPrice" INTEGER;
