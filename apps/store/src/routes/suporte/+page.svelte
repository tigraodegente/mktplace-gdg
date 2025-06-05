<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	
	// Estado
	let activeTab = 'faq';
	let tickets: any[] = [];
	let faqs: any[] = [];
	let loading = false;
	let showNewTicketModal = false;
	
	// Formulário de ticket
	let ticketForm = {
		subject: '',
		category: '',
		order_id: '',
		message: '',
		attachments: []
	};
	
	// Categorias
	const categories = [
		{ id: 'pedidos', name: 'Pedidos', description: 'Dúvidas sobre pedidos e entregas' },
		{ id: 'produtos', name: 'Produtos', description: 'Informações sobre produtos e defeitos' },
		{ id: 'pagamentos', name: 'Pagamentos', description: 'Problemas com pagamentos' },
		{ id: 'tecnico', name: 'Técnico', description: 'Problemas técnicos do site' },
		{ id: 'outros', name: 'Outros', description: 'Outras dúvidas e sugestões' }
	];
	
	// FAQ mock
	const faqData = [
		{
			category: 'Pedidos',
			items: [
				{
					question: 'Como rastrear meu pedido?',
					answer: 'Acesse "Meus Pedidos" e clique no número do pedido para ver o rastreamento detalhado com localização em tempo real.'
				},
				{
					question: 'Qual o prazo de entrega?',
					answer: 'O prazo varia de 3 a 15 dias úteis, dependendo da sua região e modalidade escolhida. Oferecemos PAC, SEDEX e Expresso.'
				},
				{
					question: 'Como cancelar um pedido?',
					answer: 'Pedidos podem ser cancelados até 2 horas após a confirmação. Acesse "Meus Pedidos" e clique em "Cancelar".'
				}
			]
		},
		{
			category: 'Pagamentos',
			items: [
				{
					question: 'Quais formas de pagamento aceitas?',
					answer: 'Aceitamos PIX (5% de desconto), cartão de crédito/débito (até 12x sem juros) e boleto bancário.'
				},
				{
					question: 'Posso alterar a forma de pagamento?',
					answer: 'Não é possível alterar após a confirmação. Para mudar, cancele o pedido e faça um novo.'
				}
			]
		},
		{
			category: 'Trocas e Devoluções',
			items: [
				{
					question: 'Posso trocar um produto?',
					answer: 'Sim! Você tem até 7 dias para solicitar troca ou devolução. Acesse "Meus Pedidos" → "Solicitar Troca".'
				},
				{
					question: 'Como funciona o processo de devolução?',
					answer: 'Solicite online, envie o produto, analisamos e processamos o reembolso em até 7 dias úteis.'
				}
			]
		}
	];
	
	onMount(() => {
		// Verificar parâmetro da URL para definir aba ativa
		const urlTab = $page.url.searchParams.get('tab');
		if (urlTab && ['faq', 'tickets'].includes(urlTab)) {
			activeTab = urlTab;
		}
		
		loadTickets();
	});

	// Reagir a mudanças na URL
	$effect(() => {
		const urlTab = $page.url.searchParams.get('tab');
		if (urlTab && ['faq', 'tickets'].includes(urlTab)) {
			activeTab = urlTab;
		}
	});
	
	async function loadTickets() {
		try {
			loading = true;
			const response = await fetch('/api/support/tickets');
			const data = await response.json();
			
			if (data.success) {
				tickets = data.data.tickets;
			}
		} catch (err) {
			console.error('Erro ao carregar tickets:', err);
		} finally {
			loading = false;
		}
	}
	
	async function createTicket() {
		if (!ticketForm.subject || !ticketForm.message) {
			alert('Preencha assunto e mensagem');
			return;
		}
		
		try {
			const response = await fetch('/api/support/tickets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(ticketForm)
			});
			
			const data = await response.json();
			
			if (data.success) {
				alert('Ticket criado com sucesso!');
				showNewTicketModal = false;
				ticketForm = { subject: '', category: '', order_id: '', message: '', attachments: [] };
				loadTickets();
				activeTab = 'tickets';
			}
		} catch (err) {
			console.error('Erro ao criar ticket:', err);
		}
	}
	
	function getStatusColor(status: string) {
		switch (status) {
			case 'open': return 'bg-green-100 text-green-800';
			case 'in_progress': return 'bg-blue-100 text-blue-800';
			case 'resolved': return 'bg-gray-50 text-gray-800';
			case 'closed': return 'bg-red-100 text-red-800';
			default: return 'bg-gray-50 text-gray-800';
		}
	}
	
	function getStatusLabel(status: string) {
		switch (status) {
			case 'open': return 'Aberto';
			case 'in_progress': return 'Em Andamento';
			case 'resolved': return 'Resolvido';
			case 'closed': return 'Fechado';
			default: return status;
		}
	}
