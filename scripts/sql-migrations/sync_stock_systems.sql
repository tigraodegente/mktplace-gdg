-- =====================================================
-- SINCRONIZAÇÃO AUTOMÁTICA DE ESTOQUES
-- =====================================================
-- Criar triggers para sincronizar products.quantity com product_stocks

-- 1. FUNÇÃO PARA SINCRONIZAR ESTOQUE BÁSICO → AVANÇADO
-- Quando products.quantity muda, distribui para armazém padrão
CREATE OR REPLACE FUNCTION sync_basic_to_advanced_stock()
RETURNS TRIGGER AS $$
DECLARE
    default_warehouse_id UUID;
BEGIN
    -- Buscar armazém padrão
    SELECT id INTO default_warehouse_id 
    FROM warehouses 
    WHERE is_default = true 
    LIMIT 1;
    
    -- Se não tem armazém padrão, criar um
    IF default_warehouse_id IS NULL THEN
        INSERT INTO warehouses (name, code, is_default, is_active)
        VALUES ('Estoque Principal', 'MAIN', true, true)
        RETURNING id INTO default_warehouse_id;
    END IF;
    
    -- Inserir ou atualizar estoque no armazém padrão
    INSERT INTO product_stocks (product_id, warehouse_id, quantity)
    VALUES (NEW.id, default_warehouse_id, NEW.quantity)
    ON CONFLICT (product_id, warehouse_id) 
    DO UPDATE SET 
        quantity = NEW.quantity,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. FUNÇÃO PARA SINCRONIZAR ESTOQUE AVANÇADO → BÁSICO  
-- Quando product_stocks muda, soma todas as quantidades disponíveis
CREATE OR REPLACE FUNCTION sync_advanced_to_basic_stock()
RETURNS TRIGGER AS $$
DECLARE
    total_quantity INTEGER;
BEGIN
    -- Calcular total de estoque disponível em todos os armazéns
    SELECT COALESCE(SUM(available_quantity), 0) 
    INTO total_quantity
    FROM product_stocks 
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id);
    
    -- Atualizar estoque básico do produto
    UPDATE products 
    SET quantity = total_quantity,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 3. CRIAR TRIGGERS
DROP TRIGGER IF EXISTS trigger_sync_basic_to_advanced ON products;
CREATE TRIGGER trigger_sync_basic_to_advanced
    AFTER UPDATE OF quantity ON products
    FOR EACH ROW
    WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity)
    EXECUTE FUNCTION sync_basic_to_advanced_stock();

DROP TRIGGER IF EXISTS trigger_sync_advanced_to_basic_insert ON product_stocks;
CREATE TRIGGER trigger_sync_advanced_to_basic_insert
    AFTER INSERT ON product_stocks
    FOR EACH ROW
    EXECUTE FUNCTION sync_advanced_to_basic_stock();

DROP TRIGGER IF EXISTS trigger_sync_advanced_to_basic_update ON product_stocks;
CREATE TRIGGER trigger_sync_advanced_to_basic_update
    AFTER UPDATE OF quantity, reserved_quantity ON product_stocks
    FOR EACH ROW
    WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity OR OLD.reserved_quantity IS DISTINCT FROM NEW.reserved_quantity)
    EXECUTE FUNCTION sync_advanced_to_basic_stock();

DROP TRIGGER IF EXISTS trigger_sync_advanced_to_basic_delete ON product_stocks;
CREATE TRIGGER trigger_sync_advanced_to_basic_delete
    AFTER DELETE ON product_stocks
    FOR EACH ROW
    EXECUTE FUNCTION sync_advanced_to_basic_stock();

-- 4. SINCRONIZAÇÃO INICIAL (Migrar dados existentes)
-- Criar armazém padrão se não existir
INSERT INTO warehouses (name, code, is_default, is_active, type)
VALUES ('Estoque Principal', 'MAIN', true, true, 'main')
ON CONFLICT (code) DO NOTHING;

-- Migrar estoque básico existente para estoque avançado
INSERT INTO product_stocks (product_id, warehouse_id, quantity)
SELECT 
    p.id,
    w.id,
    p.quantity
FROM products p
CROSS JOIN warehouses w
WHERE w.code = 'MAIN'
  AND p.quantity > 0
  AND NOT EXISTS (
      SELECT 1 FROM product_stocks ps 
      WHERE ps.product_id = p.id AND ps.warehouse_id = w.id
  );

-- 5. VERIFICAÇÃO E RELATÓRIO
SELECT 
    'Produtos com estoque básico' as tipo,
    COUNT(*) as quantidade,
    SUM(quantity) as total_estoque
FROM products 
WHERE quantity > 0

UNION ALL

SELECT 
    'Produtos com estoque avançado' as tipo,
    COUNT(DISTINCT product_id) as quantidade,
    SUM(available_quantity) as total_estoque
FROM product_stocks

UNION ALL

SELECT 
    'Produtos dessincronizados' as tipo,
    COUNT(*) as quantidade,
    0 as total_estoque
FROM products p
WHERE EXISTS (
    SELECT 1 FROM product_stocks ps 
    WHERE ps.product_id = p.id 
    AND p.quantity != (
        SELECT COALESCE(SUM(ps2.available_quantity), 0) 
        FROM product_stocks ps2 
        WHERE ps2.product_id = p.id
    )
); 