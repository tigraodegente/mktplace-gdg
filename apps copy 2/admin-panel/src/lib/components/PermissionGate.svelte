<script lang="ts">
	import { page } from '$app/stores';
	import { fade } from 'svelte/transition';
	
	interface Props {
		permission?: string;
		permissions?: string[];
		requireAll?: boolean;
		fallback?: 'hide' | 'disable' | 'message';
		customMessage?: string;
		children?: any;
	}
	
	let { 
		permission, 
		permissions = [], 
		requireAll = true,
		fallback = 'hide',
		customMessage = 'Você não tem permissão para esta ação',
		children 
	}: Props = $props();
	
	// Combinar permissão única com array de permissões
	const allPermissions = $derived(permission ? [permission, ...permissions] : permissions);
	const userPermissions = $derived($page.data.permissions || []);
	
	// Lógica de verificação
	const hasPermission = $derived(() => {
		if (allPermissions.length === 0) return true;
		
		if (requireAll) {
			return allPermissions.every(perm => userPermissions.includes(perm));
		} else {
			return allPermissions.some(perm => userPermissions.includes(perm));
		}
	});
	
	// Classes CSS para estado desabilitado
	const disabledClasses = 'opacity-50 pointer-events-none select-none cursor-not-allowed';
</script>

{#if hasPermission()}
	{@render children?.()}
{:else if fallback === 'disable'}
	<div class={disabledClasses} title={customMessage}>
		{@render children?.()}
	</div>
{:else if fallback === 'message'}
	<div 
		class="flex items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-500"
		in:fade={{ duration: 200 }}
	>
		<div class="text-center">
			<svg class="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
			</svg>
			<p class="text-sm font-medium">{customMessage}</p>
		</div>
	</div>
{/if} 