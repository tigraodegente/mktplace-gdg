# OfferCountdown Component (Refatorado)

Componente de contador de ofertas completamente refatorado seguindo as melhores práticas do projeto, com estrutura limpa, eventos customizados e alta performance.

## 🚀 Melhorias Implementadas

### ✨ Estrutura de Código
- **Organização por seções**: Código dividido em seções claras (TYPES, PROPS, STATE, etc.)
- **CSS Custom Properties**: Design tokens centralizados para fácil manutenção
- **TypeScript aprimorado**: Interfaces mais robustas e tipagem completa
- **Performance otimizada**: Cálculos eficientes e cleanup adequado

### 🎨 Design System
- **Variáveis CSS**: Cores, espaçamentos, tipografia e animações padronizadas
- **Estados visuais**: Urgente, crítico, expirado com animações
- **Responsividade avançada**: Breakpoints granulares para todos os dispositivos
- **Acessibilidade**: ARIA labels, live regions e semântica apropriada

### ⚡ Funcionalidades Avançadas
- **Eventos customizados**: Notificações para diferentes estados do timer
- **Estados inteligentes**: Urgente (≤5min), crítico (≤1min), expirado
- **Controles avançados**: Pausar, retomar, auto-hide
- **Flexibilidade**: Suporte a dias, labels customizados, animações

## 📁 Estrutura do Código

```typescript
// =============================================================================
// TYPES - Interfaces TypeScript
// =============================================================================

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

// =============================================================================  
// PROPS - Propriedades do componente
// =============================================================================

// =============================================================================
// STATE - Estado reativo do Svelte 5
// =============================================================================

// =============================================================================
// DERIVED - Estados derivados e calculados
// =============================================================================

// =============================================================================
// EVENTS - Event dispatcher para comunicação
// =============================================================================

// =============================================================================
// FUNCTIONS - Funções do componente
// =============================================================================

// =============================================================================
// LIFECYCLE - Ciclo de vida do componente
// =============================================================================
```

## 🎨 CSS Custom Properties

### Cores
```css
--color-bg: #000000
--color-text: #FFFFFF
--color-border: #DCDCDC
--color-border-urgent: #FF8403
--color-border-critical: #FF4444
--color-expired: #666666
```

### Espaçamentos
```css
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 12px
--spacing-lg: 16px
```

### Dimensões
```css
--container-height: 48px
--unit-width: 35.281px
--unit-height: 31.447px
--border-radius: 6.136px
--border-width: 0.767px
```

### Tipografia
```css
--font-family: 'Lato', sans-serif
--font-size-text: 15.444px
--font-size-number: 13.73px
--font-size-separator: 16px
--font-size-label: 10px
```

### Animações
```css
--pulse-duration: 2s
--shake-duration: 0.5s
--transition-base: 0.3s ease
```

## 🔧 Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `endTime` | `Date` | `new Date(+24h)` | Data/hora de expiração da oferta |
| `text` | `string` | `'Ofertas terminam em:'` | Texto exibido antes do contador |
| `showDays` | `boolean` | `false` | Mostrar dias no contador |
| `autoHide` | `boolean` | `true` | Esconder automaticamente após expirar |
| `pulse` | `boolean` | `true` | Animação de pulsação |
| `class` | `string` | `''` | Classes CSS adicionais |

## 📝 Interface TimeLeft

```typescript
interface TimeLeft {
  hours: number;        // Horas restantes
  minutes: number;      // Minutos restantes  
  seconds: number;      // Segundos restantes
  totalSeconds: number; // Total em segundos para comparações
}
```

## 🎯 Estados do Contador

### Normal
- Timer funcionando normalmente
- Animação de pulsação suave (se habilitada)
- Cores padrão

### Urgente (≤ 5 minutos)
- Borda laranja (`--color-border-urgent`)
- Animação de pulsação da borda
- Evento `urgent` disparado

### Crítico (≤ 1 minuto)
- Borda vermelha (`--color-border-critical`)
- Animação de shake + pulsação
- Evento `critical` disparado

### Expirado
- Cores opacas/acinzentadas
- Texto "Oferta expirada"
- Evento `expired` disparado
- Auto-hide após 2 segundos (se habilitado)

## 🚀 Uso Básico

```svelte
<script>
  import OfferCountdown from '$lib/components/layout/OfferCountdown.svelte';
  
  // Data de expiração (6 horas a partir de agora)
  const offerEndTime = new Date(Date.now() + 6 * 60 * 60 * 1000);
</script>

<OfferCountdown 
  endTime={offerEndTime}
  text="Oferta Flash termina em:"
  showDays={false}
  autoHide={true}
  pulse={true}
/>
```

## 🎯 Uso Avançado com Eventos

```svelte
<script>
  import OfferCountdown from '$lib/components/layout/OfferCountdown.svelte';
  
  const offerEndTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas
  
  function handleExpired() {
    console.log('Oferta expirou!');
    // Redirecionar, mostrar modal, etc.
  }
  
  function handleUrgent(event) {
    console.log(`Tempo urgente! ${event.detail.secondsLeft} segundos restantes`);
    // Mostrar notificação de urgência
  }
  
  function handleCritical(event) {
    console.log(`Tempo crítico! ${event.detail.secondsLeft} segundos restantes`);
    // Tocar som, vibrar, etc.
  }
  
  function handleTick(event) {
    console.log('Tick:', event.detail);
    // Atualizar analytics, logs, etc.
  }
</script>

<OfferCountdown 
  endTime={offerEndTime}
  text="🔥 MEGA OFERTA:"
  showDays={true}
  autoHide={false}
  pulse={true}
  onexpired={handleExpired}
  onurgent={handleUrgent}
  oncritical={handleCritical}
  ontick={handleTick}
  class="custom-countdown"
/>
```

