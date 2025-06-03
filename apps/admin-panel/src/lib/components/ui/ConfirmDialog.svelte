<script lang="ts">
	import ModernIcon from '../shared/ModernIcon.svelte';
	
	export let show = false;
	export let title = 'Confirmar ação';
	export let message = 'Tem certeza que deseja continuar?';
	export let confirmText = 'Confirmar';
	export let cancelText = 'Cancelar';
	export let variant: 'danger' | 'warning' | 'info' = 'warning';
	export let onConfirm: () => void = () => {};
	export let onCancel: () => void = () => {};
	
	// Cores baseadas na variante
	const variantStyles = {
		danger: {
			icon: 'AlertTriangle',
			iconColor: '#DC2626',
			bgColor: 'bg-red-50',
			borderColor: 'border-red-200',
			buttonClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
		},
		warning: {
			icon: 'AlertTriangle',
			iconColor: '#D97706',
			bgColor: 'bg-amber-50',
			borderColor: 'border-amber-200',
			buttonClass: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
		},
		info: {
			icon: 'info',
			iconColor: '#2563EB',
			bgColor: 'bg-blue-50',
			borderColor: 'border-blue-200',
			buttonClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
		}
	};
	
	$: style = variantStyles[variant];
	
	function handleConfirm() {
		onConfirm();
		show = false;
	}
	
	function handleCancel() {
		onCancel();
		show = false;
	}
	
	// Fechar com ESC
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && show) {
			handleCancel();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

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
					<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full {style.bgColor}">
						<ModernIcon name={style.icon} size={24} color={style.iconColor} />
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
						class="inline-flex w-full justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto {style.buttonClass}"
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