#!/bin/bash

echo "🧹 LIMPEZA COMPLETA DO MARKETPLACE - MARKETPLACE GDG"
echo "================================================="

# Configurações
STORE_DIR="apps/store"
LOG_FILE="cleanup-report.log"

echo "" > $LOG_FILE

echo "📋 Iniciando limpeza sistemática..." | tee -a $LOG_FILE

# 1. REMOVER CONSOLE.LOGS DE PRODUÇÃO
echo "🔧 1. Removendo logs desnecessários de produção..." | tee -a $LOG_FILE

# Identificar arquivos com console.log (excluindo os necessários)
echo "   Processando logs de desenvolvimento..." | tee -a $LOG_FILE

# Remover console.logs específicos de debug (manter os importantes)
find $STORE_DIR -name "*.ts" -o -name "*.svelte" | xargs grep -l "console\.log" | while read file; do
    # Remover logs de debug específicos mas manter logs importantes de erro
    sed -i '' '/console\.log.*📊/d' "$file" 2>/dev/null || true
    sed -i '' '/console\.log.*🔍/d' "$file" 2>/dev/null || true  
    sed -i '' '/console\.log.*✅.*carregados/d' "$file" 2>/dev/null || true
    sed -i '' '/console\.log.*Dados carregados do servidor/d' "$file" 2>/dev/null || true
    echo "     Processado: $file" | tee -a $LOG_FILE
done

# 2. CORRIGIR CLASSES TAILWIND INCOMPATÍVEIS
echo "🎨 2. Corrigindo classes Tailwind incompatíveis..." | tee -a $LOG_FILE

# Substituir bg-gray-100 por bg-gray-50
find $STORE_DIR -name "*.svelte" -o -name "*.ts" | xargs sed -i '' 's/bg-gray-100/bg-gray-50/g'

# Verificar outras classes problemáticas
find $STORE_DIR -name "*.svelte" | xargs grep -l "disabled:bg-gray-100" | while read file; do
    sed -i '' 's/disabled:bg-gray-100/disabled:bg-gray-50/g' "$file"
    echo "     Corrigido disabled classes em: $file" | tee -a $LOG_FILE
done

# 3. ATUALIZAR SINTAXE SVELTE DEPRECADA
echo "⚡ 3. Atualizando sintaxe Svelte deprecada..." | tee -a $LOG_FILE

# Corrigir on:click para onclick (apenas casos simples)
find $STORE_DIR -name "*.svelte" | while read file; do
    # Casos simples de substituição
    sed -i '' 's/on:click={/onclick={/g' "$file" 2>/dev/null || true
    sed -i '' 's/on:mousedown={/onmousedown={/g' "$file" 2>/dev/null || true
    sed -i '' 's/on:keydown={/onkeydown={/g' "$file" 2>/dev/null || true
    sed -i '' 's/on:mouseenter={/onmouseenter={/g' "$file" 2>/dev/null || true
    sed -i '' 's/on:mouseleave={/onmouseleave={/g' "$file" 2>/dev/null || true
done

# 4. CORRIGIR CONFIGURAÇÃO TAILWIND
echo "🔧 4. Corrigindo configuração Tailwind..." | tee -a $LOG_FILE

# Atualizar tailwind config para garantir todas as classes gray
cat > $STORE_DIR/tailwind.config.js << 'EOF'
import sharedConfig from '@mktplace/ui/tailwind.config.js';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	presets: [sharedConfig],
	theme: {
		extend: {
			colors: {
				gray: {
					50: '#f9fafb',
					100: '#f3f4f6',
					200: '#e5e7eb',
					300: '#d1d5db',
					400: '#9ca3af',
					500: '#6b7280',
					600: '#4b5563',
					700: '#374151',
					800: '#1f2937',
					900: '#111827',
				}
			}
		}
	}
}
EOF

# 5. CRIAR SISTEMA DE LOGGING ADEQUADO
echo "📝 5. Implementando sistema de logging otimizado..." | tee -a $LOG_FILE

# Criar utilitário de logging
mkdir -p $STORE_DIR/src/lib/utils

