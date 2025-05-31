<script lang="ts">
	import '../app.css';
	import ProfessionalHeader from '../../../../packages/ui/src/lib/components/layout/ProfessionalHeader.svelte';
	import { page } from '$app/stores';
	
	// Mock data - seria substituído por dados reais da sessão
	const breadcrumbs = [
		{ label: 'Dashboard', href: '/seller' },
		{ label: 'Produtos' } // sem href = página atual
	];
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
	<!-- Header Profissional -->
	<ProfessionalHeader 
		appType="seller"
		currentPage="Dashboard"
		userName="Vendedor GDG"
		userRole="Vendedor"
		breadcrumbs={breadcrumbs}
		notifications={5}
	/>
	
	<div class="flex flex-1">
		<!-- Sidebar -->
		<aside class="sidebar">
			<nav class="flex-1 px-4 py-6 space-y-2">
				<!-- Dashboard -->
				<a href="/seller" class="nav-link active">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m8 7 4-4 4 4"/>
					</svg>
					<span class="ml-3">Dashboard</span>
				</a>
				
				<!-- Meus Produtos -->
				<a href="/seller/produtos" class="nav-link">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
					</svg>
					<span class="ml-3">Meus Produtos</span>
				</a>
				
				<!-- Estoque -->
				<a href="/seller/estoque" class="nav-link">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
					</svg>
					<span class="ml-3">Estoque</span>
				</a>
				
				<!-- Pedidos -->
				<a href="/seller/pedidos" class="nav-link">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
					</svg>
					<span class="ml-3">Pedidos</span>
					<span class="ml-auto px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full">3</span>
				</a>
				
				<!-- Vendas -->
				<a href="/seller/vendas" class="nav-link">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
					</svg>
					<span class="ml-3">Vendas</span>
				</a>
				
				<!-- Avaliações -->
				<a href="/seller/avaliacoes" class="nav-link">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
					</svg>
					<span class="ml-3">Avaliações</span>
				</a>
				
				<!-- Configurações -->
				<a href="/seller/configuracoes" class="nav-link">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
					</svg>
					<span class="ml-3">Configurações</span>
				</a>
			</nav>
		</aside>
		
		<!-- Main Content -->
		<main class="flex-1 overflow-auto">
			<div class="page-container">
				<slot />
			</div>
		</main>
	</div>
</div>
