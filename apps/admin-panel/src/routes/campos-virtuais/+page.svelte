<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import type { VirtualField } from '$lib/types/virtualFields';
	import { virtualFieldService } from '$lib/services/virtualFieldService';

	let virtualFields = writable<VirtualField[]>([]);
	let loading = true;
	let error = '';

	onMount(async () => {
		try {
			const response = await virtualFieldService.getAll();
			if (response.success) {
				virtualFields.set(response.data);
			} else {
				error = response.error?.message || 'Erro ao carregar campos virtuais';
			}
		} catch (e) {
			error = 'Erro de conexão';
		} finally {
			loading = false;
		}
	});

	async function toggleField(fieldId: string, enabled: boolean) {
		try {
			const response = await virtualFieldService.update(fieldId, { enabled });
			if (response.success) {
				virtualFields.update(fields => 
					fields.map(f => f.id === fieldId ? { ...f, enabled } : f)
				);
			}
		} catch (e) {
			console.error('Erro ao atualizar campo:', e);
		}
	}
</script>

<div class="p-6">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 mb-2">Campos Virtuais</h1>
		<p class="text-gray-600">
			Gerencie campos calculados automaticamente com base em outros dados do produto.
		</p>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00BFB3]"></div>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<p class="text-red-800">{error}</p>
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow overflow-hidden">
			<div class="px-6 py-4 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">
					Campos Disponíveis ({$virtualFields.length})
				</h2>
			</div>
			
			<div class="divide-y divide-gray-200">
				{#each $virtualFields as field}
					<div class="p-6 hover:bg-gray-50">
						<div class="flex items-center justify-between">
							<div class="flex-1">
								<div class="flex items-center gap-3 mb-2">
									<h3 class="text-lg font-medium text-gray-900">{field.name}</h3>
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
										{field.type}
									</span>
								</div>
								<p class="text-gray-600 mb-2">{field.description}</p>
								<div class="text-sm text-gray-500">
									<span class="font-medium">Fórmula:</span> {field.formula}
								</div>
								{#if field.dependencies.length > 0}
									<div class="text-sm text-gray-500 mt-1">
										<span class="font-medium">Depende de:</span> 
										{field.dependencies.join(', ')}
									</div>
								{/if}
							</div>
							
							<div class="flex items-center gap-4">
								<div class="flex items-center">
									<input
										type="checkbox"
										checked={field.enabled}
										on:change={(e) => toggleField(field.id, e.target.checked)}
										class="h-4 w-4 text-[#00BFB3] focus:ring-[#00BFB3] border-gray-300 rounded"
									/>
									<label class="ml-2 text-sm text-gray-700">
										{field.enabled ? 'Ativo' : 'Inativo'}
									</label>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div> 