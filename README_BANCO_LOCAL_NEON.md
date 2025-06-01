# 🔄 Configuração de Bancos - Local vs Remoto

## 📋 Resumo
Sistema configurado para alternar facilmente entre:
- **🏠 Banco Local**: PostgreSQL localhost para desenvolvimento
- **☁️ Neon**: PostgreSQL na nuvem para produção
- **🚂 Railway**: PostgreSQL alternativo (disponível)

## 🚀 Scripts de Alternância

### Para Banco Local (Desenvolvimento)
```bash
./use-local-db.sh
```

### Para Neon (Produção)
```bash
./use-neon-db.sh
```

### Para Railway (Alternativo)
```bash
./use-railway-db.sh
```

## 📊 Status Atual
- ✅ Banco local: **54 produtos**, **15 usuários**
- ✅ Todas as tabelas criadas e populadas
- ✅ Esquema compatível com o código
- ✅ Usuário de teste: `teste@cliente.com` / `123456`

## 🔧 Correções Implementadas

### 1. Schema Corrigido
- `users.status` → `users.is_active`
- Todas as colunas necessárias existem no banco local
- Hash de senhas com bcrypt funcional

### 2. Configuração de Bancos
```env
# Local
DATABASE_URL=postgresql://postgres@localhost/mktplace_dev

# Neon
DATABASE_URL="postgresql://DB_USER:DB_PASSWORD@DB_HOST/DB_NAME?sslmode=require"

# Railway
DATABASE_URL="postgresql://DB_USER:DB_PASSWORD@DB_HOST:DB_PORT/DB_NAME"
```

## 🔄 Fluxo de Trabalho Recomendado

### Desenvolvimento Local
1. Execute: `./use-local-db.sh`
2. Inicie servidor: `cd apps/store && pnpm dev`
3. Acesse: `http://localhost:5173`

### Deploy para Produção
1. Execute: `./use-neon-db.sh`
2. Faça deploy para Cloudflare Pages
3. Verifique funcionamento

## 🐛 Resolução de Problemas

### Se houver erros de coluna:
1. Verifique qual banco está ativo: `cat .env`
2. Confirme estrutura das tabelas:
```sql
psql $DATABASE_URL -c "\d users"
psql $DATABASE_URL -c "\d products"
```

### Se login não funcionar:
1. Verifique usuário de teste:
```sql
psql $DATABASE_URL -c "SELECT email, is_active FROM users WHERE email = 'teste@cliente.com';"
```

## 📁 Arquivos Principais
- `.env` - Configuração ativa
- `.env.local` - Banco local
- `.env.backup_neon` - Neon
- `use-*-db.sh` - Scripts de alternância

## 🎯 Próximos Passos
1. **Desenvolvimento**: Use banco local sempre
2. **Testes**: Valide funcionalidades completas
3. **Produção**: Configure Neon no Cloudflare
4. **Backup**: Mantenha dados sincronizados quando necessário 