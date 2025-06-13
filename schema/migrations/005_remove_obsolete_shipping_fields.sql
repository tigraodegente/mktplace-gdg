-- Migration: Remove obsolete shipping boolean fields from products table
-- Date: 2024-12-20
-- Description: Remove shipping_pac, shipping_sedex, shipping_carrier fields 
--              These should be handled by the shipping system instead

-- Remove obsolete shipping fields
ALTER TABLE products 
DROP COLUMN IF EXISTS shipping_pac,
DROP COLUMN IF EXISTS shipping_sedex,
DROP COLUMN IF EXISTS shipping_carrier;

-- Add comment documenting the change
COMMENT ON TABLE products IS 'Shipping methods now handled via shipping_carriers and product_shipping_methods tables'; 