<script lang="ts">
	export let title = '';
	export let titleIcon = '';
	export let subtitle = 'Marketplace GDG';
	export let userInfo = {
		name: 'Usuário',
		subtitle: 'Role',
		initials: 'U'
	};
</script>

<!-- Header -->
<header class="bg-white shadow-sm border-b border-gray-200">
	<div class="max-w-[1440px] mx-auto px-8">
		<div class="flex items-center justify-between h-16">
			<!-- Logo e Título -->
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<h1 class="text-xl font-bold text-gray-900">
						<span class="text-cyan-500">{titleIcon} {title}</span>
						<span class="text-gray-400 text-sm ml-2">| {subtitle}</span>
					</h1>
				</div>
			</div>
			
			<!-- User Menu -->
			<div class="flex items-center space-x-4">
				<!-- Notificações -->
				<button class="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-lg transition-colors">
					<span class="sr-only">Ver notificações</span>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
					</svg>
					<!-- Badge de notificação -->
					<span class="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
				</button>
				
				<!-- User Profile -->
				<div class="flex items-center space-x-3">
					<div class="text-right">
						<p class="text-sm font-medium text-gray-900">{userInfo.name}</p>
						<p class="text-xs text-gray-500">{userInfo.subtitle}</p>
					</div>
					<div class="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
						<span class="text-white font-semibold text-sm">
							{userInfo.initials}
						</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</header> 