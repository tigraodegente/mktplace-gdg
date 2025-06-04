<script lang="ts">
	import ModernIcon from '../shared/ModernIcon.svelte';
	
	interface Props {
		show?: boolean;
		title?: string;
		message?: string;
		confirmText?: string;
		cancelText?: string;
		variant?: 'danger' | 'warning' | 'info';
		onConfirm?: () => void;
		onCancel?: () => void;
	}
	
	let {
		show = false,
		title = 'Confirmar ação',
		message = 'Tem certeza que deseja continuar?',
		confirmText = 'Confirmar',
		cancelText = 'Cancelar',
		variant = 'warning',
		onConfirm = () => {},
		onCancel = () => {}
	}: Props = $props();
	
	// Ícones baseados na variante
	const variants = {
		danger: {
			icon: 'delete' as const,
			iconColor: 'text-red-500'
		},
		warning: {
			icon: 'warning' as const,
			iconColor: 'text-yellow-500'
		},
		info: {
			icon: 'info' as const,
			iconColor: 'text-blue-500'
		}
	} as const;
	
	const currentVariant = $derived(variants[variant]);
	
	function handleConfirm() {
		onConfirm();
		show = false;
	}
	
	function handleCancel() {
		show = false;
		onCancel();
	}
	
	// Fechar com ESC
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && show) {
			handleCancel();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<!-- Backdrop -->
		<div 
			class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
			onclick={handleCancel}
		></div>
		
		<!-- Dialog -->
		<div class="flex min-h-full items-center justify-center p-4">
			<div class="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all w-full max-w-md animate-scale-in">
				<!-- Content -->
				<div class="p-6">
					<!-- Header com ícone -->
					<div class="flex items-center gap-3 mb-4">
						<div class="flex-shrink-0">
							<ModernIcon name={currentVariant.icon} size="md" />
						</div>
						<h3 class="text-lg font-semibold text-gray-900">
							{title}
						</h3>
					</div>
					
					<!-- Mensagem -->
					<div class="text-sm text-gray-600 leading-relaxed">
						{message}
					</div>
				</div>
				
				<!-- Actions -->
				<div class="bg-gray-50 px-6 py-4 flex justify-end gap-3">
					<button
						type="button"
						onclick={handleCancel}
						class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
					>
						{cancelText}
					</button>
					<button
						type="button"
						onclick={handleConfirm}
						class="px-4 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors text-sm font-medium"
					>
						{confirmText}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes scale-in {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
	
	.animate-scale-in {
		animation: scale-in 0.2s ease-out;
	}
</style> 