## 📱 Responsividade

### Mobile (até 767px)
- Container height: 44px
- Unit size: 30×26px
- Font sizes otimizados para telas pequenas
- Gaps reduzidos para economia de espaço

### Tablet (768px - 1023px)
- Container height: 48px (padrão)
- Unit size: 32×28px
- Espaçamentos intermediários
- Tipografia balanceada

### Desktop (1024px+)
- Dimensões originais mantidas
- Integração com HomeBanner
- Border radius superior para conexão visual
- Box shadow para elevação

### Mobile Extra Pequeno (≤375px)
- Container height: 40px
- Unit size: 24×20px
- Font sizes mínimos legíveis
- Gaps ultra compactos

## 🎨 Customização

### Personalizar Cores
```css
.custom-countdown {
  --color-bg: #1a1a1a;
  --color-border-urgent: #ffa500;
  --color-border-critical: #ff0000;
}
```

### Personalizar Animações
```css
.custom-countdown {
  --pulse-duration: 1s;
  --shake-duration: 0.3s;
  --transition-base: 0.5s ease-in-out;
}
```

### Personalizar Dimensões
```css
.custom-countdown {
  --container-height: 56px;
  --unit-width: 40px;
  --unit-height: 36px;
}
```

## 🎬 Animações Incluídas

### Pulse
- Duração: 2s (configurável)
- Efeito: Opacity 1 → 0.7 → 1
- Aplicação: Estado normal com `pulse={true}`

### Pulse Border
- Duração: 2s (configurável)  
- Efeito: Cor da borda alternando entre urgente e crítico
- Aplicação: Estado urgente

### Shake
- Duração: 0.5s (configurável)
- Efeito: Movimento horizontal ±2px
- Aplicação: Estado crítico

## 📊 Eventos Disponíveis

### `expired`
```typescript
onexpired: () => void
```
Disparado quando o timer chega a zero.

### `urgent` 
```typescript
onurgent: (event: { secondsLeft: number }) => void
```
Disparado quando restam ≤ 5 minutos.

### `critical`
```typescript
oncritical: (event: { secondsLeft: number }) => void  
```
Disparado quando restam ≤ 1 minuto.

### `tick`
```typescript
ontick: (event: TimeLeft) => void
```
Disparado a cada segundo com o tempo atual.

### `pause` / `resume`
```typescript
onpause: () => void
onresume: () => void
```
Disparados quando o timer é pausado/retomado programaticamente.

## 🛠️ Métodos de Controle

### Pausar Timer
```javascript
// Através de referência do componente
let countdownRef;

function pauseTimer() {
  countdownRef.pause();
}
```

### Retomar Timer
```javascript
function resumeTimer() {
  countdownRef.resume();
}
```

## 🧪 Casos de Uso

### E-commerce
```svelte
<!-- Flash Sale -->
<OfferCountdown 
  endTime={flashSaleEnd}
  text="⚡ Flash Sale termina em:"
  showDays={false}
  pulse={true}
  onexpired={() => location.reload()}
/>
```

### Lançamento de Produto
```svelte
<!-- Countdown para lançamento -->
<OfferCountdown 
  endTime={launchDate}
  text="🚀 Lançamento em:"
  showDays={true}
  autoHide={false}
  onurgent={() => showNotification('Quase lá!')}
/>
```

### Oferta Limitada
```svelte
<!-- Desconto por tempo limitado -->
<OfferCountdown 
  endTime={discountEnd}
  text="💰 30% OFF por mais:"
  showDays={false}
  oncritical={() => playUrgentSound()}
  onexpired={() => removeProm()}
/>
```

## ♿ Acessibilidade

- **Role Timer**: Elemento identificado como timer para screen readers
- **Aria Live**: Região que anuncia mudanças automaticamente  
- **Aria Label**: Descrição clara do propósito do contador
- **Contraste**: Cores com contraste adequado para legibilidade
- **Semântica**: HTML estruturado corretamente

## 🔧 Manutenção

### Adicionando Novos Estados
1. Definir condições no `$derived`
2. Criar classes CSS correspondentes
3. Implementar animações se necessário
4. Documentar o novo estado

### Modificando Responsividade
1. Ajustar custom properties nos breakpoints
2. Testar em dispositivos reais
3. Validar legibilidade e usabilidade
4. Verificar performance em dispositivos antigos

### Debugging
- Console warnings para datas inválidas
- Estados visuais claros durante desenvolvimento
- Eventos para rastreamento de comportamento

## 📋 Checklist de Implementação

- [ ] Data de expiração válida definida
- [ ] Eventos de callback implementados se necessário
- [ ] Teste em diferentes tamanhos de tela
- [ ] Validação de acessibilidade
- [ ] Performance verificada em dispositivos antigos
- [ ] Integração com design system confirmada
- [ ] Fallbacks para browsers antigos (se necessário) 