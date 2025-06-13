<!-- Deploy seletivo funcionando! -->
<script lang="ts">
	import '../app.css';
	import { onMount, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth, user, isAuthenticated } from '$lib/stores/authStore';
	import Footer from '$lib/components/layout/Footer.svelte';
	import SearchBox from '$lib/components/search/SearchBox.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import { cartStore } from '$lib/stores/cartStore';
	import { wishlistCount } from '$lib/stores/wishlistStore';
	import { notificationStore } from '$lib/stores/notificationStore';
	import Header from '$lib/components/layout/Header.svelte';
	import MobileHeader from '$lib/components/layout/MobileHeader.svelte';
	import TopBar from '$lib/components/layout/TopBar.svelte';
	import DesktopCategoryMenu from '$lib/components/navigation/DesktopCategoryMenu.svelte';
	import MobileCategoryMenu from '$lib/components/navigation/MobileCategoryMenu.svelte';
	import BannerCarousel from '$lib/components/layout/BannerCarousel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { frontendCache } from '$lib/cache/frontend-cache';
	import ChatWidget from '$lib/components/chat/ChatWidget.svelte';
	import { toastStore } from '$lib/stores/toastStore';
	import { unreadCount } from '$lib/stores/notificationStore';
	// import CartVersionIndicator from '$lib/features/cart/components/CartVersionIndicator.svelte';
	
	// Suite de validação completa (apenas em desenvolvimento)
	if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
		import('$lib/features/cart/stores/validation-suite').catch(() => {
			console.log('🧪 Suite de validação não disponível');
		});
	}

	// Types
	interface Product {
		readonly id: string;
		readonly name: string;
		readonly slug: string;
		readonly price: number;
		[key: string]: any;
	}

	// Props
	let { children } = $props();

	// State
	let mobileMenuOpen = $state(false);
	
	// Stores
	const { sellerGroups } = cartStore;
	
	// Computed
	let totalItems = $derived(
		$sellerGroups.reduce((sum: number, group: any) => 
			sum + group.items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0
		)
	);

	// Chat widget visibility
	let shouldShowWidget = $derived(
		!(['/login', '/cadastro', '/admin', '/seller'].some(route => $page.url.pathname.startsWith(route)))
	);

	// Lifecycle
	onMount(() => {
		// Inicializar cache do frontend
		frontendCache.init().then(() => {
			frontendCache.preload();
		});
		
		// Check auth
		auth.checkAuth();
	});

	// UI actions
	async function handleLogout(): Promise<void> {
		await auth.logout();
	}
	
	function openCart(): void {
		// Ir direto para a página do carrinho em vez de abrir preview
		goto('/cart');
	}

</script>

<!-- TopBar Promocional -->
<TopBar />

<!-- Header Desktop -->
<Header 
	totalItems={totalItems} 
	onOpenCart={openCart}
	onLogout={handleLogout}
	class="hidden md:block"
/>

<!-- Header Mobile -->
<MobileHeader 
	totalItems={totalItems} 
	onOpenCart={openCart}
	onOpenMenu={() => mobileMenuOpen = true}
	class="md:hidden"
/>

<!-- Mobile Menu -->
<MobileCategoryMenu bind:isOpen={mobileMenuOpen} onClose={() => mobileMenuOpen = false} />

<!-- Main Content -->
<main class="min-h-screen bg-white">
	{#if children}
		{@render children()}
	{/if}
</main>

<!-- Footer -->
<Footer />

<!-- Toast Container -->
<ToastContainer />

<!-- Chat Widget - Aparece em todas as páginas (exceto admin/login) -->
{#if shouldShowWidget}
	<ChatWidget />
{/if}

<!-- Cart Version Indicator (apenas em desenvolvimento) -->
<!-- <CartVersionIndicator /> -->

<!-- Indicador temporário de versão do cart -->
{#if typeof window !== 'undefined' && window.location.hostname === 'localhost'}
  <div class="fixed bottom-4 right-4 z-50 bg-green-800 text-white px-3 py-2 rounded-lg text-xs font-mono animate-pulse">
    Cart Store: 🆕 NEW v2.0 (Testing Mode)
  </div>
{/if}

<style>
	/* Garantir fundo branco global */
	:global(html, body) {
		background-color: white !important;
	}
	
	:global(body) {
		font-family: 'Lato', sans-serif;
	}
	
	:global(#app, main) {
		background-color: white !important;
	}
</style>
