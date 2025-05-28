<script lang="ts">
	import { isAuthenticated } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	
	interface AuthGuardProps {
		redirectTo?: string;
		children?: any;
	}
	
	let { redirectTo = '/login', children }: AuthGuardProps = $props();
	
	let isChecking = $state(true);
	
	onMount(() => {
		// Verificar autenticação
		if (!$isAuthenticated) {
			// Construir URL de redirecionamento com a página atual como parâmetro
			const currentPath = $page.url.pathname;
			const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`;
			goto(redirectUrl);
		} else {
			isChecking = false;
		}
	});
	
	// Monitorar mudanças no estado de autenticação
	$effect(() => {
		if (!isChecking && !$isAuthenticated) {
			const currentPath = $page.url.pathname;
			const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`;
			goto(redirectUrl);
		}
	});
</script>

{#if isChecking}
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<div class="w-12 h-12 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
			<p class="text-gray-600" style="font-family: 'Lato', sans-serif;">Verificando autenticação...</p>
		</div>
	</div>
{:else if $isAuthenticated}
	{@render children()}
{/if} 