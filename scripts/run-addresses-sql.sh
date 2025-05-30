#!/bin/bash

# Script para criar tabela addresses no banco de dados
echo "🔄 Criando tabela addresses..."

# Verifica se as variáveis de ambiente estão definidas
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erro: DATABASE_URL não está definida"
    echo "Configure a variável de ambiente DATABASE_URL com a string de conexão do PostgreSQL"
    exit 1
fi

# Comando SQL para criar a tabela
SQL_COMMAND="
DROP TABLE IF EXISTS addresses;

CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
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

CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_type ON addresses(type);
CREATE INDEX idx_addresses_is_default ON addresses(is_default);
"

# Executa o comando SQL
if command -v psql >/dev/null 2>&1; then
    echo "$SQL_COMMAND" | psql "$DATABASE_URL"
    if [ $? -eq 0 ]; then
        echo "✅ Tabela addresses criada com sucesso!"
    else
        echo "❌ Erro ao criar tabela addresses"
        exit 1
    fi
else
    echo "❌ psql não encontrado. Instale o PostgreSQL client."
    echo "No macOS: brew install postgresql"
    echo "No Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi 