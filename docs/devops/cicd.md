# CI/CD Pipeline - Marketplace GDG

## Visão Geral

O pipeline de CI/CD do Marketplace GDG automatiza o processo de build, teste e deploy das aplicações, garantindo qualidade e agilidade nas entregas. Utilizamos GitHub Actions para automação e Cloudflare Pages para deploy.

## Estrutura do Pipeline

```mermaid
graph LR
    A[Push/PR] --> B[Lint & Format]
    B --> C[Type Check]
    C --> D[Unit Tests]
    D --> E[Integration Tests]
    E --> F[Build]
    F --> G{Branch?}
    G -->|main| H[Deploy Prod]
    G -->|develop| I[Deploy Staging]
    G -->|PR| J[Preview Deploy]
```

## Configuração GitHub Actions

### Workflow Principal

```yaml
# .github/workflows/main.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '18'
  PNPM_VERSION: '8'

jobs:
  # Job de análise de código
  lint-and-format:
    name: Lint & Format Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run ESLint
        run: pnpm run lint
      
      - name: Check formatting
        run: pnpm run format:check
      
      - name: Type check
        run: pnpm run typecheck

  # Job de testes
  test:
    name: Tests
    runs-on: ubuntu-latest
    needs: lint-and-format
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: marketplace_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run unit tests
        run: pnpm test:unit -- --coverage
      
      - name: Run integration tests
        run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/marketplace_test
          XATA_API_KEY: ${{ secrets.XATA_API_KEY_TEST }}
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/coverage-final.json

  # Job de E2E tests
  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'pull_request'
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps
      
      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          PLAYWRIGHT_BASE_URL: ${{ secrets.PREVIEW_URL }}
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  # Job de build
  build:
    name: Build Applications
    runs-on: ubuntu-latest
    needs: test
    strategy:
      matrix:
        app: [store, admin-panel, seller-panel]
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build ${{ matrix.app }}
        run: pnpm --filter ./apps/${{ matrix.app }} build
        env:
          PUBLIC_XATA_WORKSPACE_URL: ${{ secrets.XATA_WORKSPACE_URL }}
          PUBLIC_APP_URL: ${{ secrets[format('{0}_URL', matrix.app)] }}
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.app }}-build
          path: apps/${{ matrix.app }}/.svelte-kit/cloudflare
          retention-days: 7

  # Deploy para staging
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    strategy:
      matrix:
        app: [store, admin-panel, seller-panel]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: ${{ matrix.app }}-build
          path: .svelte-kit/cloudflare
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: ${{ matrix.app }}-staging
          directory: .svelte-kit/cloudflare
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
          branch: staging

  # Deploy para produção
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    strategy:
      matrix:
        app: [store, admin-panel, seller-panel]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: ${{ matrix.app }}-build
          path: .svelte-kit/cloudflare
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: ${{ matrix.app }}
          directory: .svelte-kit/cloudflare
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
          branch: main
      
      - name: Purge Cloudflare Cache
        run: |
          curl -X POST "https://api.cloudflare.com/client/v4/zones/${{ secrets.CLOUDFLARE_ZONE_ID }}/purge_cache" \
            -H "Authorization: Bearer ${{ secrets.CLOUDFLARE_API_TOKEN }}" \
            -H "Content-Type: application/json" \
            --data '{"purge_everything":true}'
```

### Workflow de Release

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    name: Create Release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Generate changelog
        id: changelog
        uses: conventional-changelog-action@v3
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body: ${{ steps.changelog.outputs.clean_changelog }}
          draft: false
          prerelease: false
```

### Workflow de Segurança

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  schedule:
    - cron: '0 0 * * 1' # Toda segunda-feira
  push:
    branches: [main, develop]

jobs:
  security:
    name: Security Scanning
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
      
      - name: Run CodeQL Analysis
        uses: github/codeql-action/analyze@v2
        with:
          languages: javascript, typescript
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

## Configuração de Ambientes

### Variáveis de Ambiente

```yaml
# GitHub Secrets necessários

# Comum a todos os ambientes
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
XATA_API_KEY
CODECOV_TOKEN
SNYK_TOKEN

# Por ambiente (staging/production)
XATA_WORKSPACE_URL
STORE_URL
ADMIN_PANEL_URL
SELLER_PANEL_URL
CLOUDFLARE_ZONE_ID

# Secrets de produção (environment: production)
JWT_SECRET
SESSION_SECRET
STRIPE_SECRET_KEY
RESEND_API_KEY
```

### Configuração do Cloudflare Pages

```toml
# apps/store/wrangler.toml
name = "marketplace-store"
compatibility_date = "2024-01-01"

[env.staging]
name = "marketplace-store-staging"
vars = { ENVIRONMENT = "staging" }

[env.production]
name = "marketplace-store"
vars = { ENVIRONMENT = "production" }

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"

[[r2_buckets]]
binding = "ASSETS"
bucket_name = "marketplace-assets"

