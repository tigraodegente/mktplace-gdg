<script lang="ts">
	import { onMount } from 'svelte';
	
	let lists = [];
	let loading = true;
	let stats = {
		total: 0,
		active: 0,
		completed: 0,
		totalContributions: 0
	};
	
	onMount(async () => {
		await loadLists();
		await loadStats();
	});
	
	async function loadLists() {
		try {
			// TODO: Implementar API para admin buscar todas as listas
			const response = await fetch('/api/gift-lists?admin=true');
			const result = await response.json();
			if (result.success) {
				lists = result.data;
			}
		} catch (error) {
			console.error('Erro ao carregar listas:', error);
		} finally {
			loading = false;
		}
	}
	
	async function loadStats() {
		try {
			// TODO: Implementar API para estatísticas
			const response = await fetch('/api/gift-lists/stats');
			const result = await response.json();
			if (result.success) {
				stats = result.data;
			}
		} catch (error) {
			console.error('Erro ao carregar estatísticas:', error);
		}
	}
</script>

<svelte:head>
	<title>Gestão de Listas de Presentes - Admin</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">🎁 Listas de Presentes</h1>
			<p class="mt-1 text-sm text-gray-600">
				Gerencie todas as listas de presentes da plataforma
			</p>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
		<div class="bg-white overflow-hidden shadow rounded-lg">
			<div class="p-5">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
							<span class="text-white text-sm">📋</span>
						</div>
					</div>
					<div class="ml-5 w-0 flex-1">
						<dl>
							<dt class="text-sm font-medium text-gray-500 truncate">Total de Listas</dt>
							<dd class="text-lg font-medium text-gray-900">{stats.total}</dd>
						</dl>
					</div>
				</div>
			</div>
		</div>

		<div class="bg-white overflow-hidden shadow rounded-lg">
			<div class="p-5">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
							<span class="text-white text-sm">✅</span>
						</div>
					</div>
					<div class="ml-5 w-0 flex-1">
						<dl>
							<dt class="text-sm font-medium text-gray-500 truncate">Listas Ativas</dt>
							<dd class="text-lg font-medium text-gray-900">{stats.active}</dd>
						</dl>
					</div>
				</div>
			</div>
		</div>

		<div class="bg-white overflow-hidden shadow rounded-lg">
			<div class="p-5">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
							<span class="text-white text-sm">🎉</span>
						</div>
					</div>
					<div class="ml-5 w-0 flex-1">
						<dl>
							<dt class="text-sm font-medium text-gray-500 truncate">Listas Completas</dt>
							<dd class="text-lg font-medium text-gray-900">{stats.completed}</dd>
						</dl>
					</div>
				</div>
			</div>
		</div>

		<div class="bg-white overflow-hidden shadow rounded-lg">
			<div class="p-5">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
							<span class="text-white text-sm">💰</span>
						</div>
					</div>
					<div class="ml-5 w-0 flex-1">
						<dl>
							<dt class="text-sm font-medium text-gray-500 truncate">Total Contribuições</dt>
							<dd class="text-lg font-medium text-gray-900">{stats.totalContributions}</dd>
						</dl>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Filters -->
	<div class="bg-white shadow rounded-lg">
		<div class="px-4 py-5 sm:p-6">
			<div class="flex flex-col sm:flex-row gap-4">
				<div class="flex-1">
					<input
						type="text"
						placeholder="Buscar listas..."
						class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
					/>
				</div>
				<div>
					<select class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
						<option value="">Todos os tipos</option>
						<option value="baby_shower">Chá de Bebê</option>
						<option value="wedding">Casamento</option>
						<option value="birthday">Aniversário</option>
						<option value="custom">Personalizado</option>
					</select>
				</div>
				<div>
					<select class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
						<option value="">Todos os status</option>
						<option value="active">Ativa</option>
						<option value="completed">Completa</option>
						<option value="expired">Expirada</option>
						<option value="cancelled">Cancelada</option>
					</select>
				</div>
			</div>
		</div>
	</div>

	<!-- Lista de Listas -->
	<div class="bg-white shadow overflow-hidden sm:rounded-md">
		<div class="px-4 py-5 sm:px-6">
			<h3 class="text-lg leading-6 font-medium text-gray-900">
				Listas de Presentes Recentes
			</h3>
			<p class="mt-1 max-w-2xl text-sm text-gray-500">
				Gerencie e monitore todas as listas criadas na plataforma
			</p>
		</div>
		
		{#if loading}
			<div class="text-center py-12">
				<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
				<p class="mt-2 text-gray-600">Carregando listas...</p>
			</div>
		{:else if lists.length === 0}
			<div class="text-center py-12">
				<div class="text-4xl mb-4">🎁</div>
				<h3 class="text-lg font-medium text-gray-900 mb-2">Nenhuma lista encontrada</h3>
				<p class="text-gray-600">As listas de presentes aparecerão aqui quando forem criadas.</p>
			</div>
		{:else}
			<ul class="divide-y divide-gray-200">
				{#each lists as list}
					<li>
						<div class="px-4 py-4 flex items-center justify-between">
							<div class="flex items-center">
								<div class="flex-shrink-0 h-10 w-10">
									<div class="h-10 w-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center">
										<span class="text-white text-lg">
											{list.type === 'baby_shower' ? '👶' : 
											 list.type === 'wedding' ? '💒' : 
											 list.type === 'birthday' ? '🎂' : '🎁'}
										</span>
									</div>
								</div>
								<div class="ml-4">
									<div class="text-sm font-medium text-gray-900">
										{list.title}
									</div>
									<div class="text-sm text-gray-500">
										Criado por {list.owner_name || 'Usuário'} • {list.total_items || 0} itens
									</div>
								</div>
							</div>
							<div class="flex items-center space-x-4">
								<div class="text-right">
									<div class="text-sm font-medium text-gray-900">
										{list.completion_percentage || 0}% completo
									</div>
									<div class="text-sm text-gray-500">
										{list.contribution_count || 0} contribuições
									</div>
								</div>
								<div class="flex space-x-2">
									<button class="text-blue-600 hover:text-blue-900 text-sm font-medium">
										Ver
									</button>
									<button class="text-red-600 hover:text-red-900 text-sm font-medium">
										Suspender
									</button>
								</div>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div> 