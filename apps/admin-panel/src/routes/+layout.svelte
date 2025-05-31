<script lang="ts">
	import '$lib/app.css';
	import ProfessionalHeader from '@mktplace/ui/components/layout/ProfessionalHeader.svelte';
	import { page } from '$app/stores';
	
	// Mock data - seria substituído por dados reais da sessão
	const breadcrumbs = [
		{ label: 'Dashboard', href: '/admin' },
		{ label: 'Produtos' } // sem href = página atual
	];
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
	<!-- Header Profissional -->
	<ProfessionalHeader 
		appType="admin"
		currentPage="Dashboard"
		userName="Admin User"
		userRole="Administrador"
		breadcrumbs={breadcrumbs}
		notifications={12}
	/>
	
	<div class="flex flex-1">
		<!-- Sidebar será implementada aqui -->
		<aside class="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
			<nav class="flex-1 px-4 py-6 space-y-2">
				<!-- Dashboard -->
				<a href="/admin" class="group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg bg-[#00BFB3] text-white shadow-sm">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m8 7 4-4 4 4"/>
					</svg>
					<span class="ml-3">Dashboard</span>
				</a>
				
				<!-- Usuários -->
				<a href="/admin/usuarios" class="group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 hover:text-[#00BFB3]">
					<svg class="w-5 h-5 text-gray-400 group-hover:text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
					</svg>
					<span class="ml-3">Usuários</span>
				</a>
				
				<!-- Produtos -->
				<a href="/admin/produtos" class="group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 hover:text-[#00BFB3]">
					<svg class="w-5 h-5 text-gray-400 group-hover:text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
					</svg>
					<span class="ml-3">Produtos</span>
				</a>
				
				<!-- Pedidos -->
				<a href="/admin/pedidos" class="group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 hover:text-[#00BFB3]">
					<svg class="w-5 h-5 text-gray-400 group-hover:text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
					</svg>
					<span class="ml-3">Pedidos</span>
					<span class="ml-auto px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full">8</span>
				</a>
				
				<!-- Relatórios -->
				<a href="/admin/relatorios" class="group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 hover:text-[#00BFB3]">
					<svg class="w-5 h-5 text-gray-400 group-hover:text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
					</svg>
					<span class="ml-3">Relatórios</span>
				</a>
				
				<!-- Configurações -->
				<a href="/admin/configuracoes" class="group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 hover:text-[#00BFB3]">
					<svg class="w-5 h-5 text-gray-400 group-hover:text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
					</svg>
					<span class="ml-3">Configurações</span>
				</a>
			</nav>
		</aside>
		
		<!-- Main Content -->
		<main class="flex-1 overflow-auto">
			<div class="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<slot />
			</div>
		</main>
	</div>
</div>
