<script lang="ts">
	import SearchBox from '../search/SearchBox.svelte';
	
	interface MobileHeaderProps {
		totalItems: number;
		onOpenCart: () => void;
		onOpenMenu: () => void;
		class?: string;
	}
	
	let { 
		totalItems = 0,
		onOpenCart,
		onOpenMenu,
		class: className = ''
	}: MobileHeaderProps = $props();
</script>

<header class="lg:hidden bg-[#00BBB4] sticky top-0 z-20 {className}">
	<div class="grid grid-cols-3 items-center p-4">
		<!-- Menu Button -->
		<div class="flex justify-start">
			<button
				onclick={onOpenMenu}
				class="text-white"
				aria-label="Menu"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</button>
		</div>
		
		<!-- Logo - Perfeitamente centralizado -->
		<div class="flex justify-center">
			<a href="/" class="inline-block">
				<img src="/logo.png" alt="Grão de Gente" class="h-8 w-auto filter brightness-0 invert" />
			</a>
		</div>
		
		<!-- Actions - Alinhado à direita -->
		<div class="flex justify-end">
			<div class="flex items-center gap-4">
				<a href="/favoritos" class="flex items-center justify-center w-6 h-6 text-white hover:text-white/80 transition" aria-label="Favoritos">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 28 26" fill="none" aria-hidden="true">
						<path d="M9.6417 2C11.0691 2 12.5816 2.69442 14.1572 4.0601C17.3082 1.58335 21.518 1.64949 24.0799 4.34117C25.5092 5.84876 26.3115 7.8889 26.3115 10.0155C26.3115 12.1422 25.5092 14.1823 24.0799 15.6899L24.0547 15.7164L16.7505 22.9317C16.0489 23.6255 15.1212 24.012 14.1572 24.012C13.1931 24.012 12.2655 23.6255 11.5638 22.9317L4.25969 15.7164L4.23448 15.6899C3.16683 14.5676 2.4401 13.1385 2.14609 11.583C1.85208 10.0275 2.00398 8.4154 2.5826 6.95044C3.16123 5.48549 4.14061 4.23337 5.39704 3.35225C6.65346 2.47114 8.13055 2.00058 9.6417 2Z" fill="#F17179" stroke="white" stroke-width="2.24368"/>
					</svg>
				</a>
				
				<button 
					onclick={onOpenCart}
					class="relative flex items-center justify-center w-6 h-6 text-white hover:text-white/80 transition" 
					aria-label="Carrinho de compras"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 21 27" fill="none">
						<path d="M20.6673 21.6562L19.1315 8.58457C19.0395 7.94666 18.7153 7.36517 18.2209 6.95159C17.7266 6.53801 17.097 6.32146 16.4529 6.34346H15.2475C15.2475 6.17381 15.2475 6.00417 15.1939 5.83452C14.9975 4.4595 14.8279 3.27198 13.7743 2.26303C13.3979 1.86417 12.9439 1.5464 12.4403 1.32921C11.9367 1.11203 11.3941 1 10.8457 1C10.2972 1 9.75457 1.11203 9.25097 1.32921C8.74737 1.5464 8.29345 1.86417 7.91703 2.26303C6.86344 3.27198 6.6938 4.4595 6.49736 5.83452C6.49736 6.00417 6.49736 6.17381 6.44379 6.34346H5.21163C4.56749 6.32146 3.9379 6.53801 3.44359 6.95159C2.94927 7.36517 2.62502 7.94666 2.53301 8.58457L1.02405 21.6562C0.964049 22.1816 1.01662 22.7136 1.17827 23.2171C1.33992 23.7205 1.60695 24.1837 1.96157 24.5759C2.37578 25.0315 2.8822 25.3937 3.44718 25.6385C4.01216 25.8832 4.62276 26.005 5.23841 25.9956H16.4529C17.0634 26.0023 17.6684 25.8801 18.2285 25.637C18.7885 25.3939 19.291 25.0354 19.703 24.5849C20.0635 24.1939 20.3362 23.7302 20.5025 23.225C20.6688 22.7199 20.725 22.1849 20.6673 21.6562ZM8.26525 6.09345C8.46169 4.73629 8.56883 4.11128 9.15813 3.54877C9.59811 3.08132 10.2042 2.80554 10.8457 2.7809C11.4884 2.80788 12.0947 3.08695 12.5332 3.55769C13.1225 4.1202 13.2296 4.74522 13.4261 6.10238C13.4261 6.18274 13.4261 6.27203 13.4261 6.35239H8.2474C8.25632 6.2631 8.25632 6.17381 8.26525 6.09345ZM18.3636 23.3884C18.1198 23.6501 17.8237 23.8577 17.4946 23.9976C17.1654 24.1376 16.8105 24.2069 16.4529 24.2009H5.23841C4.88078 24.2069 4.52589 24.1376 4.19673 23.9976C3.86757 23.8577 3.57149 23.6501 3.32767 23.3884C3.1363 23.1863 2.99093 22.9453 2.90153 22.6817C2.81214 22.4182 2.78085 22.1384 2.8098 21.8616L4.33661 8.78993C4.38894 8.59514 4.50567 8.4238 4.6678 8.30382C4.82993 8.18385 5.02791 8.1223 5.22949 8.1292H6.38129C6.38129 8.4685 6.38129 8.80779 6.47058 9.14708C6.50255 9.38388 6.62728 9.59829 6.81733 9.74313C7.00738 9.88797 7.24719 9.95138 7.48399 9.91941C7.72079 9.88745 7.9352 9.76272 8.08004 9.57266C8.22488 9.38261 8.28829 9.14281 8.25632 8.906C8.25632 8.64707 8.25632 8.38814 8.20275 8.1292H13.5243C13.5243 8.38814 13.5243 8.64707 13.4707 8.906C13.4341 9.13523 13.4882 9.36971 13.6215 9.55973C13.7549 9.74974 13.957 9.88036 14.185 9.92388H14.31C14.5267 9.92601 14.7367 9.84929 14.901 9.70801C15.0653 9.56674 15.1726 9.37054 15.2029 9.15601C15.2475 8.81672 15.2743 8.47742 15.2922 8.13813H16.4886C16.6902 8.13123 16.8882 8.19278 17.0503 8.31275C17.2124 8.43273 17.3292 8.60407 17.3815 8.79886L18.8815 21.8616C18.9105 22.1384 18.8792 22.4182 18.7898 22.6817C18.7004 22.9453 18.555 23.1863 18.3636 23.3884Z" fill="white" stroke="white" stroke-width="0.178575"/>
					</svg>
					{#if totalItems > 0}
						<span class="absolute -top-2 -right-2 bg-white text-[#00BBB4] text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
							{totalItems}
						</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
	
	<!-- Search Bar Mobile -->
	<div class="px-4 pb-4">
		<SearchBox />
	</div>
</header> 