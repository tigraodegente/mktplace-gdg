<script lang="ts">
	type IconType = 'payment' | 'delivery' | 'discount' | 'exchange';
	
	interface Benefit {
		id: string;
		icon: IconType;
		title: string;
		subtitle: string;
		link?: {
			text: string;
			url: string;
		};
	}
	
	interface BenefitsSectionProps {
		benefits?: Benefit[];
		class?: string;
	}
	
	let { 
		benefits = [
			{
				id: '1',
				icon: 'payment' as IconType,
				title: 'Em até 12X',
				subtitle: 'No Cartão'
			},
			{
				id: '2',
				icon: 'delivery' as IconType,
				title: 'Chega Rapidinho',
				subtitle: 'Envio em até 24H*',
				link: {
					text: 'Saiba mais',
					url: '/entrega-rapida'
				}
			},
			{
				id: '3',
				icon: 'discount' as IconType,
				title: '5% de desconto',
				subtitle: 'Nas compras à vista'
			},
			{
				id: '4',
				icon: 'exchange' as IconType,
				title: '30 dias para a troca',
				subtitle: 'Ou 100% do seu dinheiro de volta!'
			}
		],
		class: className = ''
	}: BenefitsSectionProps = $props();
	
	// SVGs dos ícones
	const icons: Record<IconType, string> = {
		payment: `<svg xmlns="http://www.w3.org/2000/svg" width="78" height="78" viewBox="0 0 78 78" fill="none">
			<circle cx="38.9659" cy="38.9659" r="38.9659" fill="#E9FFFE"/>
			<rect x="22" y="28" width="34" height="22" rx="4" stroke="#00BFB3" stroke-width="2" fill="none"/>
			<path d="M22 34H56" stroke="#00BFB3" stroke-width="2"/>
			<path d="M26 42H32" stroke="#00BFB3" stroke-width="2" stroke-linecap="round"/>
		</svg>`,
		
		delivery: `<svg xmlns="http://www.w3.org/2000/svg" width="78" height="78" viewBox="0 0 78 78" fill="none">
			<circle cx="38.9659" cy="38.9659" r="38.9659" fill="#E9FFFE"/>
			<path d="M38.1417 23.5906C38.0937 23.5176 38.0605 23.4359 38.0441 23.3501C38.0277 23.2643 38.0283 23.1761 38.046 23.0906C38.0637 23.005 38.098 22.9238 38.147 22.8516C38.1961 22.7794 38.2589 22.7176 38.3318 22.6697L42.3196 20.0479C42.4665 19.951 42.6456 19.9166 42.8178 19.9521C42.9899 19.9877 43.141 20.0903 43.2376 20.2374C43.3342 20.3845 43.3686 20.5641 43.3331 20.7366C43.2977 20.9091 43.1953 21.0605 43.0484 21.1573L39.0599 23.7798C38.9131 23.8763 38.734 23.9104 38.5621 23.8747C38.3902 23.8389 38.2394 23.7363 38.143 23.5892L38.1417 23.5906ZM35.936 25.7052C36.0651 25.7053 36.1914 25.6674 36.2991 25.5963L36.9107 25.1946C36.9834 25.1467 37.046 25.0848 37.0949 25.0126C37.1438 24.9404 37.178 24.8593 37.1956 24.7738C37.2132 24.6884 37.2138 24.6003 37.1974 24.5146C37.181 24.4289 37.148 24.3473 37.1001 24.2744C37.0523 24.2015 36.9906 24.1388 36.9185 24.0898C36.8465 24.0408 36.7655 24.0065 36.6802 23.9889C36.595 23.9713 36.5071 23.9706 36.4216 23.987C36.336 24.0035 36.2546 24.0366 36.1819 24.0845L35.571 24.4862C35.4518 24.5646 35.361 24.6795 35.3121 24.8138C35.2632 24.948 35.2589 25.0945 35.2998 25.2315C35.3406 25.3684 35.4245 25.4884 35.5389 25.5738C35.6533 25.6591 35.7921 25.7052 35.9347 25.7052H35.936ZM43.6215 43.4319L43.3042 43.6411C43.1573 43.7379 43.0548 43.8893 43.0193 44.0618C42.9837 44.2344 43.0181 44.414 43.1147 44.5613C43.2113 44.7085 43.3624 44.8112 43.5346 44.8468C43.7068 44.8824 43.8861 44.848 44.033 44.7511L44.3503 44.542C44.4231 44.494 44.4857 44.4322 44.5346 44.36C44.5834 44.2878 44.6177 44.2067 44.6353 44.1212C44.6529 44.0358 44.6535 43.9477 44.6371 43.862C44.6207 43.7763 44.5877 43.6947 44.5398 43.6218C44.492 43.5489 44.4303 43.4862 44.3582 43.4372C44.2862 43.3882 44.2052 43.3539 44.1199 43.3363C44.0347 43.3186 43.9468 43.318 43.8612 43.3344C43.7757 43.3508 43.6943 43.384 43.6215 43.4319ZM48.694 40.0944L45.3872 42.2701C45.2403 42.3669 45.1378 42.5183 45.1023 42.6908C45.0668 42.8634 45.1011 43.043 45.1977 43.1903C45.2944 43.3375 45.4454 43.4402 45.6176 43.4758C45.7898 43.5114 45.9691 43.477 46.116 43.3801L49.4228 41.2045C49.4955 41.1565 49.5581 41.0947 49.607 41.0225C49.6559 40.9503 49.6901 40.8691 49.7077 40.7837C49.7253 40.6982 49.7259 40.6102 49.7095 40.5245C49.6932 40.4388 49.6601 40.3571 49.6122 40.2843C49.5644 40.2114 49.5027 40.1486 49.4306 40.0996C49.3586 40.0507 49.2776 40.0164 49.1924 39.9987C49.1071 39.9811 49.0192 39.9805 48.9337 39.9969C48.8482 40.0133 48.7667 40.0464 48.694 40.0944ZM53.8293 34.1987C53.7602 34.5411 53.6238 34.8662 53.428 35.1551C53.2323 35.4441 52.9811 35.6911 52.6891 35.8818L41.0886 43.5129C40.9767 44.854 40.4334 49.7538 38.3888 51.5696C37.4902 52.3823 36.4664 53.0439 35.357 53.5289L35.9129 53.9664C36.0404 54.0668 36.1267 54.2106 36.1556 54.3705C36.1844 54.5304 36.1537 54.6954 36.0692 54.8341L34.2141 57.8789C34.1549 57.9763 34.0717 58.0568 33.9725 58.1126C33.8733 58.1684 33.7614 58.1977 33.6476 58.1976C33.5262 58.1978 33.4071 58.164 33.3038 58.1C33.1538 58.0083 33.0464 57.8607 33.005 57.6896C32.9636 57.5186 32.9917 57.338 33.0831 57.1877L34.6295 54.6462L25.2161 47.2349L23.2583 49.5022C23.2014 49.5682 23.132 49.6223 23.0542 49.6614C22.9764 49.7006 22.8916 49.724 22.8048 49.7303C22.7179 49.7366 22.6307 49.7257 22.5481 49.6983C22.4654 49.6708 22.389 49.6273 22.3231 49.5702C22.2573 49.5132 22.2033 49.4437 22.1642 49.3657C22.1251 49.2877 22.1018 49.2028 22.0955 49.1158C22.0892 49.0287 22.1 48.9413 22.1275 48.8585C22.1549 48.7757 22.1983 48.6991 22.2552 48.6331L24.6265 45.8858C24.7379 45.7566 24.8948 45.6753 25.0644 45.659C25.2341 45.6427 25.4035 45.6925 25.5375 45.7981L26.9202 46.8863C27.4128 46.2107 27.7167 45.4157 27.8007 44.5832C27.8126 44.3176 27.812 43.9956 27.812 43.6351C27.812 41.6865 27.8166 38.8243 29.3451 37.1027L29.139 36.7874L29.1311 36.7781V36.7708L28.3539 35.5843C27.9689 34.9962 27.8325 34.279 27.9746 33.5902C28.1167 32.9014 28.5257 32.2972 29.1119 31.9102L43.7733 22.2714C44.0639 22.0796 44.3894 21.9471 44.7312 21.8816C45.073 21.8161 45.4243 21.8189 45.765 21.8897C46.1058 21.9605 46.4292 22.098 46.7168 22.2942C47.0044 22.4905 47.2506 22.7418 47.4411 23.0335L48.2507 24.2704C48.2507 24.2704 48.2573 24.2757 48.2593 24.2791C48.2613 24.2824 48.2593 24.2864 48.2633 24.2897L53.4497 32.2083C53.6417 32.4987 53.7742 32.8244 53.8396 33.1666C53.905 33.5087 53.902 33.8604 53.8307 34.2014L53.8293 34.1987ZM29.4571 34.8514L29.8778 35.4941L46.7839 24.4484L46.3327 23.7592C46.2377 23.6134 46.1149 23.4879 45.9714 23.3898C45.8279 23.2917 45.6664 23.223 45.4963 23.1876C45.3262 23.1523 45.1508 23.151 44.9801 23.1838C44.8095 23.2166 44.647 23.2829 44.5021 23.3788L29.8407 33.0196C29.6953 33.1153 29.5702 33.2387 29.4727 33.383C29.3751 33.5272 29.307 33.6894 29.2722 33.8601C29.2356 34.0299 29.2333 34.2052 29.2652 34.3759C29.2972 34.5466 29.3629 34.7091 29.4584 34.854L29.4571 34.8514ZM39.6562 44.4557L38.027 45.5279C37.9414 45.582 37.8529 45.6314 37.762 45.676C37.658 46.962 37.0677 48.5063 34.5739 49.9404C34.4984 49.984 34.4152 50.0122 34.3288 50.0236C34.2425 50.0349 34.1548 50.0291 34.0707 50.0065C33.9866 49.9839 33.9077 49.9449 33.8387 49.8917C33.7696 49.8386 33.7117 49.7723 33.6682 49.6967C33.6247 49.6211 33.5964 49.5377 33.5851 49.4511C33.5738 49.3646 33.5796 49.2767 33.6022 49.1924C33.6247 49.1082 33.6637 49.0292 33.7167 48.96C33.7698 48.8908 33.8359 48.8327 33.9113 48.7891C36.5953 47.2455 36.5065 45.7762 36.429 44.4783C36.3559 44.1197 36.3561 43.7499 36.4295 43.3914C36.503 43.0329 36.6481 42.693 36.8563 42.3922C37.3963 41.7734 38.1582 40.8586 38.7618 40.1276C38.9834 39.8572 39.1302 39.5332 39.1875 39.1881C39.2448 38.8429 39.2107 38.4888 39.0884 38.161L39.0301 38.0063C38.9917 37.9038 38.9285 37.8124 38.8462 37.7402C38.7639 37.6681 38.6651 37.6175 38.5586 37.5929C38.4521 37.5683 38.3411 37.5705 38.2357 37.5993C38.1302 37.6282 38.0335 37.6827 37.9542 37.758L32.1059 43.3111C31.9783 43.4323 31.8079 43.4978 31.6322 43.4931C31.4564 43.4885 31.2897 43.414 31.1687 43.2862C31.0477 43.1584 30.9824 42.9876 30.9871 42.8115C30.9917 42.6354 31.066 42.4683 31.1936 42.3471L32.1715 41.4176L30.111 38.2719C29.1404 39.6734 29.1377 42.0124 29.137 43.6351C29.137 44.0175 29.137 44.3594 29.1245 44.6409C29.0259 45.7507 28.624 46.8117 27.963 47.7076L34.13 52.5629C35.3867 52.1534 36.5396 51.4751 37.5089 50.5751C38.7625 49.4637 39.3958 46.4647 39.6562 44.4557ZM52.3426 32.9366L47.5107 25.5584L30.6059 36.6068L33.1487 40.4901L37.0418 36.7907C37.2799 36.5644 37.5703 36.4006 37.8869 36.3141C38.2035 36.2276 38.5366 36.221 38.8564 36.2949C39.1762 36.3688 39.4728 36.5209 39.7196 36.7376C39.9665 36.9544 40.1559 37.229 40.2711 37.5369L40.33 37.695C40.5337 38.2413 40.5904 38.8317 40.4946 39.407C40.3988 39.9823 40.1538 40.5223 39.7841 40.9727C39.1719 41.7143 38.4014 42.6412 37.8541 43.2666C37.7237 43.5343 37.6828 43.8369 37.7375 44.1297L51.9623 34.7684C52.1079 34.6733 52.2333 34.5504 52.3313 34.4066C52.4293 34.2628 52.498 34.101 52.5333 33.9305C52.5687 33.76 52.57 33.5841 52.5373 33.4131C52.5045 33.2421 52.4384 33.0793 52.3426 32.934V32.9366ZM46.7858 28.1464L43.9946 29.9729C43.8473 30.069 43.7442 30.2198 43.7079 30.3922C43.6716 30.5645 43.7051 30.7442 43.8011 30.8917C43.897 31.0393 44.0475 31.1426 44.2195 31.179C44.3915 31.2153 44.5708 31.1817 44.718 31.0856L47.5093 29.2611C47.6566 29.165 47.7597 29.0142 47.796 28.8419C47.8323 28.6695 47.7987 28.4898 47.7028 28.3423C47.6069 28.1947 47.4564 28.0914 47.2844 28.055C47.1124 28.0187 46.9331 28.0523 46.7858 28.1484V28.1464Z" fill="#00BFB3"/>
		</svg>`,
		
		discount: `<svg xmlns="http://www.w3.org/2000/svg" width="78" height="78" viewBox="0 0 78 78" fill="none">
			<circle cx="38.9659" cy="38.9659" r="38.9659" fill="#E9FFFE"/>
			<circle cx="39" cy="39" r="16" stroke="#00BFB3" stroke-width="2" fill="none"/>
			<path d="M32 39L36 43L46 33" stroke="#00BFB3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			<path d="M39 25V29" stroke="#00BFB3" stroke-width="2" stroke-linecap="round"/>
			<path d="M39 49V53" stroke="#00BFB3" stroke-width="2" stroke-linecap="round"/>
		</svg>`,
		
		exchange: `<svg xmlns="http://www.w3.org/2000/svg" width="78" height="78" viewBox="0 0 78 78" fill="none">
			<circle cx="38.9659" cy="38.9659" r="38.9659" fill="#E9FFFE"/>
			<path d="M30 32L46 32" stroke="#00BFB3" stroke-width="2" stroke-linecap="round"/>
			<path d="M42 28L46 32L42 36" stroke="#00BFB3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			<path d="M48 46L32 46" stroke="#00BFB3" stroke-width="2" stroke-linecap="round"/>
			<path d="M36 42L32 46L36 50" stroke="#00BFB3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>`
	};
