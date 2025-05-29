import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

/**
 * Configurações padrão para transições
 */
export const TRANSITION_DURATION = {
  fast: 150,
  normal: 200,
  slow: 300
} as const;

/**
 * Transição de fade padrão
 */
export function fadeScale(
  node: Element,
  { delay = 0, duration = TRANSITION_DURATION.normal, easing = cubicOut } = {}
): TransitionConfig {
  const o = +getComputedStyle(node).opacity;
  const transform = getComputedStyle(node).transform;
  const scaleMatch = transform.match(/scale\(([0-9.]+)\)/);
  const s = scaleMatch ? +scaleMatch[1] : 1;

  return {
    delay,
    duration,
    easing,
    css: (t) => `
      opacity: ${t * o};
      transform: scale(${t * s});
    `
  };
}

/**
 * Transição de slide otimizada
 */
export function slideOptimized(
  node: Element,
  { delay = 0, duration = TRANSITION_DURATION.normal, easing = cubicOut, axis = 'y' } = {}
): TransitionConfig {
  const style = getComputedStyle(node);
  const opacity = +style.opacity;
  const primary_property = axis === 'y' ? 'height' : 'width';
  const primary_property_value = parseFloat(style[primary_property as keyof CSSStyleDeclaration] as string);
  const secondary_properties = axis === 'y' ? ['top', 'bottom'] : ['left', 'right'];
  const capitalized_secondary_properties = secondary_properties.map(
    (e) => `${e[0].toUpperCase()}${e.slice(1)}`
  );
  
  const padding_start_value = parseFloat(style.getPropertyValue(`padding-${secondary_properties[0]}`));
  const padding_end_value = parseFloat(style.getPropertyValue(`padding-${secondary_properties[1]}`));
  const margin_start_value = parseFloat(style.getPropertyValue(`margin-${secondary_properties[0]}`));
  const margin_end_value = parseFloat(style.getPropertyValue(`margin-${secondary_properties[1]}`));
  const border_width_start_value = parseFloat(
    style.getPropertyValue(`border-${secondary_properties[0]}-width`)
  );
  const border_width_end_value = parseFloat(
    style.getPropertyValue(`border-${secondary_properties[1]}-width`)
  );

  return {
    delay,
    duration,
    easing,
    css: (t) =>
      'overflow: hidden;' +
      `opacity: ${Math.min(t * 20, 1) * opacity};` +
      `${primary_property}: ${t * primary_property_value}px;` +
      `padding-${secondary_properties[0]}: ${t * padding_start_value}px;` +
      `padding-${secondary_properties[1]}: ${t * padding_end_value}px;` +
      `margin-${secondary_properties[0]}: ${t * margin_start_value}px;` +
      `margin-${secondary_properties[1]}: ${t * margin_end_value}px;` +
      `border-${secondary_properties[0]}-width: ${t * border_width_start_value}px;` +
      `border-${secondary_properties[1]}-width: ${t * border_width_end_value}px;`
  };
}

/**
 * Prevenir piscadas durante transições
 */
export function preventFlicker(node: HTMLElement) {
  // Adicionar classes para prevenir flicker
  node.classList.add('no-shift');
  
  // Forçar GPU acceleration
  node.style.transform = 'translateZ(0)';
  
  return {
    destroy() {
      node.classList.remove('no-shift');
      node.style.transform = '';
    }
  };
}

/**
 * Debounce para transições
 */
export function debounceTransition(fn: Function, delay: number = TRANSITION_DURATION.fast) {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Verificar se deve usar transições reduzidas
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
}

/**
 * Aplicar transição apenas se não preferir movimento reduzido
 */
export function safeTransition(
  node: Element,
  params: any,
  transitionFn: Function
): TransitionConfig | { duration: 0 } {
  if (prefersReducedMotion()) {
    return { duration: 0 };
  }
  
  return transitionFn(node, params);
}

/**
 * Desabilitar transições temporariamente durante mudanças de estado
 */
export function disableTransitionsTemporarily(callback: () => void | Promise<void>) {
  // Adicionar classe para desabilitar transições
  document.body.classList.add('no-transition');
  
  // Executar callback
  const result = callback();
  
  // Se for uma Promise, aguardar
  if (result instanceof Promise) {
    result.finally(() => {
      // Re-habilitar transições após um frame
      requestAnimationFrame(() => {
        document.body.classList.remove('no-transition');
      });
    });
  } else {
    // Re-habilitar transições após um frame
    requestAnimationFrame(() => {
      document.body.classList.remove('no-transition');
    });
  }
}

/**
 * Hook para prevenir piscadas em componentes reativos
 */
export function useStableUpdates(node: HTMLElement) {
  let updateQueue: Function[] = [];
  let isUpdating = false;
  
  function processUpdates() {
    if (isUpdating || updateQueue.length === 0) return;
    
    isUpdating = true;
    node.classList.add('no-transition');
    
    // Processar todas as atualizações de uma vez
    requestAnimationFrame(() => {
      while (updateQueue.length > 0) {
        const update = updateQueue.shift();
        if (update) update();
      }
      
      // Re-habilitar transições
      requestAnimationFrame(() => {
        node.classList.remove('no-transition');
        isUpdating = false;
      });
    });
  }
  
  return {
    update(fn: Function) {
      updateQueue.push(fn);
      processUpdates();
    },
    destroy() {
      updateQueue = [];
    }
  };
} 