<script lang="ts">
	import { aiReviewStore, aiTotalChanges, aiReviewActions } from '$lib/stores/aiReview';
	import ModernIcon from './ModernIcon.svelte';
	import { toast } from '$lib/stores/toast';

	interface Props {
		formData: any;
	}

	let { formData }: Props = $props();

	// Estado da loja IA
	let aiState = $state({
		isActive: false,
		isLoading: false,
		totalChanges: 0
	});

	// Subscrever ao store
	aiReviewStore.subscribe(state => {
		aiState.isActive = state.isActive;
		aiState.isLoading = state.isLoading;
	});

	aiTotalChanges.subscribe(count => {
		aiState.totalChanges = count;
	});

	// Função para finalizar revisão
	function finishReview() {
		if (aiState.totalChanges > 0) {
			toast.success(`${aiState.totalChanges} sugestões aplicadas! Lembre-se de salvar o produto.`);
		}
		aiReviewActions.finishReview();
	}

	// Função para cancelar revisão
	function cancelReview() {
		aiReviewActions.cancelReview(formData);
		toast.info('Revisão IA cancelada');
	}

	// Função para aplicar todas as sugestões
	function applyAllSuggestions() {
		aiReviewActions.applyAllSuggestions(formData);
		toast.success('Todas as sugestões foram aplicadas!');
	}

	// Função para rejeitar todas as sugestões
	function rejectAllSuggestions() {
		aiReviewActions.rejectAllSuggestions();
		toast.info('Todas as sugestões foram rejeitadas');
	}

	// Calcular progresso
	let percentage = $derived(aiState.totalChanges > 0 ? 0 : 100);
</script>

{#if aiState.isActive}
	<div class="ai-review-header">
		<div class="ai-review-content">
			<div class="ai-review-info">
				<div class="ai-review-icon">
					<ModernIcon name="robot" size="lg" />
				</div>
				<div class="ai-review-text">
					<h3>🤖 Modo Revisão IA Ativo</h3>
					<p>
						{aiState.totalChanges} sugestões | Revise as sugestões nas abas e clique em "Aplicar" nas que desejar usar
					</p>
				</div>
			</div>
			
			<div class="ai-review-actions">
				<div class="ai-review-stats">
					<div class="ai-review-count">{aiState.totalChanges}</div>
					<div class="ai-review-label">de {aiState.totalChanges} aplicadas</div>
				</div>
				
				<div class="ai-review-progress">
					<svg viewBox="0 0 36 36" class="ai-progress-ring">
						<path
							d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
							fill="none"
							stroke="rgba(255,255,255,0.2)"
							stroke-width="2"
						/>
						<path
							d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
							fill="none"
							stroke="white"
							stroke-width="2"
							stroke-dasharray="{percentage}, 100"
						/>
					</svg>
					<div class="ai-progress-text">
						<span>{Math.round(percentage)}%</span>
					</div>
				</div>
				
				<button
					onclick={applyAllSuggestions}
					class="ai-btn ai-btn-apply"
					title="Aplicar todas as sugestões"
				>
					✓ Aplicar Todas
				</button>
				
				<button
					onclick={rejectAllSuggestions}
					class="ai-btn ai-btn-reject"
					title="Rejeitar todas as sugestões"
				>
					✗ Rejeitar Todas
				</button>
				
				<button
					onclick={cancelReview}
					class="ai-btn ai-btn-cancel"
				>
					Cancelar Revisão
				</button>
			</div>
		</div>
		
		<!-- Progresso da Revisão -->
		<div class="ai-review-footer">
			<div class="ai-review-progress-info">
				<span>Progresso da Revisão</span>
				<span>Restam {aiState.totalChanges - aiState.totalChanges} sugestões</span>
			</div>
			<div class="ai-progress-bar">
				<div 
					class="ai-progress-fill"
					style="width: {percentage}%"
				></div>
			</div>
		</div>
	</div>
{/if}

<style>
	.ai-review-header {
		background: linear-gradient(to right, #00BFB3, #00A89D);
		color: white;
		padding: 1.5rem;
		border-radius: 0.5rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
	}

	.ai-review-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.ai-review-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.ai-review-icon {
		width: 3rem;
		height: 3rem;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.ai-review-text h3 {
		font-size: 1.25rem;
		font-weight: bold;
		margin: 0;
	}

	.ai-review-text p {
		color: rgba(0, 191, 179, 0.8);
		font-size: 0.875rem;
		margin: 0;
	}

	.ai-review-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.ai-review-stats {
		text-align: right;
	}

	.ai-review-count {
		font-size: 1.5rem;
		font-weight: bold;
	}

	.ai-review-label {
		font-size: 0.75rem;
		color: rgba(0, 191, 179, 0.8);
	}

	.ai-review-progress {
		width: 4rem;
		height: 4rem;
		position: relative;
	}

	.ai-progress-ring {
		width: 4rem;
		height: 4rem;
		transform: rotate(-90deg);
	}

	.ai-progress-text {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: bold;
	}

	.ai-btn {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		transition: background-color 0.2s;
		font-size: 0.875rem;
		font-weight: 500;
		border: 1px solid rgba(255, 255, 255, 0.2);
		cursor: pointer;
	}

	.ai-btn-apply,
	.ai-btn-reject {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.ai-btn-apply:hover,
	.ai-btn-reject:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.ai-btn-cancel {
		background: rgba(255, 255, 255, 0.2);
		color: white;
	}

	.ai-btn-cancel:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.ai-review-footer {
		margin-top: 1rem;
	}

	.ai-review-progress-info {
		display: flex;
		justify-content: space-between;
		font-size: 0.875rem;
		color: rgba(0, 191, 179, 0.8);
		margin-bottom: 0.5rem;
	}

	.ai-progress-bar {
		width: 100%;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 9999px;
		height: 0.5rem;
	}

	.ai-progress-fill {
		background: white;
		height: 0.5rem;
		border-radius: 9999px;
		transition: width 0.3s;
	}
</style> 