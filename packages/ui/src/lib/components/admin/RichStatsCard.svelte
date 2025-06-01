<script lang="ts">
	interface Props {
		title: string;
		value: string | number;
		change?: string;
		changeType?: 'positive' | 'negative' | 'neutral';
		icon?: string;
		gradient?: boolean;
		href?: string;
		clickable?: boolean;
		loading?: boolean;
	}
	
	let { 
		title,
		value,
		change = '',
		changeType = 'neutral',
		icon = '',
		gradient = false,
		href = '',
		clickable = !!href,
		loading = false
	}: Props = $props();
	
	const iconMap: Record<string, string> = {
		users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z',
		revenue: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
		products: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
		orders: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
		growth: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
		heart: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
		star: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
	};
	
	const iconPath = $derived(iconMap[icon] || icon);
</script>

{#if href}
	<a 
		href={href}
		class="group block transition-all duration-300 hover:scale-105"
	>
		<div class="rich-stats-card {gradient ? 'gradient-card' : ''} {clickable ? 'clickable' : ''}">
			<div class="card-content">
				{#if loading}
					<div class="space-y-3">
						<div class="flex justify-between items-start">
							<div class="space-y-2">
								<div class="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
								<div class="h-8 bg-gray-200 rounded animate-pulse w-16"></div>
							</div>
							<div class="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
						</div>
						<div class="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
					</div>
				{:else}
					<div class="flex justify-between items-start mb-4">
						<div class="flex-1">
							<p class="card-title">{title}</p>
							<div class="card-value">{value}</div>
						</div>
						
						{#if iconPath}
							<div class="icon-container {gradient ? 'gradient-icon' : ''}">
								<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={iconPath}/>
								</svg>
							</div>
						{/if}
					</div>
					
					{#if change}
						<div class="flex items-center text-sm">
							{#if changeType === 'positive'}
								<svg class="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
								</svg>
								<span class="text-green-600 font-semibold">{change}</span>
							{:else if changeType === 'negative'}
								<svg class="w-4 h-4 text-red-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"/>
								</svg>
								<span class="text-red-600 font-semibold">{change}</span>
							{:else}
								<span class="text-gray-600 font-semibold">{change}</span>
							{/if}
							<span class="text-gray-500 ml-1">vs. período anterior</span>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</a>
{:else}
	<div class="rich-stats-card {gradient ? 'gradient-card' : ''} {clickable ? 'clickable' : ''}">
		<div class="card-content">
			{#if loading}
				<div class="space-y-3">
					<div class="flex justify-between items-start">
						<div class="space-y-2">
							<div class="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
							<div class="h-8 bg-gray-200 rounded animate-pulse w-16"></div>
						</div>
						<div class="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
					</div>
					<div class="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
				</div>
			{:else}
				<div class="flex justify-between items-start mb-4">
					<div class="flex-1">
						<p class="card-title">{title}</p>
						<div class="card-value">{value}</div>
					</div>
					
					{#if iconPath}
						<div class="icon-container {gradient ? 'gradient-icon' : ''}">
							<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={iconPath}/>
							</svg>
						</div>
					{/if}
				</div>
				
				{#if change}
					<div class="flex items-center text-sm">
						{#if changeType === 'positive'}
							<svg class="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
							</svg>
							<span class="text-green-600 font-semibold">{change}</span>
						{:else if changeType === 'negative'}
							<svg class="w-4 h-4 text-red-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"/>
							</svg>
							<span class="text-red-600 font-semibold">{change}</span>
						{:else}
							<span class="text-gray-600 font-semibold">{change}</span>
						{/if}
						<span class="text-gray-500 ml-1">vs. período anterior</span>
					</div>
				{/if}
			{/if}
		</div>
	</div>
{/if}

<style>
	.rich-stats-card {
		@apply bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300;
	}
	
	.rich-stats-card:hover {
		@apply shadow-lg border-primary-200;
	}
	
	.gradient-card {
		@apply bg-gradient-to-br from-primary-500 to-primary-600 border-0;
	}
	
	.gradient-card .card-title {
		@apply text-primary-100;
	}
	
	.gradient-card .card-value {
		@apply text-white;
	}
	
	.clickable {
		@apply cursor-pointer;
	}
	
	.clickable:hover {
		@apply shadow-xl transform scale-105;
	}
	
	.card-content {
		@apply p-6;
	}
	
	.card-title {
		@apply text-sm font-medium text-gray-600 mb-2;
	}
	
	.card-value {
		@apply text-3xl font-bold text-gray-900;
	}
	
	.icon-container {
		@apply w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg;
	}
	
	.gradient-icon {
		@apply bg-white bg-opacity-20 backdrop-blur-sm;
	}
	
	/* Animações de entrada */
	.rich-stats-card {
		animation: slideInUp 0.6s ease-out;
	}
	
	@keyframes slideInUp {
		from {
			opacity: 0;
			transform: translateY(30px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	/* Hover effects para gradiente */
	.gradient-card:hover {
		@apply from-primary-600 to-primary-700;
	}
</style> 