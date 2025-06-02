# Banco de Dados - Marketplace GDG

## Conteúdo do Export

- **banco_completo.sql**: Dump completo com schema + dados
- **schema_apenas.sql**: Apenas estrutura das tabelas
- **dados_apenas.sql**: Apenas dados (com informações sensíveis)
- **dados_essenciais.sql**: Dados sem informações sensíveis
- **usuarios_exemplo.sql**: Usuários de teste para desenvolvimento

## Como Importar

### 1. Criar banco local (PostgreSQL)
```bash
createdb marketplace_dev
```

### 2. Importar schema + dados essenciais
```bash
# Opção 1: Banco completo (com todos os dados)
psql marketplace_dev < banco_completo.sql

# Opção 2: Schema + dados essenciais (recomendado)
psql marketplace_dev < schema_apenas.sql
psql marketplace_dev < dados_essenciais.sql
psql marketplace_dev < usuarios_exemplo.sql
```

### 3. Configurar .env
```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/marketplace_dev
```

## Usuários de Teste

| Email | Senha | Role |
|-------|-------|------|
| admin@marketplace.com | 123456 | admin |
| vendedor@marketplace.com | 123456 | seller |
| cliente@marketplace.com | 123456 | customer |

## Estatísticas do Banco

Mon Jun  2 00:20:20 -03 2025

### Tabelas
     115 tabelas no total

### Registros
Ver arquivo: contagem_registros.txt

## Suporte

Em caso de dúvidas, consulte a documentação em /docs ou entre em contato.
