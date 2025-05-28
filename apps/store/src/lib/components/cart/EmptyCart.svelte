<script lang="ts">
	import { scale, fade } from 'svelte/transition';
	import { elasticOut } from 'svelte/easing';
	import { CART_CONSTANTS } from './constants';
	
	interface EmptyCartProps {
		onContinueShopping: () => void;
	}
	
	let { onContinueShopping }: EmptyCartProps = $props();
	const { MESSAGES } = CART_CONSTANTS;
</script>

<div class="flex flex-col items-center justify-center h-full p-8 text-center">
	<div 
		class="bg-gradient-to-br from-[#00BFB3]/10 to-[#00A89D]/10 rounded-full p-8 shadow-lg mb-6 relative"
		transition:scale={{ duration: 600, delay: 100, easing: elasticOut }}
	>
		<!-- Animated circles background -->
		<div class="absolute inset-0 rounded-full overflow-hidden">
			<div class="absolute w-32 h-32 bg-[#00BFB3]/20 rounded-full -top-8 -left-8 animate-blob"></div>
			<div class="absolute w-24 h-24 bg-[#00A89D]/20 rounded-full -bottom-6 -right-6 animate-blob animation-delay-2000"></div>
			<div class="absolute w-20 h-20 bg-[#00BFB3]/15 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-blob animation-delay-4000"></div>
		</div>
		
		<svg class="w-32 h-32 text-[#00BFB3]/40 relative z-10 animate-float" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
		</svg>
	</div>
	
	<h3 
		class="text-2xl font-bold text-gray-900 mb-2"
		transition:fade={{ duration: 400, delay: 300 }}
	>
		{MESSAGES.EMPTY_CART}
	</h3>
	
	<p 
		class="text-gray-600 mb-8 max-w-sm"
		transition:fade={{ duration: 400, delay: 400 }}
	>
		{MESSAGES.EMPTY_CART_SUBTITLE}
	</p>
	
	<button 
		onclick={onContinueShopping}
		class="px-8 py-4 bg-gradient-to-r from-[#00BFB3] to-[#00A89D] text-white font-semibold rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 hover:gap-3 group"
		transition:scale={{ duration: 400, delay: 500, easing: elasticOut }}
	>
		<svg class="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h10M7 12h10m-7 5h4m-9 4h14l1-12H4l1 12z" />
		</svg>
		<span>Explorar Produtos</span>
		<svg class="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
		</svg>
	</button>
</div>

<style>
	@keyframes float {
		0%, 100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-10px);
		}
	}
	
	.animate-float {
		animation: float 3s ease-in-out infinite;
	}
	
	@keyframes blob {
		0%, 100% {
			transform: translate(0, 0) scale(1);
		}
		25% {
			transform: translate(20px, -30px) scale(1.1);
		}
		50% {
			transform: translate(-20px, 20px) scale(0.9);
		}
		75% {
			transform: translate(30px, 10px) scale(1.05);
		}
	}
	
	.animate-blob {
		animation: blob 7s ease-in-out infinite;
	}
	
	.animation-delay-2000 {
		animation-delay: 2s;
	}
	
	.animation-delay-4000 {
		animation-delay: 4s;
	}
</style> 