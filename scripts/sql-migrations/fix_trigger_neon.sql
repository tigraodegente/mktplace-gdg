-- Corrigir trigger problemático no Neon com schema explícito
DROP TRIGGER IF EXISTS update_product_search_index ON public.products;
DROP FUNCTION IF EXISTS public.trigger_update_search_index();

-- Criar função dummy para permitir inserção
CREATE OR REPLACE FUNCTION public.trigger_update_search_index()
RETURNS TRIGGER AS $$
BEGIN
    -- Função vazia para permitir inserção sem erro de search_index
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger simples
CREATE TRIGGER update_product_search_index
    AFTER INSERT OR UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_search_index(); 