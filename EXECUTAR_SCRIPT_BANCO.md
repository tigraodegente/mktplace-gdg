# 🗃️ Executar Script do Banco - Corrigir Endereços

## 🔥 **Problema Atual**
```
Erro ao buscar endereços: PostgresError: column "name" does not exist
```

## ✅ **Solução**

A tabela `addresses` não existe no banco de dados. Vou criar ela agora.

### **1. Execute o Script SQL**

**Opção A - Via Terminal (Recomendado):**
```bash
# No diretório raiz do projeto
cd /Users/guga/apps/mktplace-gdg

# Executar o script
./scripts/run-create-addresses.sh
```

**Opção B - Manual via psql:**
```bash
# Conectar ao banco e executar o script
psql $DATABASE_URL -f scripts/create-addresses-table.sql
```

**Opção C - Copiar e colar no terminal do banco:**
```sql
-- Copie e execute este SQL no seu banco PostgreSQL:

CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  street VARCHAR(255) NOT NULL,
  number VARCHAR(50) NOT NULL,
  complement VARCHAR(255),
  neighborhood VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  label VARCHAR(50),
  type VARCHAR(20) NOT NULL DEFAULT 'shipping',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_type ON addresses(type);
CREATE INDEX IF NOT EXISTS idx_addresses_is_default ON addresses(is_default);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### **2. Verificar se Funcionou**

Depois de executar, acesse:
```
http://localhost:5173/checkout
```

Agora deve funcionar sem erro! ✨

## 🔧 **O que Foi Corrigido**

### **Endpoints Atualizados:**
- ✅ `/api/addresses` - Listagem de endereços
- ✅ `/api/addresses/[id]` - CRUD individual

### **Campos Padronizados:**
- ✅ `name` - Nome do destinatário  
- ✅ `street` - Logradouro
- ✅ `number` - Número
- ✅ `complement` - Complemento (opcional)
- ✅ `neighborhood` - Bairro 
- ✅ `city` - Cidade
- ✅ `state` - Estado (2 letras)
- ✅ `zip_code` - CEP (8 dígitos)
- ✅ `label` - Etiqueta (Casa, Trabalho, etc)
- ✅ `type` - Tipo (shipping, billing)
- ✅ `is_default` - Endereço padrão

### **Identidade Visual:**
- ✅ Resumo do pedido idêntico ao carrinho
- ✅ Avisos em azul neutro (não verde)  
- ✅ Componente `OrderSummary` reutilizável
- ✅ Design consistente em todo o fluxo

## 🎯 **Resultado Esperado**

Após executar o script:

1. **Sem erro de banco** ✅
2. **Checkout funcional** ✅  
3. **Sistema de endereços ativo** ✅
4. **Identidade visual unificada** ✅

Execute o script e me avise se funcionou! 🚀 