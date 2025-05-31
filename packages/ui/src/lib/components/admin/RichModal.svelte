<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	
	export let isOpen = false;
	export let title = '';
	export let size: 'sm' | 'md' | 'lg' | 'xl' | 'full' = 'md';
	export let closable = true;
	export let persistent = false; // Se true, não fecha ao clicar fora
	export let loading = false;
	
	const dispatch = createEventDispatcher<{
		close: void;
		confirm: void;
		cancel: void;
	}>();
	
	let modalElement: HTMLElement;
	
	const sizeClasses = {
		sm: 'max-w-md',
		md: 'max-w-2xl',
		lg: 'max-w-4xl',
		xl: 'max-w-6xl',
		full: 'max-w-full mx-4'
	};
	
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && closable && !persistent) {
			close();
		}
	}
	
	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget && !persistent) {
			close();
		}
	}
	
	function close() {
		if (closable && !loading) {
			dispatch('close');
			isOpen = false;
		}
	}
	
	function confirm() {
		dispatch('confirm');
	}
	
	function cancel() {
		dispatch('cancel');
		close();
	}
	
	onMount(() => {
		// Focus trap
		if (isOpen && modalElement) {
			const focusableElements = modalElement.querySelectorAll(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			const firstElement = focusableElements[0] as HTMLElement;
			const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
			
			function handleTabKey(e: KeyboardEvent) {
				if (e.key === 'Tab') {
					if (e.shiftKey) {
						if (document.activeElement === firstElement) {
							lastElement.focus();
							e.preventDefault();
						}
					} else {
						if (document.activeElement === lastElement) {
							firstElement.focus();
							e.preventDefault();
						}
					}
				}
			}
			
			modalElement.addEventListener('keydown', handleTabKey);
			firstElement?.focus();
			
			return () => {
				modalElement?.removeEventListener('keydown', handleTabKey);
			};
		}
	});
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
	<!-- Backdrop -->
	<div 
		class="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		on:click={handleBackdropClick}
		transition:fade={{ duration: 200 }}
	>
		<!-- Modal Container -->
		<div 
			bind:this={modalElement}
			class="bg-white rounded-2xl shadow-2xl w-full {sizeClasses[size]} max-h-[90vh] overflow-hidden flex flex-col"
			transition:fly={{ y: 50, duration: 300 }}
			on:click|stopPropagation
		>
			
			<!-- Header -->
			{#if title || closable || $$slots.header}
				<div class="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
					<div class="flex-1">
						{#if $$slots.header}
							<slot name="header" />
						{:else}
							<h2 class="text-xl font-semibold text-gray-900">{title}</h2>
						{/if}
					</div>
					
					{#if closable}
						<button 
							on:click={close}
							disabled={loading}
							class="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
							aria-label="Fechar modal"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
							</svg>
						</button>
					{/if}
				</div>
			{/if}
			
			<!-- Content -->
			<div class="flex-1 overflow-y-auto">
				{#if loading}
					<div class="p-8 space-y-4">
						<div class="flex items-center justify-center">
							<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
							<span class="ml-3 text-gray-600">Carregando...</span>
						</div>
						<div class="space-y-3">
							<div class="h-4 bg-gray-200 rounded animate-pulse"></div>
							<div class="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
							<div class="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
						</div>
					</div>
				{:else}
					<div class="p-6">
						<slot />
					</div>
				{/if}
			</div>
			
			<!-- Footer -->
			{#if $$slots.footer}
				<div class="p-6 border-t border-gray-100 bg-gray-50/50">
					<slot name="footer" />
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Animações customizadas */
	:global(.modal-enter) {
		animation: modalEnter 0.3s ease-out;
	}
	
	:global(.modal-leave) {
		animation: modalLeave 0.2s ease-in;
	}
	
	@keyframes modalEnter {
		from {
			opacity: 0;
			transform: scale(0.9) translateY(20px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}
	
	@keyframes modalLeave {
		from {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
		to {
			opacity: 0;
			transform: scale(0.9) translateY(20px);
		}
	}
	
	/* Smooth scrollbar */
	.flex-1::-webkit-scrollbar {
		width: 6px;
	}
	
	.flex-1::-webkit-scrollbar-track {
		background: #f1f1f1;
	}
	
	.flex-1::-webkit-scrollbar-thumb {
		background: #c1c1c1;
		border-radius: 3px;
	}
	
	.flex-1::-webkit-scrollbar-thumb:hover {
		background: #a8a8a8;
	}
</style> 