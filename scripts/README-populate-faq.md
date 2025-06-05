# 🌱 Popular Dados de FAQ - Grão de Gente

Este diretório contém scripts para popular o banco de dados com dados reais de FAQ para o marketplace Grão de Gente.

## 📊 Dados que serão inseridos:

- **6 Categorias FAQ**: Pedidos, Produtos, Pagamentos, Conta, Trocas, Técnico
- **20 Perguntas FAQ**: Perguntas e respostas detalhadas e realistas
- **6 Categorias de Suporte**: Para sistema de tickets
- **5 Feedbacks de exemplo**: Para demonstrar funcionalidade

## 🚀 Como usar:

### Opção 1: Script Node.js (Recomendado)
```bash
# Executar com URL padrão (localhost:5173)
node scripts/populate-faq.js

# Executar com URL customizada
node scripts/populate-faq.js https://store.graodegente.com
```

### Opção 2: Script Shell (curl)
```bash
# Dar permissão de execução (primeira vez)
chmod +x scripts/populate-faq.sh

# Executar com URL padrão
./scripts/populate-faq.sh

# Executar com URL customizada
./scripts/populate-faq.sh https://store.graodegente.com
```

### Opção 3: cURL direto
```bash
# Desenvolvimento
curl -X POST http://localhost:5173/api/admin/populate-faq \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "gdg-populate-2024"}'

# Produção
curl -X POST https://store.graodegente.com/api/admin/populate-faq \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "gdg-populate-2024"}'
```

## ⚠️ Importante:

1. **Backup**: Este script **apaga** dados existentes antes de inserir os novos
2. **Servidor**: Certifique-se de que o servidor está rodando
3. **Banco**: O banco de dados deve estar configurado e acessível
4. **Tabelas**: As tabelas `faq_categories`, `faq_items`, `faq_feedback` e `support_categories` devem existir

## ✅ Após executar:

1. Acesse `/atendimento` para ver a FAQ funcionando
2. Teste as funcionalidades:
   - Busca e filtros
   - Votação (helpful/not helpful)
   - Feedback qualitativo
   - FAQ relacionadas
   - Paginação

## 🔧 Resolução de problemas:

### Erro de conexão:
- Verifique se o servidor está rodando
- Confirme a URL (http/https, porta)
- Teste acessando a URL no navegador

### Erro de banco:
- Verifique as variáveis de ambiente do banco
- Confirme se as tabelas existem
- Execute as migrations se necessário

### Erro de permissão:
- Verifique se a chave administrativa está correta
- Em produção, considere usar autenticação mais robusta

## 📝 Exemplo de resposta de sucesso:
```json
{
  "success": true,
  "message": "Dados populados com sucesso!",
  "data": {
    "faq_categories": 6,
    "faq_items": 20,
    "support_categories": 6,
    "faq_feedbacks": 5
  }
}
``` 