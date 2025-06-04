-- Migration: Add videos field to products table
-- Date: 2024-12-20
-- Description: Add videos column to store video URLs for products

-- Add videos column to products table
ALTER TABLE products 
ADD COLUMN videos jsonb DEFAULT '[]'::jsonb;

-- Add comment to document the column
COMMENT ON COLUMN products.videos IS 'Array of video URLs for product media';

-- Update existing products to have empty videos array if null
UPDATE products 
SET videos = '[]'::jsonb 
WHERE videos IS NULL; 