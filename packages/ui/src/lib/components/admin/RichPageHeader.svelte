<script lang="ts">
	interface Breadcrumb {
		label: string;
		href?: string;
	}
	
	interface Action {
		label: string;
		icon?: string;
		variant?: 'primary' | 'secondary' | 'danger';
		href?: string;
		onClick?: () => void;
		loading?: boolean;
		disabled?: boolean;
	}
	
	interface Props {
		title: string;
		subtitle?: string;
		breadcrumbs?: Breadcrumb[];
		actions?: Action[];
		loading?: boolean;
		gradient?: boolean;
	}
	
	let {
		title,
		subtitle = '',
		breadcrumbs = [],
		actions = [],
		loading = false,
		gradient = false
	}: Props = $props();
	
	const iconMap: Record<string, string> = {
		add: 'M12 4v16m8-8H4',
		edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
		delete: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
		download: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
		upload: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
		refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
		settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
		search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
		filter: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z'
	};
	
	function getIconPath(icon: string): string {
		return iconMap[icon] || icon;
	}
	
	function handleAction(action: Action) {
		if (!action.disabled && !action.loading) {
			if (action.onClick) {
				action.onClick();
			}
		}
	}
</script>

<header class="page-header {gradient ? 'gradient-header' : ''}">
	<div class="header-content">
		<!-- Breadcrumbs -->
		{#if breadcrumbs.length > 0}
			<nav class="breadcrumbs" aria-label="Breadcrumb">
				<ol class="breadcrumb-list">
					{#each breadcrumbs as crumb, i}
						<li class="breadcrumb-item">
							{#if crumb.href && i < breadcrumbs.length - 1}
								<a href={crumb.href} class="breadcrumb-link">
									{crumb.label}
								</a>
							{:else}
								<span class="breadcrumb-current">
									{crumb.label}
								</span>
							{/if}
						</li>
						{#if i < breadcrumbs.length - 1}
							<li class="breadcrumb-separator">
								<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
								</svg>
							</li>
						{/if}
					{/each}
				</ol>
			</nav>
		{/if}
		
		<!-- Title and Actions -->
		<div class="header-main">
			<div class="header-text">
				{#if loading}
					<div class="space-y-2">
						<div class="h-8 bg-gray-200 rounded animate-pulse w-64"></div>
						{#if subtitle}
							<div class="h-4 bg-gray-200 rounded animate-pulse w-48"></div>
						{/if}
					</div>
				{:else}
					<h1 class="page-title">{title}</h1>
					{#if subtitle}
						<p class="page-subtitle">{subtitle}</p>
					{/if}
				{/if}
			</div>
			
			<!-- Actions -->
			{#if actions.length > 0}
				<div class="header-actions">
					{#each actions as action}
						{#if action.href}
							<a 
								href={action.href}
								class="btn btn-{action.variant || 'secondary'}"
								class:loading={action.loading}
								class:disabled={action.disabled}
							>
								{#if action.loading}
									<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
								{:else if action.icon}
									<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getIconPath(action.icon)}/>
									</svg>
								{/if}
								{action.label}
							</a>
						{:else}
							<button 
								onclick={() => handleAction(action)}
								disabled={action.disabled || action.loading}
								class="btn btn-{action.variant || 'secondary'}"
								class:loading={action.loading}
							>
								{#if action.loading}
									<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
								{:else if action.icon}
									<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getIconPath(action.icon)}/>
									</svg>
								{/if}
								{action.label}
							</button>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
		
		<!-- Slot for additional content -->
		{#if $$slots.default}
			<div class="header-extra">
				<slot />
			</div>
		{/if}
	</div>
</header>

<style>
	.page-header {
		@apply bg-white border-b border-gray-200 py-6 px-8 mb-8;
	}
	
	.gradient-header {
		@apply bg-gradient-to-r from-primary-500 to-primary-600 border-0 text-white;
	}
	
	.gradient-header .page-title {
		@apply text-white;
	}
	
	.gradient-header .page-subtitle {
		@apply text-primary-100;
	}
	
	.gradient-header .breadcrumb-link {
		@apply text-primary-100 hover:text-white;
	}
	
	.gradient-header .breadcrumb-current {
		@apply text-white;
	}
	
	.header-content {
		@apply max-w-7xl mx-auto space-y-4;
	}
	
	.breadcrumbs {
		@apply mb-4;
	}
	
	.breadcrumb-list {
		@apply flex items-center space-x-2 text-sm;
	}
	
	.breadcrumb-item {
		@apply flex items-center;
	}
	
	.breadcrumb-link {
		@apply text-gray-500 hover:text-primary-600 transition-colors;
	}
	
	.breadcrumb-current {
		@apply text-gray-900 font-medium;
	}
	
	.breadcrumb-separator {
		@apply flex items-center;
	}
	
	.header-main {
		@apply flex items-center justify-between;
	}
	
	.header-text {
		@apply flex-1 mr-6;
	}
	
	.page-title {
		@apply text-3xl font-bold text-gray-900 mb-2;
	}
	
	.page-subtitle {
		@apply text-lg text-gray-600;
	}
	
	.header-actions {
		@apply flex items-center space-x-3;
	}
	
	.header-extra {
		@apply mt-6 pt-6 border-t border-gray-200;
	}
	
	.gradient-header .header-extra {
		@apply border-primary-400;
	}
	
	.btn {
		@apply inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm;
	}
	
	.btn-primary {
		@apply bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 shadow-sm;
	}
	
	.btn-secondary {
		@apply bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 border-gray-200;
	}
	
	.btn-danger {
		@apply bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-sm;
	}
	
	.loading {
		@apply cursor-wait;
	}
	
	.disabled {
		@apply opacity-50 cursor-not-allowed;
	}
	
	/* Responsividade */
	@media (max-width: 768px) {
		.header-main {
			@apply flex-col items-start space-y-4;
		}
		
		.header-text {
			@apply mr-0;
		}
		
		.header-actions {
			@apply w-full overflow-x-auto;
		}
		
		.page-title {
			@apply text-2xl;
		}
		
		.page-subtitle {
			@apply text-base;
		}
	}
</style> 