-- Adicionar campo para busca normalizada
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_text TEXT;

-- Criar função para normalizar texto
CREATE OR REPLACE FUNCTION normalize_search_text(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(
        -- Remove acentos
        translate(
            input_text,
            'àáäâãèéëêìíïîòóöôõùúüûñçÀÁÄÂÃÈÉËÊÌÍÏÎÒÓÖÔÕÙÚÜÛÑÇ',
            'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Atualizar produtos existentes com texto normalizado
UPDATE products 
SET search_text = normalize_search_text(
    COALESCE(name, '') || ' ' || 
    COALESCE(description, '') || ' ' ||
    COALESCE(tags::text, '')
);

-- Criar índice para busca eficiente
CREATE INDEX IF NOT EXISTS idx_products_search_text ON products USING btree(search_text);

-- Criar trigger para manter o campo atualizado
CREATE OR REPLACE FUNCTION update_search_text()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_text := normalize_search_text(
        COALESCE(NEW.name, '') || ' ' || 
        COALESCE(NEW.description, '') || ' ' ||
        COALESCE(NEW.tags::text, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_search_text_trigger ON products;
CREATE TRIGGER products_search_text_trigger
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_search_text(); 