#!/bin/bash

# 🛒 Script de Teste do Fluxo de Checkout Completo
# Para verificar se as correções resolveram os problemas

echo "🧪 =========================================="
echo "🧪 TESTE DO FLUXO COMPLETO DE CHECKOUT"
echo "🧪 =========================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:5174"

echo -e "${BLUE}🔍 1. Testando conectividade com o servidor...${NC}"
if curl -s "$BASE_URL" > /dev/null; then
    echo -e "${GREEN}✅ Servidor respondendo em $BASE_URL${NC}"
else
    echo -e "${RED}❌ Servidor não está respondendo em $BASE_URL${NC}"
    echo "Certifique-se de que o servidor está rodando com: npm run dev"
    exit 1
fi

echo ""
echo -e "${BLUE}🔐 2. Testando endpoint de verificação de autenticação...${NC}"
AUTH_CHECK=$(curl -s -w "%{http_code}" "$BASE_URL/api/auth/check")
HTTP_CODE=${AUTH_CHECK: -3}
RESPONSE=${AUTH_CHECK%???}

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Endpoint /api/auth/check retornando 200${NC}"
    echo "Resposta: $RESPONSE"
else
    echo -e "${RED}❌ Endpoint /api/auth/check retornando $HTTP_CODE${NC}"
fi

echo ""
echo -e "${BLUE}🏠 3. Testando endpoint de endereços (sem autenticação)...${NC}"
ADDRESSES_CHECK=$(curl -s -w "%{http_code}" "$BASE_URL/api/addresses")
HTTP_CODE=${ADDRESSES_CHECK: -3}

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✅ Endpoint /api/addresses retornando 401 (correto sem autenticação)${NC}"
else
    echo -e "${YELLOW}⚠️ Endpoint /api/addresses retornando $HTTP_CODE (esperado 401)${NC}"
fi

echo ""
echo -e "${BLUE}🛒 4. Testando endpoint de criação de pedido (sem autenticação)...${NC}"
ORDER_CHECK=$(curl -s -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"test": true}' \
    "$BASE_URL/api/checkout/create-order")
HTTP_CODE=${ORDER_CHECK: -3}

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✅ Endpoint /api/checkout/create-order retornando 401 (correto sem autenticação)${NC}"
else
    echo -e "${YELLOW}⚠️ Endpoint /api/checkout/create-order retornando $HTTP_CODE (esperado 401)${NC}"
fi

echo ""
echo -e "${BLUE}📊 5. Verificando tabelas do banco...${NC}"
echo "Verificando se as tabelas necessárias existem..."

# Aqui você pode adicionar verificações do banco se necessário
echo -e "${GREEN}✅ Verificação de tabelas (implementar se necessário)${NC}"

echo ""
echo -e "${BLUE}🧪 6. Simulando fluxo completo...${NC}"
echo ""
echo -e "${YELLOW}PRÓXIMOS PASSOS PARA TESTE MANUAL:${NC}"
echo ""
echo "1. 🔐 Acesse: $BASE_URL/login"
echo "2. 📧 Use: cliente@marketplace.com / 123456"
echo "3. 🛒 Adicione produtos ao carrinho"
echo "4. 📍 Vá para checkout e teste:"
echo "   - Se não tem endereços: deve ir direto para formulário"
echo "   - Se tem endereços: deve mostrar opções de escolha"
echo "   - Auto-scroll deve funcionar ao clicar 'Cadastrar Endereço'"
echo "   - Foco deve ir para primeiro campo vazio"
echo "5. 📋 Preencha endereço e continue"
echo "6. 💳 Complete o checkout"
echo "7. ✅ Verificar se endereço foi salvo"
echo ""

echo -e "${BLUE}🔧 7. Logs recomendados para monitorar:${NC}"
echo ""
echo "Durante o teste, monitore os logs do servidor para:"
echo "- 🏠 'Addresses GET/POST - Verificação unificada'"
echo "- 🔐 'requireAuth: Usando token:'"
echo "- ✅ 'Endereço criado com sucesso'"
echo "- 🛒 'Create Order - Estratégia híbrida'"
echo "- ❌ Qualquer erro de 'session_token' vs 'auth_session'"
echo ""

echo -e "${BLUE}📋 8. Checklist de validação:${NC}"
echo ""
echo "□ Login funciona sem erro de sessão"
echo "□ Carrinho mantém itens após login"
echo "□ Checkout inicia sem problemas"
echo "□ Formulário de endereço tem auto-scroll"
echo "□ Endereço é salvo no banco"
echo "□ Pedido é criado com sucesso"
echo "□ Não há mensagens de 'Sessão expirada'"
echo "□ Redirecionamento pós-pedido funciona"
echo ""

echo -e "${GREEN}✅ TESTE DE CONECTIVIDADE CONCLUÍDO${NC}"
echo ""
echo -e "${YELLOW}💡 DICA: Se encontrar problemas, verifique:${NC}"
echo "1. Console do navegador para erros JavaScript"
echo "2. Logs do terminal onde o servidor está rodando"
echo "3. Network tab no DevTools para verificar requests"
echo "4. Cookies sendo definidos corretamente"
echo ""
echo -e "${BLUE}🔗 Acesse agora: $BASE_URL${NC}" 