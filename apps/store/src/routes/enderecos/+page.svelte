<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isAuthenticated, user } from '$lib/stores/auth';
	import AddressManager from '$lib/components/address/AddressManager.svelte';
	import AuthGuard from '$lib/components/auth/AuthGuard.svelte';
	import { fade, slide } from 'svelte/transition';
	
	// Estados
	let activeTab: 'shipping' | 'billing' = 'shipping';
	let showSuccessMessage = false;
	let successMessage = '';
	
	// Verificar autenticação
	onMount(() => {
		if (!$isAuthenticated) {
			goto('/login?redirect=' + encodeURIComponent('/enderecos'));
		}
	});
	
	function handleAddressSaved(event: CustomEvent) {
		const { address } = event.detail;
		successMessage = `Endereço ${address.label || 'sem etiqueta'} salvo com sucesso!`;
		showSuccessMessage = true;
		
		// Esconder mensagem após 3 segundos
		setTimeout(() => {
			showSuccessMessage = false;
		}, 3000);
	}
	
	function handleAddressDeleted(event: CustomEvent) {
		successMessage = 'Endereço removido com sucesso!';
		showSuccessMessage = true;
		
		setTimeout(() => {
			showSuccessMessage = false;
		}, 3000);
	}
</script>

<svelte:head>
	<title>Meus Endereços - Marketplace GDG</title>
	<meta name="description" content="Gerencie seus endereços de entrega e cobrança de forma simples e rápida" />
</svelte:head>