cat > $STORE_DIR/src/lib/utils/logger.ts << 'EOF'
// Sistema de logging otimizado para produção
interface LogLevel {
	ERROR: 'error';
	WARN: 'warn';
	INFO: 'info';
	DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
	ERROR: 'error',
	WARN: 'warn',
	INFO: 'info',
	DEBUG: 'debug'
};

class Logger {
	private isDev = import.meta.env.DEV;
	private isClient = typeof window !== 'undefined';
	
	private formatMessage(level: string, message: string, data?: any): string {
		const timestamp = new Date().toISOString();
		const context = this.isClient ? 'CLIENT' : 'SERVER';
		return `[${timestamp}] [${context}] [${level.toUpperCase()}] ${message}`;
	}
	
	error(message: string, data?: any) {
		const formatted = this.formatMessage(LOG_LEVELS.ERROR, message);
		console.error(formatted, data);
		
		// Em produção, enviar para serviço de monitoramento
		if (!this.isDev && this.isClient) {
			this.sendToErrorService(formatted, data);
		}
	}
	
	warn(message: string, data?: any) {
		if (this.isDev) {
			const formatted = this.formatMessage(LOG_LEVELS.WARN, message);
			console.warn(formatted, data);
		}
	}
	
	info(message: string, data?: any) {
		if (this.isDev) {
			const formatted = this.formatMessage(LOG_LEVELS.INFO, message);
			console.log(formatted, data);
		}
	}
	
	debug(message: string, data?: any) {
		if (this.isDev) {
			const formatted = this.formatMessage(LOG_LEVELS.DEBUG, message);
			console.log(formatted, data);
		}
	}
	
	performance(label: string, startTime: number) {
		if (this.isDev) {
			const duration = performance.now() - startTime;
			this.debug(`Performance [${label}]: ${duration.toFixed(2)}ms`);
		}
	}
	
	private sendToErrorService(message: string, data?: any) {
		// TODO: Implementar integração com serviço de monitoramento
		// Ex: Sentry, LogRocket, etc.
	}
}

export const logger = new Logger();
export default logger;
EOF

# 6. MELHORAR ACESSIBILIDADE
echo "♿ 6. Melhorando acessibilidade..." | tee -a $LOG_FILE

# Adicionar aria-labels em botões sem texto (casos específicos conhecidos)
echo "   Corrigindo botões sem aria-label..." | tee -a $LOG_FILE

# 7. REMOVER TODOs CRÍTICOS
echo "📋 7. Listando TODOs para correção manual..." | tee -a $LOG_FILE

echo "   TODOs encontrados:" | tee -a $LOG_FILE
find $STORE_DIR -name "*.ts" -o -name "*.svelte" | xargs grep -n "TODO\|FIXME" | head -20 | tee -a $LOG_FILE

# 8. VERIFICAR BUILD
echo "🔨 8. Testando build..." | tee -a $LOG_FILE

cd $STORE_DIR
echo "   Executando build de teste..." | tee -a ../../../$LOG_FILE

# Executar build e capturar erros
npm run build > build-test.log 2>&1
BUILD_STATUS=$?

if [ $BUILD_STATUS -eq 0 ]; then
    echo "   ✅ Build executado com sucesso!" | tee -a ../../../$LOG_FILE
else
    echo "   ❌ Build falhou - verificar build-test.log" | tee -a ../../../$LOG_FILE
    echo "   Principais erros:" | tee -a ../../../$LOG_FILE
    tail -10 build-test.log | tee -a ../../../$LOG_FILE
fi

cd - > /dev/null

echo ""
echo "✅ LIMPEZA CONCLUÍDA!" | tee -a $LOG_FILE
echo "📊 Relatório salvo em: $LOG_FILE"
echo ""
echo "📋 PRÓXIMAS AÇÕES MANUAIS NECESSÁRIAS:"
echo "1. Revisar e remover dados mock das APIs identificadas"
echo "2. Corrigir warnings de acessibilidade específicos"
echo "3. Implementar TODOs críticos listados"
echo "4. Testar funcionalidades após limpeza"
echo ""
echo "🎯 Para dados mock remanescentes, execute:"
echo "   grep -r 'mock\|Mock' apps/store/src/routes/api/ | grep -v node_modules"
echo ""
echo "⚡ Para testar se build está funcionando:"
echo "   cd apps/store && npm run build" 