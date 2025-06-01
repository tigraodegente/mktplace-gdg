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
		class="bg-[#00BFB3]/10 rounded-full p-8 shadow-lg mb-6 relative"
		transition:scale={{ delay: 200, duration: 300 }}
	>
		<!-- Ícone animado -->
		<svg 
			class="w-20 h-20 text-[#00BFB3] animate-bounce"
			fill="none" 
			stroke="currentColor" 
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
		</svg>
		
		<!-- Efeito de pulso -->
		<div class="absolute inset-0 bg-[#00BFB3]/5 rounded-full animate-ping"></div>
	</div>
	
	<h2 class="text-2xl font-bold text-gray-900 mb-4">Seu carrinho está vazio</h2>
	<p class="text-gray-600 mb-8 max-w-md">
		Que tal começar adicionando alguns produtos incríveis ao seu carrinho?
	</p>
	
	<!-- CTA Button -->
	<a 
		href="/categorias"
		class="px-8 py-4 bg-[#00BFB3] text-white font-semibold rounded-xl hover:bg-[#00A89D] hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 hover:gap-3 group"
		transition:fly={{ delay: 400, duration: 300, y: 20 }}
	>
		<svg class="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h10M7 12h10m-7 5h4m-9 4h14l1-12H4l1 12z" />
		</svg>
		<span>Explorar Produtos</span>
		<svg class="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
		</svg>
	</a>
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