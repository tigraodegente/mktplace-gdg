<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  
  type BenefitType = 'free-shipping' | 'discount' | 'coupon' | 'cashback' | 'points';
  type BenefitLevel = 'product' | 'seller' | 'cart';
  
  interface BenefitBadgeProps {
    type: BenefitType;
    level: BenefitLevel;
    value?: string | number;
    description?: string;
    showTooltip?: boolean;
  }
  
  let { 
    type, 
    level, 
    value, 
    description,
    showTooltip = true
  }: BenefitBadgeProps = $props();
  
  let isHovering = $state(false);
  
  // Configurações visuais por tipo
  const typeConfig = {
    'free-shipping': {
      icon: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>`,
      label: 'Frete Grátis',
      bgClass: 'bg-[#00BFB3]',
      textClass: 'text-white',
      borderClass: 'border-[#00A89D]'
    },
    'discount': {
      icon: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>`,
      label: value ? `${value}% OFF` : 'Desconto',
      bgClass: 'bg-gradient-to-r from-[#00BFB3] to-[#00A89D]',
      textClass: 'text-white',
      borderClass: 'border-[#00A89D]'
    },
    'coupon': {
      icon: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>`,
      label: 'Cupom Aplicado',
      bgClass: 'bg-[#00BFB3]/10 border border-[#00BFB3]',
      textClass: 'text-[#00A89D]',
      borderClass: 'border-[#00BFB3]'
    },
    'cashback': {
      icon: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>`,
      label: value ? `${value}% Cashback` : 'Cashback',
      bgClass: 'bg-[#00BFB3]/5 border border-[#00BFB3]/20',
      textClass: 'text-[#00A89D]',
      borderClass: 'border-[#00BFB3]/20'
    },
    'points': {
      icon: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>`,
      label: value ? `+${value} pontos` : 'Pontos',
      bgClass: 'bg-gray-50 border border-gray-200',
      textClass: 'text-gray-700',
      borderClass: 'border-gray-200'
    }
  };
  
  const levelConfig = {
    product: {
      size: 'text-[10px] px-2 py-0.5',
      tooltipPrefix: 'Neste produto'
    },
    seller: {
      size: 'text-xs px-2.5 py-1',
      tooltipPrefix: 'Neste vendedor'
    },
    cart: {
      size: 'text-sm px-3 py-1.5',
      tooltipPrefix: 'Em toda compra'
    }
  };
  
  const config = typeConfig[type];
  const levelInfo = levelConfig[level];
</script>

<div class="relative inline-block">
  <div 
    class="inline-flex items-center gap-1.5 rounded-full font-semibold shadow-sm
           {config.bgClass} {config.textClass} {levelInfo.size}
           transition-all duration-200 hover:shadow-md hover:scale-105"
    onmouseenter={() => isHovering = true}
    onmouseleave={() => isHovering = false}
    transition:scale={{ duration: 300 }}
    role="button"
    tabindex="0"
    aria-label="Ver benefícios disponíveis"
  >
    {@html config.icon}
    <span>{config.label}</span>
  </div>
  
  {#if showTooltip && description && isHovering}
    <div 
      class="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2
             bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap
             shadow-lg pointer-events-none"
      transition:fade={{ duration: 200 }}
    >
      <div class="text-gray-300 text-[10px] mb-0.5">{levelInfo.tooltipPrefix}:</div>
      <div>{description}</div>
      <div class="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
        <div class="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  {/if}
</div> 