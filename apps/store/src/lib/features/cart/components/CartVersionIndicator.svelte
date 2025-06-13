<script lang="ts">
  import { cartStore } from '../index';
  
  // Detectar versão ativa
  const version = (cartStore as any).__version || 'legacy';
  const isNewStore = (cartStore as any).__isNewStore || false;
  
  let showIndicator = $state(false);
  
  // Mostrar indicador apenas em desenvolvimento
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    showIndicator = true;
  }
</script>

{#if showIndicator}
  <div class="fixed bottom-4 right-4 z-50 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs font-mono">
    Cart Store: {isNewStore ? '🆕 NEW' : '📝 LEGACY'} v{version}
  </div>
{/if} 