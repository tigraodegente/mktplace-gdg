<script lang="ts">
  import { cartStore } from '../index';
  
  // Detectar versão ativa detalhadamente
  const version = (cartStore as any).__version || 'legacy';
  const isNewStore = (cartStore as any).__isNewStore || false;
  const usesServices = (cartStore as any).__usesServices || false;
  
  let showIndicator = $state(false);
  
  // Mostrar indicador apenas em desenvolvimento
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    showIndicator = true;
  }
  
  // Determinar qual versão específica está ativa
  function getVersionLabel() {
    if (version.includes('refactored') && usesServices) {
      return '🏗️ REFACTORED';
    } else if (version.includes('2.0') || (isNewStore && !usesServices)) {
      return '🆕 NEW';
    } else if (isNewStore) {
      return '🔄 NEW';
    } else {
      return '📝 LEGACY';
    }
  }
  
  function getVersionColor() {
    if (version.includes('refactored')) {
      return 'bg-green-800';
    } else if (isNewStore) {
      return 'bg-blue-800';
    } else {
      return 'bg-gray-800';
    }
  }
</script>

{#if showIndicator}
  <div class="fixed bottom-4 right-4 z-50 {getVersionColor()} text-white px-3 py-2 rounded-lg text-xs font-mono">
    {getVersionLabel()} v{version}
  </div>
{/if} 