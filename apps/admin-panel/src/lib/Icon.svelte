<script lang="ts">
	export let name: string;
	export let size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
	export let fallbackColor: string = 'text-gray-600';
	
	// Mapear nomes para emojis e SVGs
	const iconMap: Record<string, { emoji: string; svg: string }> = {
		dashboard: {
			emoji: '📊',
			svg: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
		},
		products: {
			emoji: '📦',
			svg: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
		},
		orders: {
			emoji: '🛒',
			svg: 'M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01'
		},
		users: {
			emoji: '👥',
			svg: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z'
		},
		reports: {
			emoji: '📈',
			svg: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
		},
		settings: {
			emoji: '⚙️',
			svg: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
		},
		switch: {
			emoji: '🔄',
			svg: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
		},
		logout: {
			emoji: '🚪',
			svg: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
		},
		add: {
			emoji: '➕',
			svg: 'M12 4v16m8-8H4'
		},
		test: {
			emoji: '🧪',
			svg: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547A8.014 8.014 0 008 21a8.014 8.014 0 003.756-5.828z'
		}
	};
	
	// Tamanhos
	const sizeClasses = {
		sm: 'w-4 h-4',
		md: 'w-5 h-5', 
		lg: 'w-6 h-6',
		xl: 'w-8 h-8'
	};
	
	const emojiSizes = {
		sm: 'text-sm',
		md: 'text-base',
		lg: 'text-lg',
		xl: 'text-2xl'
	};
	
	let emojiSupport = false;
	
	// Detectar suporte a emoji no lado do cliente
	function detectEmojiSupport() {
		if (typeof window === 'undefined') return false;
		
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		canvas.width = 10;
		canvas.height = 10;
		
		if (context) {
			context.textBaseline = 'top';
			context.font = '16px Arial';
			context.fillText('😀', 0, 0);
			const emojiData = context.getImageData(0, 0, 10, 10).data;
			return emojiData.some(pixel => pixel !== 0);
		}
		return false;
	}
	
	// Detectar quando componente é montado
	import { onMount } from 'svelte';
	onMount(() => {
		emojiSupport = detectEmojiSupport();
	});
	
	$: icon = iconMap[name];
	$: sizeClass = sizeClasses[size];
	$: emojiSize = emojiSizes[size];
</script>

{#if icon}
	{#if emojiSupport && icon.emoji}
		<span class="menu-icon {emojiSize}">{icon.emoji}</span>
	{:else if icon.svg}
		<svg class="{sizeClass} {fallbackColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="{icon.svg}" />
		</svg>
	{:else}
		<span class="menu-icon {emojiSize}">•</span>
	{/if}
{:else}
	<span class="menu-icon {emojiSize}">•</span>
{/if} 