</script>

<section class="benefits-section {className}">
	<!-- Desktop: Um card com todos os benefícios -->
	<div class="benefits-section__desktop">
		<div class="benefits-section__container">
			{#each benefits as benefit}
				<div class="benefits-section__item">
					<div class="benefits-section__icon">
						{@html icons[benefit.icon] || icons.delivery}
					</div>
					<div class="benefits-section__content">
						<h3 class="benefits-section__title">{benefit.title}</h3>
						<p class="benefits-section__subtitle">{benefit.subtitle}</p>
						{#if benefit.link}
							<a href={benefit.link.url} class="benefits-section__link">
								{benefit.link.text}
							</a>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Mobile: Cards separados com scroll horizontal -->
	<div class="benefits-section__mobile">
		<div class="benefits-section__scroll">
			{#each benefits as benefit}
				<div class="benefits-section__card">
					<div class="benefits-section__icon">
						{@html icons[benefit.icon] || icons.delivery}
					</div>
					<div class="benefits-section__content">
						<h3 class="benefits-section__title">{benefit.title}</h3>
						<p class="benefits-section__subtitle">{benefit.subtitle}</p>
						{#if benefit.link}
							<a href={benefit.link.url} class="benefits-section__link">
								{benefit.link.text}
							</a>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	/* Container principal */
	.benefits-section {
		width: 100%;
		padding: 0 16px;
		margin: 20px 0;
		background: white;
	}
	
	/* Desktop: Card único horizontal */
	.benefits-section__desktop {
		display: none;
	}
	
	@media (min-width: 1024px) {
		.benefits-section {
			padding: 0;
			margin: 32px 0;
			display: flex;
			justify-content: center;
			background: white;
		}
		
		.benefits-section__desktop {
			display: flex;
			justify-content: center;
			width: 100%;
			max-width: 1440px;
			padding: 0 20px;
		}
		
		.benefits-section__container {
			width: 100%;
			max-width: 1200px;
			height: 120px;
			flex-shrink: 0;
			border-radius: 20px;
			border: 1px solid #E4E3E3;
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 0 40px;
			background: white;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		}
		
		.benefits-section__item {
			display: flex;
			align-items: center;
			gap: 16px;
			flex: 1;
			justify-content: center;
			max-width: 280px;
		}
	}
	
	/* Mobile: Cards separados com scroll */
	.benefits-section__mobile {
		display: block;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
		-ms-overflow-style: none;
		margin: 0 -16px; /* Permite que cards saiam da área de padding */
		position: relative;
	}
	
	.benefits-section__mobile::-webkit-scrollbar {
		display: none;
	}
	
	/* Gradiente sutil nas laterais para indicar scroll */
	.benefits-section__mobile::before,
	.benefits-section__mobile::after {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		width: 20px;
		z-index: 2;
		pointer-events: none;
	}
	
	.benefits-section__mobile::before {
		left: 0;
		background: linear-gradient(to right, rgba(255,255,255,1), transparent);
	}
	
	.benefits-section__mobile::after {
		right: 0;
		background: linear-gradient(to left, rgba(255,255,255,1), transparent);
	}
	
	.benefits-section__scroll {
		display: flex;
		gap: 16px;
		padding: 0 24px 16px 24px; /* Padding maior para mostrar cards parciais */
		width: max-content;
	}
	
	/* Ajuste para mostrar parcialmente o primeiro e último card */
	.benefits-section__scroll::before {
		content: '';
		width: 0; /* Início sem espaço extra */
		flex-shrink: 0;
	}
	
	.benefits-section__scroll::after {
		content: '';
		width: 20px; /* Espaço extra no final para indicar mais conteúdo */
		flex-shrink: 0;
	}
	
	.benefits-section__card {
		width: 280px; /* Tamanho que permite ver parcialmente o próximo */
		height: 140px;
		flex-shrink: 0;
		border-radius: 20px;
		border: 1.48px solid #E4E3E3;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		padding: 20px;
		background: white;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		transition: transform 0.2s ease;
	}
	
	.benefits-section__card:hover {
		transform: translateY(-2px);
	}
	
	.benefits-section__card:first-child {
		margin-left: 0;
	}
	
	.benefits-section__card:last-child {
		margin-right: 0;
	}
	
	@media (min-width: 1024px) {
		.benefits-section__mobile {
			display: none;
		}
	}
	
	/* Ícone */
	.benefits-section__icon {
		width: 60px; /* Reduzido para mobile */
		height: 60px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	/* SVGs responsivos - removido seletor não usado */
	@media (min-width: 1024px) {
		.benefits-section__icon {
			width: 70px; /* Tamanho intermediário para desktop */
			height: 70px;
		}
	}
	
	/* Conteúdo dos textos */
	.benefits-section__content {
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex: 1;
	}
	
	/* Título principal */
	.benefits-section__title {
		color: #000;
		font-family: 'Lato', sans-serif;
		font-size: 13px;
		font-style: normal;
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: 0.28px;
		margin: 0;
	}
	
	@media (min-width: 1024px) {
		.benefits-section__title {
			font-size: 14px;
		}
	}
	
	/* Subtítulo */
	.benefits-section__subtitle {
		color: #000;
		font-family: 'Lato', sans-serif;
		font-size: 11px;
		font-style: normal;
		font-weight: 400;
		line-height: 1.2;
		letter-spacing: 0.24px;
		margin: 0;
	}
	
	@media (min-width: 1024px) {
		.benefits-section__subtitle {
			font-size: 12px;
		}
	}
	
	/* Link */
	.benefits-section__link {
		color: var(--Verde-Gro, #00BBB4);
		font-family: 'Lato', sans-serif;
		font-size: 10px;
		font-style: normal;
		font-weight: 400;
		line-height: 1.2;
		letter-spacing: 0.24px;
		text-decoration-line: underline;
		text-decoration-style: solid;
		text-decoration-skip-ink: none;
		text-decoration-thickness: auto;
		text-underline-offset: auto;
		text-underline-position: from-font;
		transition: opacity 0.3s ease;
		margin: 0;
	}
	
	@media (min-width: 1024px) {
		.benefits-section__link {
			font-size: 12px;
		}
	}
	
	.benefits-section__link:hover {
		opacity: 0.8;
	}
	
	/* Responsividade para telas muito pequenas */
	@media (max-width: 375px) {
		.benefits-section__card {
			width: 280px;
			height: 130px;
			border-radius: 18px;
			padding: 16px;
			gap: 12px;
		}
		
		.benefits-section__icon {
			width: 50px;
			height: 50px;
		}
		
		.benefits-section__title {
			font-size: 12px;
		}
		
		.benefits-section__subtitle {
			font-size: 10px;
		}
		
		.benefits-section__link {
			font-size: 9px;
		}
	}
</style> 