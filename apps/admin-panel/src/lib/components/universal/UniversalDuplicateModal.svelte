<script lang="ts">
	import type { FormConfig } from '$lib/config/formConfigs';
	
	// Props
	interface Props {
		config: FormConfig;
		entityId?: string;
		formData: any;
		isOpen: boolean;
		onClose: () => void;
		onSuccess: (newId: string) => void;
	}
	
	let { config, entityId, formData, isOpen, onClose, onSuccess }: Props = $props();
	
	// Estados
	let loading = $state(false);
	let error = $state<string | null>(null);
	let customName = $state('');
	
	// Inicializar nome customizado
	$effect(() => {
		if (isOpen && formData.name) {
			customName = `${formData.name} - Cópia`;
		}
	});
	
	// Duplicar
	async function handleDuplicate() {
		if (!entityId) return;
		
		loading = true;
		error = null;
		
		try {
			// Simular duplicação por enquanto
			const result = {
				success: true,
				data: { id: 'new-id-' + Date.now() }
			};
			
			if (result.success) {
				onSuccess(result.data.id);
			} else {
				error = 'Erro ao duplicar';
			}
		} catch (err) {
			error = 'Erro ao duplicar';
		} finally {
			loading = false;
		}
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
		<div class="bg-white rounded-lg max-w-md w-full shadow-2xl">
			<!-- Header -->
			<div class="p-6 border-b">
				<h2 class="text-xl font-semibold text-gray-900">
					Duplicar {config.title}
				</h2>
			</div>
			
			<!-- Content -->
			<div class="p-6">
				{#if error}
					<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
						<p class="text-sm text-red-600">{error}</p>
					</div>
				{/if}
				
				<div class="mb-4">
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Nome da cópia
					</label>
					<input
						type="text"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						bind:value={customName}
						placeholder="Nome para a cópia"
					/>
				</div>
				
				<p class="text-sm text-gray-600">
					Uma cópia de "{formData.name || 'este item'}" será criada com o nome especificado.
				</p>
			</div>
			
			<!-- Footer -->
			<div class="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
				<button
					type="button"
					onclick={onClose}
					class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
				>
					Cancelar
				</button>
				<button
					type="button"
					onclick={handleDuplicate}
					disabled={loading || !customName}
					class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
				>
					{loading ? 'Duplicando...' : 'Duplicar'}
				</button>
			</div>
		</div>
	</div>
{/if} 