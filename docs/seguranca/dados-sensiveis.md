# Tratamento de Dados Sensíveis

## ⚠️ NUNCA COMMIT
- Credenciais de banco de dados
- Tokens de API
- Chaves secretas
- Cookies com tokens
- URLs com senhas
- Arquivos .env com dados reais

## ✅ SEMPRE USE
- Variáveis de ambiente
- Arquivos .env.example
- Placeholders genéricos
- Sanitização de logs

## 🔍 VERIFICAÇÃO

### Antes de cada commit:
```bash
# Verificar credenciais expostas
git diff --cached | grep -i "password\|token\|secret\|key"

# Verificar URLs de banco
git diff --cached | grep "postgresql://"

# Verificar arquivos sensíveis
git status | grep -E "\.(env|log|session|token)$"
```

### Limpar historico (se necessário):
```bash
# Remover arquivo do histórico
git filter-branch --force --index-filter \
"git rm --cached --ignore-unmatch sensitive-file.txt" \
--prune-empty --tag-name-filter cat -- --all

# Forçar push
git push origin --force --all
```

## 📋 CHECKLIST DE SEGURANÇA

- [ ] .gitignore configurado
- [ ] Credenciais em variáveis de ambiente
- [ ] Logs sanitizados
- [ ] URLs parametrizadas
- [ ] Arquivos sensíveis removidos
- [ ] .env.example criado
- [ ] Documentação atualizada