[[d1_databases]]
binding = "DB"
database_name = "marketplace"
database_id = "your-d1-database-id"
```

## Scripts de Deploy

### Deploy Manual

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

APP=$1
ENV=$2

if [ -z "$APP" ] || [ -z "$ENV" ]; then
  echo "Usage: ./deploy.sh <app> <env>"
  echo "Example: ./deploy.sh store production"
  exit 1
fi

echo "🚀 Deploying $APP to $ENV..."

# Build
pnpm --filter ./apps/$APP build

# Deploy
cd apps/$APP
wrangler pages deploy .svelte-kit/cloudflare --env=$ENV

echo "✅ Deploy completed!"
```

### Rollback

```bash
#!/bin/bash
# scripts/rollback.sh

set -e

APP=$1
DEPLOYMENT_ID=$2

if [ -z "$APP" ] || [ -z "$DEPLOYMENT_ID" ]; then
  echo "Usage: ./rollback.sh <app> <deployment-id>"
  exit 1
fi

echo "🔄 Rolling back $APP to deployment $DEPLOYMENT_ID..."

wrangler pages deployments rollback $DEPLOYMENT_ID --project-name=$APP

echo "✅ Rollback completed!"
```

## Monitoramento de Deploy

### Health Checks

```typescript
// apps/*/src/routes/health/+server.ts
import { json } from '@sveltejs/kit';
import { xata } from '$lib/xata';

export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.GITHUB_SHA || 'unknown',
    checks: {
      database: false,
      cache: false
    }
  };

  try {
    // Check database
    await xata.db.users.select(['id']).getFirst();
    checks.checks.database = true;
  } catch (error) {
    checks.status = 'unhealthy';
  }

  try {
    // Check cache
    await env.CACHE.get('health-check');
    checks.checks.cache = true;
  } catch (error) {
    checks.status = 'degraded';
  }

  return json(checks, {
    status: checks.status === 'healthy' ? 200 : 503
  });
}
```

### Notificações

```yaml
# .github/workflows/notify.yml
name: Deploy Notifications

on:
  workflow_run:
    workflows: ["CI/CD Pipeline"]
    types: [completed]

jobs:
  notify:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    steps:
      - name: Send Slack notification
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deploy failed for ${{ github.event.workflow_run.head_branch }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
      
      - name: Create GitHub Issue
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Deploy failed: ${context.payload.workflow_run.head_branch}`,
              body: `The deployment workflow failed. [Check the logs](${context.payload.workflow_run.html_url})`,
              labels: ['bug', 'deployment']
            })
```

## Performance Monitoring

### Lighthouse CI

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI

on:
  pull_request:
    branches: [main, develop]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            ${{ secrets.PREVIEW_URL }}
            ${{ secrets.PREVIEW_URL }}/produtos
            ${{ secrets.PREVIEW_URL }}/carrinho
          uploadArtifacts: true
          temporaryPublicStorage: true
          budgetPath: ./lighthouse-budget.json
```

### Budget Configuration

```json
// lighthouse-budget.json
{
  "budgets": [
    {
      "path": "/*",
      "timings": [
        {
          "metric": "interactive",
          "budget": 3000
        },
        {
          "metric": "first-contentful-paint",
          "budget": 1000
        }
      ],
      "resourceSizes": [
        {
          "resourceType": "script",
          "budget": 300
        },
        {
          "resourceType": "total",
          "budget": 1000
        }
      ],
      "resourceCounts": [
        {
          "resourceType": "third-party",
          "budget": 10
        }
      ]
    }
  ]
}
```

## Estratégias de Deploy

### Blue-Green Deployment

1. Deploy para ambiente "green" (novo)
2. Executar testes de smoke
3. Trocar o tráfego gradualmente
4. Monitorar métricas
5. Rollback se necessário

### Canary Deployment

```javascript
// Cloudflare Worker para canary deployment
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 10% do tráfego para versão canary
    const isCanary = Math.random() < 0.1;
    
    if (isCanary) {
      url.hostname = 'canary.marketplace.com';
    }
    
    return fetch(url, request);
  }
};
```

### Feature Flags

```typescript
// src/lib/features.ts
export const features = {
  newCheckout: {
    enabled: process.env.PUBLIC_FEATURE_NEW_CHECKOUT === 'true',
    rollout: 0.5 // 50% dos usuários
  },
  
  aiRecommendations: {
    enabled: process.env.PUBLIC_FEATURE_AI_RECOMMENDATIONS === 'true',
    rollout: 1.0 // 100% dos usuários
  }
};

export function isFeatureEnabled(
  feature: keyof typeof features,
  userId?: string
): boolean {
  const config = features[feature];
  
  if (!config.enabled) return false;
  
  if (config.rollout === 1) return true;
  
  // Determinar baseado no ID do usuário
  if (userId) {
    const hash = userId.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    
    return (hash % 100) / 100 < config.rollout;
  }
  
  return Math.random() < config.rollout;
}
```

## Checklist de Deploy

### Pre-deploy
- [ ] Todos os testes passando
- [ ] Code review aprovado
- [ ] Documentação atualizada
- [ ] Migrations executadas
- [ ] Feature flags configuradas

### Deploy
- [ ] Build bem-sucedido
- [ ] Deploy para staging testado
- [ ] Health checks passando
- [ ] Métricas normais

### Post-deploy
- [ ] Monitorar logs de erro
- [ ] Verificar métricas de performance
- [ ] Testar funcionalidades críticas
- [ ] Comunicar time sobre deploy 