</script>

<svelte:head>
	<title>Central de Suporte - Grão de Gente Marketplace</title>
	<meta name="description" content="Central de ajuda e suporte do marketplace" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-6xl mx-auto px-4 py-8">
		<!-- Header -->
		<div class="text-center mb-12">
			<h1 class="text-4xl font-bold text-gray-900 mb-4">Central de Suporte</h1>
			<p class="text-xl text-gray-600 max-w-2xl mx-auto">
				Estamos aqui para ajudar! Encontre respostas rápidas ou entre em contato conosco.
			</p>
		</div>

		<!-- Quick Actions -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
			<button
				onclick={() => activeTab = 'faq'}
				class="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all text-left group"
			>
				<div class="flex items-center gap-4">
					<div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
						<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div>
						<h3 class="font-semibold text-gray-900">Perguntas Frequentes</h3>
						<p class="text-sm text-gray-600">Respostas para dúvidas comuns</p>
					</div>
				</div>
			</button>

			<button
				onclick={() => activeTab = 'tickets'}
				class="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all text-left group"
			>
				<div class="flex items-center gap-4">
					<div class="w-12 h-12 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center group-hover:bg-[#00BFB3]/20 transition-colors">
						<svg class="w-6 h-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
						</svg>
					</div>
					<div>
						<h3 class="font-semibold text-gray-900">Meus Tickets</h3>
						<p class="text-sm text-gray-600">Acompanhe suas solicitações</p>
					</div>
				</div>
			</button>

			<button
				onclick={() => showNewTicketModal = true}
				class="p-6 bg-[#00BFB3] rounded-lg shadow-sm hover:bg-[#00A89D] transition-all text-left group"
			>
				<div class="flex items-center gap-4">
					<div class="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
						</svg>
					</div>
					<div>
						<h3 class="font-semibold text-white">Novo Ticket</h3>
						<p class="text-sm text-white/80">Abrir nova solicitação</p>
					</div>
				</div>
			</button>
		</div>

		<!-- Content Area -->
		<div class="bg-white rounded-lg shadow-sm">
			<!-- Tabs -->
			<div class="border-b border-gray-200">
				<nav class="flex space-x-8 px-6">
					<button
						onclick={() => activeTab = 'faq'}
						class="py-4 px-1 border-b-2 font-medium text-sm transition-colors
							{activeTab === 'faq' 
								? 'border-[#00BFB3] text-[#00BFB3]' 
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					>
						FAQ
					</button>
					<button
						onclick={() => activeTab = 'tickets'}
						class="py-4 px-1 border-b-2 font-medium text-sm transition-colors
							{activeTab === 'tickets' 
								? 'border-[#00BFB3] text-[#00BFB3]' 
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					>
						Meus Tickets
						{#if tickets.length > 0}
							<span class="ml-2 bg-[#00BFB3] text-white text-xs px-2 py-1 rounded-full">
								{tickets.length}
							</span>
						{/if}
					</button>
				</nav>
			</div>

			<!-- Tab Content -->
			<div class="p-6">
				{#if activeTab === 'faq'}
					<!-- FAQ Content -->
					<div class="space-y-8">
						{#each faqData as category}
							<div>
								<h3 class="text-lg font-semibold text-gray-900 mb-4">{category.category}</h3>
								<div class="space-y-4">
									{#each category.items as faq}
										<div class="border border-gray-200 rounded-lg">
											<details class="group">
												<summary class="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 rounded-lg">
													<span class="font-medium text-gray-900">{faq.question}</span>
													<svg class="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
													</svg>
												</summary>
												<div class="px-4 pb-4">
													<p class="text-gray-700 leading-relaxed">{faq.answer}</p>
												</div>
											</details>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>

				{:else if activeTab === 'tickets'}
					<!-- Tickets Content -->
					<div>
						<div class="flex items-center justify-between mb-6">
							<h3 class="text-lg font-semibold text-gray-900">Meus Tickets de Suporte</h3>
							<button
								onclick={() => showNewTicketModal = true}
								class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors"
							>
								Novo Ticket
							</button>
						</div>

						{#if loading}
							<div class="text-center py-8">
								<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00BFB3] mx-auto"></div>
								<p class="text-gray-600 mt-2">Carregando tickets...</p>
							</div>
						{:else if tickets.length === 0}
							<div class="text-center py-12">
								<svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
								</svg>
								<h3 class="text-lg font-semibold text-gray-900 mb-2">Nenhum ticket ainda</h3>
								<p class="text-gray-600 mb-4">Você não tem tickets de suporte abertos.</p>
								<button
									onclick={() => showNewTicketModal = true}
									class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D]"
								>
									Criar Primeiro Ticket
								</button>
							</div>
						{:else}
							<div class="space-y-4">
								{#each tickets as ticket}
									<div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
										<div class="flex items-start justify-between">
											<div class="flex-1">
												<div class="flex items-center gap-3 mb-2">
													<span class="font-mono text-sm bg-gray-50 px-2 py-1 rounded">
														{ticket.ticket_number}
													</span>
													<span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(ticket.status)}">
														{getStatusLabel(ticket.status)}
													</span>
													{#if ticket.order_id}
														<span class="text-xs text-gray-500">
															Pedido: {ticket.order_id}
														</span>
													{/if}
												</div>
												<h4 class="font-semibold text-gray-900 mb-1">{ticket.subject}</h4>
												<p class="text-sm text-gray-600">Categoria: {ticket.category}</p>
											</div>
											<div class="text-right">
												<p class="text-sm text-gray-500">
													{new Date(ticket.created_at).toLocaleDateString('pt-BR')}
												</p>
												<button class="mt-2 text-sm text-[#00BFB3] hover:text-[#00A89D] font-medium">
													Ver detalhes
												</button>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Modal Novo Ticket -->
{#if showNewTicketModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
		<div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			<div class="p-6">
				<div class="flex items-center justify-between mb-6">
					<h2 class="text-xl font-semibold text-gray-900">Novo Ticket de Suporte</h2>
					<button
						onclick={() => showNewTicketModal = false}
						class="text-gray-400 hover:text-gray-600"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<form onsubmit={(e) => { e.preventDefault(); createTicket(); }} class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Assunto</label>
						<input
							type="text"
							bind:value={ticketForm.subject}
							placeholder="Descreva brevemente o problema"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3]"
							required
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
						<select
							bind:value={ticketForm.category}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3]"
						>
							<option value="">Selecione uma categoria</option>
							{#each categories as category}
								<option value={category.id}>{category.name} - {category.description}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">
							Número do Pedido (opcional)
						</label>
						<input
							type="text"
							bind:value={ticketForm.order_id}
							placeholder="MP123456789"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3]"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
						<textarea
							bind:value={ticketForm.message}
							placeholder="Descreva detalhadamente seu problema ou dúvida..."
							rows="6"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3]"
							required
						></textarea>
					</div>

					<div class="flex gap-3 pt-4">
						<button
							type="submit"
							class="flex-1 px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors"
						>
							Criar Ticket
						</button>
						<button
							type="button"
							onclick={() => showNewTicketModal = false}
							class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
						>
							Cancelar
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if} 