<AuthGuard>
	<div class="min-h-screen bg-gray-50">
		<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<!-- Breadcrumb -->
			<nav class="mb-8">
				<ol class="flex items-center space-x-2 text-sm">
					<li><a href="/" class="text-gray-500 hover:text-gray-700 transition-colors">Início</a></li>
					<li><span class="text-gray-400">/</span></li>
					<li><a href="/conta" class="text-gray-500 hover:text-gray-700 transition-colors">Minha Conta</a></li>
					<li><span class="text-gray-400">/</span></li>
					<li class="text-gray-900 font-medium">Endereços</li>
				</ol>
			</nav>
			
			<!-- Header -->
			<div class="mb-8">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold text-gray-900">Meus Endereços</h1>
						<p class="text-gray-600 mt-2">
							Gerencie seus endereços de entrega e cobrança para facilitar suas compras
						</p>
					</div>
					
					{#if $user}
						<div class="hidden sm:block text-right">
							<p class="text-sm text-gray-500">Olá,</p>
							<p class="font-semibold text-gray-900">{$user.name}</p>
						</div>
					{/if}
				</div>
			</div>
			
			<!-- Success Message -->
			{#if showSuccessMessage}
				<div class="mb-6 bg-green-50 border border-green-200 rounded-lg p-4" transition:slide>
					<div class="flex">
						<svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
						</svg>
						<div class="ml-3">
							<p class="text-sm text-green-800">{successMessage}</p>
						</div>
						<button class="ml-auto text-green-400 hover:text-green-600" onclick={() => showSuccessMessage = false} aria-label="Fechar mensagem de sucesso">
							<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
							</svg>
						</button>
					</div>
				</div>
			{/if}
			
			<!-- Layout Grid -->
			<div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
				<!-- Menu Lateral -->
				<div class="lg:col-span-1">
					<nav class="bg-white rounded-lg shadow-sm p-4 sticky top-8">
						<h2 class="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Minha Conta</h2>
						<ul class="space-y-2">
							<li>
								<a href="/conta" class="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
									<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
									</svg>
									Perfil
								</a>
							</li>
							<li>
								<a href="/enderecos" class="flex items-center gap-3 px-3 py-2 bg-[#00BFB3]/10 text-[#00BFB3] font-medium rounded-lg">
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
									</svg>
									Endereços
								</a>
							</li>
							<li>
								<a href="/pedidos" class="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
									<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
									</svg>
									Pedidos
								</a>
							</li>
							<li>
								<a href="/favoritos" class="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
									<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
									</svg>
									Favoritos
								</a>
							</li>
							<li>
								<a href="/configuracoes" class="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
									<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37.996.608 2.296.07 2.572-1.065z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									</svg>
									Configurações
								</a>
							</li>
						</ul>
						
						<!-- Quick Stats -->
						<div class="mt-6 pt-6 border-t border-gray-200">
							<h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Resumo</h3>
							<div class="space-y-2">
								<div class="flex justify-between text-sm">
									<span class="text-gray-600">Endereços</span>
									<span class="font-medium text-gray-900">-</span>
								</div>
								<div class="flex justify-between text-sm">
									<span class="text-gray-600">Pedidos</span>
									<span class="font-medium text-gray-900">-</span>
								</div>
							</div>
						</div>
					</nav>
				</div>
				
				<!-- Conteúdo Principal -->
				<div class="lg:col-span-3">
					<div class="bg-white rounded-lg shadow-sm overflow-hidden">
						<!-- Tabs para Tipos de Endereço -->
						<div class="border-b border-gray-200">
							<nav class="flex space-x-8 px-6">
								<button
									class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
									class:border-[#00BFB3]={activeTab === 'shipping'}
									class:text-[#00BFB3]={activeTab === 'shipping'}
									class:border-transparent={activeTab !== 'shipping'}
									class:text-gray-500={activeTab !== 'shipping'}
									class:hover:text-gray-700={activeTab !== 'shipping'}
									class:hover:border-gray-300={activeTab !== 'shipping'}
									onclick={() => activeTab = 'shipping'}
								>
									<div class="flex items-center gap-2">
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
										</svg>
										Endereços de Entrega
									</div>
								</button>
								<button
									class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
									class:border-[#00BFB3]={activeTab === 'billing'}
									class:text-[#00BFB3]={activeTab === 'billing'}
									class:border-transparent={activeTab !== 'billing'}
									class:text-gray-500={activeTab !== 'billing'}
									class:hover:text-gray-700={activeTab !== 'billing'}
									class:hover:border-gray-300={activeTab !== 'billing'}
									onclick={() => activeTab = 'billing'}
								>
									<div class="flex items-center gap-2">
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
										</svg>
										Endereços de Cobrança
									</div>
								</button>
							</nav>
						</div>
						
						<!-- Conteúdo das Tabs -->
						<div class="p-6">
							{#if activeTab === 'shipping'}
								<div transition:fade={{ duration: 200 }}>
									<AddressManager
										userId={$user?.id}
										addressType="shipping"
										mode="manage"
										showHistory={true}
										on:addressSaved={handleAddressSaved}
										on:addressDeleted={handleAddressDeleted}
									/>
								</div>
							{:else}
								<div transition:fade={{ duration: 200 }}>
									<AddressManager
										userId={$user?.id}
										addressType="billing"
										mode="manage"
										showHistory={true}
										on:addressSaved={handleAddressSaved}
										on:addressDeleted={handleAddressDeleted}
									/>
								</div>
							{/if}
						</div>
					</div>
					
					<!-- Dicas Úteis -->
					<div class="mt-8 bg-gradient-to-r from-blue-50 to-[#00BFB3]/5 border border-blue-200/50 rounded-lg p-6">
						<div class="flex">
							<svg class="w-6 h-6 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<div class="ml-4">
								<h3 class="text-lg font-semibold text-gray-900 mb-3">Dicas para gerenciar endereços</h3>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
									<div class="space-y-2">
										<div class="flex items-start gap-2">
											<span class="text-[#00BFB3] font-semibold">•</span>
											<span>Mantenha múltiplos endereços para facilitar suas compras</span>
										</div>
										<div class="flex items-start gap-2">
											<span class="text-[#00BFB3] font-semibold">•</span>
											<span>Defina um endereço padrão para agilizar o checkout</span>
										</div>
										<div class="flex items-start gap-2">
											<span class="text-[#00BFB3] font-semibold">•</span>
											<span>Use etiquetas como "Casa" ou "Trabalho" para identificar rapidamente</span>
										</div>
									</div>
									<div class="space-y-2">
										<div class="flex items-start gap-2">
											<span class="text-[#00BFB3] font-semibold">•</span>
											<span>Certifique-se de que o CEP está correto para cálculo preciso do frete</span>
										</div>
										<div class="flex items-start gap-2">
											<span class="text-[#00BFB3] font-semibold">•</span>
											<span>Mantenha seus dados atualizados para evitar problemas na entrega</span>
										</div>
										<div class="flex items-start gap-2">
											<span class="text-[#00BFB3] font-semibold">•</span>
											<span>Endereços de cobrança podem ser diferentes dos de entrega</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</AuthGuard> 