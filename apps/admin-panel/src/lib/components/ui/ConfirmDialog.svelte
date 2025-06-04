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
	
	// Cores baseadas na variante
	const variants = {
		danger: {
			icon: 'alert' as const,
			color: 'text-red-600',
			bgColor: 'bg-red-100',
			buttonClass: 'bg-red-600 hover:bg-red-700 text-white'
		},
		warning: {
			icon: 'warning' as const,
			color: 'text-amber-600',
			bgColor: 'bg-amber-100', 
			buttonClass: 'bg-amber-600 hover:bg-amber-700 text-white'
		},
		info: {
			icon: 'info' as const,
			color: 'text-blue-600',
			bgColor: 'bg-blue-100',
			buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white'
		}
	} as const;
	
	// Use $derived ao invés de $:
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
			<div class="relative transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all w-full max-w-md animate-scale-in">
				<!-- Content -->
				<div class="p-6">
					<!-- Icon -->
					<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full {currentVariant.bgColor}">
						<ModernIcon name={currentVariant.icon} size={24} color={currentVariant.color} />
					</div>
					
					<!-- Text -->
					<div class="mt-4 text-center">
						<h3 class="text-lg font-semibold text-gray-900">
							{title}
						</h3>
						<p class="mt-2 text-sm text-gray-600">
							{message}
						</p>
					</div>
				</div>
				
				<!-- Actions -->
				<div class="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse sm:gap-3">
					<button
						type="button"
						onclick={handleConfirm}
						class="inline-flex w-full justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto {currentVariant.buttonClass}"
					>
						{confirmText}
					</button>
					<button
						type="button"
						onclick={handleCancel}
						class="mt-3 inline-flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:ring-offset-2 sm:mt-0 sm:w-auto"
					>
						{cancelText}
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