<script lang="ts">
	// =============================================================================
	// TYPES
	// =============================================================================
	
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
	
	// =============================================================================
	// PROPS
	// =============================================================================
	
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
	
	// =============================================================================
	// CONSTANTS
	// =============================================================================
	
	const icons: Record<IconType, string> = {
		payment: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40" fill="none">
			<path d="M16.1417 4.59057C16.0937 4.51764 16.0605 4.43593 16.0441 4.35014C16.0277 4.26434 16.0283 4.17614 16.046 4.09059C16.0637 4.00505 16.098 3.92384 16.147 3.85161C16.1961 3.77939 16.2589 3.71758 16.3318 3.66971L20.3196 1.04788C20.4665 0.951035 20.6456 0.916598 20.8178 0.952145C20.9899 0.987693 21.141 1.09031 21.2376 1.23743C21.3342 1.38455 21.3686 1.56411 21.3331 1.73662C21.2977 1.90913 21.1953 2.06045 21.0484 2.1573L17.0599 4.77979C16.9131 4.87628 16.734 4.91041 16.5621 4.87468C16.3902 4.83895 16.2394 4.73629 16.143 4.58925L16.1417 4.59057ZM13.936 6.70517C14.0651 6.70531 14.1914 6.66745 14.2991 6.59629L14.9107 6.19461C14.9834 6.14666 15.046 6.08482 15.0949 6.01262C15.1438 5.94043 15.178 5.85929 15.1956 5.77384C15.2132 5.68839 15.2138 5.60031 15.1974 5.51462C15.181 5.42892 15.148 5.3473 15.1001 5.27442C15.0523 5.20153 14.9906 5.1388 14.9185 5.08981C14.8465 5.04082 14.7655 5.00653 14.6802 4.9889C14.595 4.97126 14.5071 4.97063 14.4216 4.98704C14.336 5.00345 14.2546 5.03658 14.1819 5.08453L13.571 5.48621C13.4518 5.56463 13.361 5.67951 13.3121 5.81378C13.2632 5.94804 13.2589 6.09453 13.2998 6.23145C13.3406 6.36838 13.4245 6.48844 13.5389 6.57378C13.6533 6.65913 13.7921 6.70521 13.9347 6.70517H13.936ZM21.6215 24.4319L21.3042 24.6411C21.1573 24.7379 21.0548 24.8893 21.0193 25.0618C20.9837 25.2344 21.0181 25.414 21.1147 25.5613C21.2113 25.7085 21.3624 25.8112 21.5346 25.8468C21.7068 25.8824 21.8861 25.848 22.033 25.7511L22.3503 25.542C22.4231 25.494 22.4857 25.4322 22.5346 25.36C22.5834 25.2878 22.6177 25.2067 22.6353 25.1212C22.6529 25.0358 22.6535 24.9477 22.6371 24.862C22.6207 24.7763 22.5877 24.6947 22.5398 24.6218C22.492 24.5489 22.4303 24.4862 22.3582 24.4372C22.2862 24.3882 22.2052 24.3539 22.1199 24.3363C22.0347 24.3186 21.9468 24.318 21.8612 24.3344C21.7757 24.3508 21.6943 24.384 21.6215 24.4319ZM26.694 21.0944L23.3872 23.2701C23.2403 23.3669 23.1378 23.5183 23.1023 23.6908C23.0668 23.8634 23.1011 24.043 23.1977 24.1903C23.2944 24.3375 23.4454 24.4402 23.6176 24.4758C23.7898 24.5114 23.9691 24.477 24.116 24.3801L27.4228 22.2045C27.4955 22.1565 27.5581 22.0947 27.607 22.0225C27.6559 21.9503 27.6901 21.8691 27.7077 21.7837C27.7253 21.6982 27.7259 21.6102 27.7095 21.5245C27.6932 21.4388 27.6601 21.3571 27.6122 21.2843C27.5644 21.2114 27.5027 21.1486 27.4306 21.0996C27.3586 21.0507 27.2776 21.0164 27.1924 20.9987C27.1071 20.9811 27.0192 20.9805 26.9337 20.9969C26.8482 21.0133 26.7667 21.0464 26.694 21.0944ZM31.8293 15.1987C31.7602 15.5411 31.6238 15.8662 31.428 16.1551C31.2323 16.4441 30.9811 16.6911 30.6891 16.8818L19.0886 24.5129C18.9767 25.854 18.4334 30.7538 16.3888 32.5696C15.4902 33.3823 14.4664 34.0439 13.357 34.5289L13.9129 34.9664C14.0404 35.0668 14.1267 35.2106 14.1556 35.3705C14.1844 35.5304 14.1537 35.6954 14.0692 35.8341L12.2141 38.8789C12.1549 38.9763 12.0717 39.0568 11.9725 39.1126C11.8733 39.1684 11.7614 39.1977 11.6476 39.1976C11.5262 39.1978 11.4071 39.164 11.3038 39.1C11.1538 39.0083 11.0464 38.8607 11.005 38.6896C10.9636 38.5186 10.9917 38.338 11.0831 38.1877L12.6295 35.6462L3.21612 28.2349L1.25831 30.5022C1.20136 30.5682 1.132 30.6223 1.05418 30.6614C0.976368 30.7006 0.891621 30.724 0.804782 30.7303C0.717943 30.7366 0.630712 30.7257 0.548069 30.6983C0.465427 30.6708 0.388992 30.6273 0.323128 30.5702C0.257265 30.5132 0.203262 30.4437 0.164204 30.3657C0.125146 30.2877 0.101797 30.2028 0.0954913 30.1158C0.0891852 30.0287 0.100045 29.9413 0.127451 29.8585C0.154857 29.7757 0.198272 29.6991 0.255218 29.6331L2.62646 26.8858C2.7379 26.7566 2.89476 26.6753 3.06443 26.659C3.23409 26.6427 3.40351 26.6925 3.53745 26.7981L4.92018 27.8863C5.4128 27.2107 5.71674 26.4157 5.8007 25.5832C5.81262 25.3176 5.81196 24.9956 5.81196 24.6351C5.81196 22.6865 5.8166 19.8243 7.34508 18.1027L7.13903 17.7874L7.13108 17.7781V17.7708L6.35392 16.5843C5.96895 15.9962 5.83254 15.279 5.97464 14.5902C6.11674 13.9014 6.52573 13.2972 7.11187 12.9102L21.7733 3.27136C22.0639 3.07957 22.3894 2.94712 22.7312 2.88163C23.073 2.81613 23.4243 2.81886 23.765 2.88966C24.1058 2.96047 24.4292 3.09795 24.7168 3.29424C25.0044 3.49053 25.2506 3.74176 25.4411 4.03354L26.2507 5.27043C26.2507 5.27043 26.2573 5.27574 26.2593 5.27906C26.2613 5.28238 26.2593 5.28637 26.2633 5.28969L31.4497 13.2083C31.6417 13.4987 31.7742 13.8244 31.8396 14.1666C31.905 14.5087 31.902 14.8604 31.8307 15.2014L31.8293 15.1987ZM7.45705 15.8514L7.87777 16.4941L24.7839 5.44836L24.3327 4.75921C24.2377 4.61342 24.1149 4.48787 23.9714 4.38978C23.8279 4.29169 23.6664 4.22299 23.4963 4.18764C23.3262 4.15229 23.1508 4.15098 22.9801 4.18378C22.8095 4.21658 22.647 4.28285 22.5021 4.37878L7.84066 14.0196C7.6953 14.1153 7.57024 14.2387 7.47268 14.383C7.37513 14.5272 7.30699 14.6894 7.2722 14.8601C7.23563 15.0299 7.23326 15.2052 7.26523 15.3759C7.2972 15.5466 7.36286 15.7091 7.45838 15.854L7.45705 15.8514ZM17.6562 25.4557L16.027 26.5279C15.9414 26.582 15.8529 26.6314 15.762 26.676C15.658 27.962 15.0677 29.5063 12.5739 30.9404C12.4984 30.984 12.4152 31.0122 12.3288 31.0236C12.2425 31.0349 12.1548 31.0291 12.0707 31.0065C11.9866 30.9839 11.9077 30.9449 11.8387 30.8917C11.7696 30.8386 11.7117 30.7723 11.6682 30.6967C11.6247 30.6211 11.5964 30.5377 11.5851 30.4511C11.5738 30.3646 11.5796 30.2767 11.6022 30.1924C11.6247 30.1082 11.6637 30.0292 11.7167 29.96C11.7698 29.8908 11.8359 29.8327 11.9113 29.7891C14.5953 28.2455 14.5065 26.7762 14.429 25.4783C14.3559 25.1197 14.3561 24.7499 14.4295 24.3914C14.503 24.0329 14.6481 23.693 14.8563 23.3922C15.3963 22.7734 16.1582 21.8586 16.7618 21.1276C16.9834 20.8572 17.1302 20.5332 17.1875 20.1881C17.2448 19.8429 17.2107 19.4888 17.0884 19.161L17.0301 19.0063C16.9917 18.9038 16.9285 18.8124 16.8462 18.7402C16.7639 18.6681 16.6651 18.6175 16.5586 18.5929C16.4521 18.5683 16.3411 18.5705 16.2357 18.5993C16.1302 18.6282 16.0335 18.6827 15.9542 18.758L10.1059 24.3111C9.97832 24.4323 9.80792 24.4978 9.63217 24.4931C9.45641 24.4885 9.28971 24.414 9.16873 24.2862C9.04775 24.1584 8.9824 23.9876 8.98706 23.8115C8.99172 23.6354 9.066 23.4683 9.19357 23.3471L10.1715 22.4176L8.11098 19.2719C7.14036 20.6734 7.13771 23.0124 7.13704 24.6351C7.13704 25.0175 7.13704 25.3594 7.12445 25.6409C7.02588 26.7507 6.62402 27.8117 5.96302 28.7076L12.13 33.5629C13.3867 33.1534 14.5396 32.4751 15.5089 31.5751C16.7625 30.4637 17.3958 27.4647 17.6562 25.4557ZM30.3426 13.9366L25.5107 6.55844L8.6059 17.6068L11.1487 21.4901L15.0418 17.7907C15.2799 17.5644 15.5703 17.4006 15.8869 17.3141C16.2035 17.2276 16.5366 17.221 16.8564 17.2949C17.1762 17.3688 17.4728 17.5209 17.7196 17.7376C17.9665 17.9544 18.1559 18.229 18.2711 18.5369L18.33 18.695C18.5337 19.2413 18.5904 19.8317 18.4946 20.407C18.3988 20.9823 18.1538 21.5223 17.7841 21.9727C17.1719 22.7143 16.4014 23.6412 15.8541 24.2666C15.7237 24.5343 15.6828 24.8369 15.7375 25.1297L29.9623 15.7684C30.1079 15.6733 30.2333 15.5504 30.3313 15.4066C30.4293 15.2628 30.498 15.101 30.5333 14.9305C30.5687 14.76 30.57 14.5841 30.5373 14.4131C30.5045 14.2421 30.4384 14.0793 30.3426 13.934V13.9366ZM24.7858 9.14641L21.9946 10.9729C21.8473 11.069 21.7442 11.2198 21.7079 11.3922C21.6716 11.5645 21.7051 11.7442 21.8011 11.8917C21.897 12.0393 22.0475 12.1426 22.2195 12.179C22.3915 12.2153 22.5708 12.1817 22.718 12.0856L25.5093 10.2611C25.6566 10.165 25.7597 10.0142 25.796 9.84186C25.8323 9.66954 25.7987 9.48983 25.7028 9.34227C25.6069 9.19471 25.4564 9.09139 25.2844 9.05504C25.1124 9.01868 24.9331 9.05227 24.7858 9.14841V9.14641Z" fill="#00BFB3"/>
		</svg>`,
		
		delivery: `<svg xmlns="http://www.w3.org/2000/svg" width="21" height="30" viewBox="0 0 21 30" fill="none">
			<path d="M5.91693 1.05664H14.2226L14.2431 1.06543L14.2441 1.06641C14.2462 1.06961 14.2464 1.0724 14.246 1.07422L11.2861 9.86914L10.9277 10.9355H19.2079C19.2193 10.9355 19.226 10.9413 19.2285 10.9453L19.2304 10.9482C19.2308 10.9496 19.2311 10.951 19.2304 10.9521L19.2294 10.9541L9.2597 29.0664C9.25829 29.069 9.25568 29.0727 9.24994 29.0752L9.23138 29.0762L9.21674 29.0625V17.5518H0.93158C0.922412 17.5518 0.914498 17.5465 0.911072 17.542C0.909521 17.5393 0.90961 17.5368 0.910095 17.5352L0.945251 17.4199V17.418L5.89447 1.06934C5.89504 1.06745 5.8976 1.0643 5.90131 1.06152L5.91693 1.05664Z" stroke="#00BFB3" stroke-width="1.61658"/>
		</svg>`,
		
		discount: `<svg xmlns="http://www.w3.org/2000/svg" width="29" height="28" viewBox="0 0 29 28" fill="none">
			<path d="M0.76325 15.518C0.436754 15.8472 0.44033 16.3805 0.771674 16.7092L11.4326 27.3701C11.7619 27.6968 12.2916 27.6984 12.6188 27.3735L27.8659 12.1264C28.0571 11.9339 28.143 11.6603 28.0965 11.3922L26.5225 2.30651C26.4616 1.95309 26.184 1.67546 25.8307 1.61473L16.7437 0.0394535C16.4756 -0.00637842 16.2027 0.0798674 16.0105 0.271028L0.76325 15.518ZM2.55384 16.1165L16.8943 1.77605L24.9644 3.17623L26.3646 11.2463L12.0241 25.5868L2.55384 16.1165ZM7.59223 13.0263C7.17072 13.4698 6.91214 14.0683 6.91345 14.7223C6.91631 16.0723 8.03075 17.1867 9.38072 17.1896C10.7307 17.1924 11.8396 16.0836 11.8367 14.7336C11.8338 13.3836 10.7196 12.2624 9.36975 12.2594C8.6734 12.2578 8.04075 12.5545 7.59223 13.0263ZM12.5538 9.9079L12.5747 19.5535L14.2576 19.5621L14.2414 9.91432L12.5538 9.9079ZM8.79488 14.1964C8.93514 14.0398 9.13955 13.9441 9.37333 13.9446C9.81313 13.9454 10.1516 14.2886 10.1526 14.7285C10.1534 15.1683 9.81665 15.5051 9.37683 15.5043C8.93702 15.5035 8.59974 15.1662 8.59875 14.7262C8.5983 14.52 8.67118 14.3345 8.79488 14.1964ZM20.0987 4.89448C19.282 5.75484 19.2989 7.14442 20.1475 7.99302C21.0096 8.85511 22.4264 8.85455 23.2831 7.9978C24.1399 7.14104 24.1393 5.7254 23.2772 4.86332C22.4151 4.00123 20.996 3.99715 20.1392 4.8539C20.1258 4.86732 20.1116 4.8809 20.0987 4.89448ZM21.3338 6.04845C21.5498 5.83244 21.878 5.83193 22.0933 6.04724C22.3086 6.26256 22.3082 6.59054 22.0921 6.80672C21.876 7.02273 21.5514 7.01976 21.3361 6.80445C21.1207 6.58913 21.1178 6.26446 21.3338 6.04845ZM15.6557 13.0425C15.2341 13.486 14.9744 14.0857 14.9757 14.7397C14.9786 16.0896 16.093 17.2041 17.443 17.2069C18.793 17.2098 19.903 16.0997 19.9001 14.7498C19.8973 13.3998 18.7829 12.2808 17.4328 12.2779C16.7366 12.2764 16.1043 12.5704 15.6557 13.0425ZM16.8571 14.2138C16.9974 14.0572 17.2018 13.9615 17.4356 13.962C17.8754 13.9628 18.2139 14.3059 18.2148 14.7459C18.2157 15.1857 17.8789 15.5225 17.4391 15.5217C16.9993 15.5208 16.662 15.1835 16.661 14.7436C16.6606 14.5374 16.7334 14.3518 16.8571 14.2138Z" fill="#00BFB3"/>
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

<section 
	class="benefits {className}"
	aria-label="Benefícios da loja"
>
	<!-- Desktop: Card único horizontal -->
	<div class="benefits__desktop">
		<div class="benefits__container">
			{#each benefits as benefit}
				<div class="benefits__item">
					<div class="benefits__icon" aria-hidden="true">
						{@html icons[benefit.icon] || icons.delivery}
					</div>
					<div class="benefits__content">
						<h3 class="benefits__title">{benefit.title}</h3>
						<p class="benefits__subtitle">{benefit.subtitle}</p>
						{#if benefit.link}
							<a 
								href={benefit.link.url} 
								class="benefits__link"
								aria-label="{benefit.link.text} sobre {benefit.title}"
							>
								{benefit.link.text}
							</a>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Mobile: Cards separados com scroll horizontal -->
	<div class="benefits__mobile">
		<div 
			class="benefits__scroll"
			role="list"
			aria-label="Lista de benefícios"
		>
			{#each benefits as benefit}
				<div 
					class="benefits__card"
					role="listitem"
				>
					<div class="benefits__icon" aria-hidden="true">
						{@html icons[benefit.icon] || icons.delivery}
					</div>
					<div class="benefits__content">
						<h3 class="benefits__title">{benefit.title}</h3>
						<p class="benefits__subtitle">{benefit.subtitle}</p>
						{#if benefit.link}
							<a 
								href={benefit.link.url} 
								class="benefits__link"
								aria-label="{benefit.link.text} sobre {benefit.title}"
							>
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
	/* =============================================================================
	   CSS CUSTOM PROPERTIES
	   ============================================================================= */
	
	.benefits {
		/* Colors */
		--color-primary: #00BFB3;
		--color-text-primary: #000000;
		--color-background: #FFFFFF;
		--color-border: #E4E3E3;
		--color-icon-background: #E9FFFE;
		--color-link: #00BBB4;
		--color-shadow: rgba(0, 0, 0, 0.08);
		
		/* Spacing */
		--spacing-xs: 4px;
		--spacing-sm: 8px;
		--spacing-md: 12px;
		--spacing-lg: 16px;
		--spacing-xl: 20px;
		--spacing-2xl: 24px;
		--spacing-3xl: 32px;
		--spacing-4xl: 40px;
		
		/* Dimensions */
		--container-max-width: 1440px;
		--card-max-width: 1200px;
		--card-height-desktop: 120px;
		--card-height-mobile: 140px;
		--card-width-mobile: 280px;
		--icon-size: 77.932px;
		--icon-size-mobile: 50px;
		
		/* Border radius */
		--border-radius-sm: 16px;
		--border-radius-md: 18px;
		--border-radius-lg: 20px;
		--border-radius-full: 77.932px;
		
		/* Borders */
		--border-width: 1px;
		--border-width-mobile: 1.48px;
		
		/* Typography */
		--font-family: 'Lato', sans-serif;
		--font-size-title-mobile: 12px;
		--font-size-title-tablet: 13px;
		--font-size-title-desktop: 14px;
		--font-size-subtitle-mobile: 10px;
		--font-size-subtitle-tablet: 11px;
		--font-size-subtitle-desktop: 12px;
		--font-size-link-mobile: 9px;
		--font-size-link-tablet: 10px;
		--font-size-link-desktop: 12px;
		--font-weight-title: 700;
		--font-weight-subtitle: 400;
		--letter-spacing-title: 0.28px;
		--letter-spacing-subtitle: 0.24px;
		--letter-spacing-link: 0.24px;
		--line-height: 1.2;
		
		/* Transitions */
		--transition-fast: 0.2s ease;
		--transition-base: 0.3s ease;
		
		/* Shadows */
		--box-shadow: 0 2px 8px var(--color-shadow);
		--box-shadow-hover: 0 4px 12px var(--color-shadow);
	}
	
	/* =============================================================================
	   BASE STYLES
	   ============================================================================= */
	
	.benefits {
		width: 100%;
		background: var(--color-background);
		padding: 0 var(--spacing-lg);
		margin: var(--spacing-xl) 0;
	}
	
	/* =============================================================================
	   DESKTOP LAYOUT
	   ============================================================================= */
	
	.benefits__desktop {
		display: none;
	}
	
	@media (min-width: 1024px) {
		.benefits {
			padding: 0;
			margin: var(--spacing-3xl) 0;
			display: flex;
			justify-content: center;
		}
		
		.benefits__desktop {
			display: flex;
			justify-content: center;
			width: 100%;
			max-width: var(--container-max-width);
			padding: 0 var(--spacing-xl);
		}
		
		.benefits__container {
			width: 100%;
			max-width: var(--card-max-width);
			height: var(--card-height-desktop);
			flex-shrink: 0;
			border-radius: var(--border-radius-lg);
			border: var(--border-width) solid var(--color-border);
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 0 var(--spacing-4xl);
			background: var(--color-background);
			box-shadow: var(--box-shadow);
			transition: box-shadow var(--transition-base);
		}
		
		.benefits__container:hover {
			box-shadow: var(--box-shadow-hover);
		}
		
		.benefits__item {
			display: flex;
			align-items: center;
			gap: var(--spacing-lg);
			flex: 1;
			justify-content: center;
			max-width: 280px;
		}
	}
	
	/* =============================================================================
	   MOBILE LAYOUT
	   ============================================================================= */
	
	.benefits__mobile {
		display: block;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
		-ms-overflow-style: none;
		margin: 0 calc(-1 * var(--spacing-lg));
		position: relative;
	}
	
	.benefits__mobile::-webkit-scrollbar {
		display: none;
	}
	
	/* Gradiente visual para indicar scroll */
	.benefits__mobile::before,
	.benefits__mobile::after {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		width: var(--spacing-xl);
		z-index: 2;
		pointer-events: none;
	}
	
	.benefits__mobile::before {
		left: 0;
		background: linear-gradient(to right, var(--color-background), transparent);
	}
	
	.benefits__mobile::after {
		right: 0;
		background: linear-gradient(to left, var(--color-background), transparent);
	}
	
	.benefits__scroll {
		display: flex;
		gap: var(--spacing-lg);
		padding: 0 var(--spacing-2xl) var(--spacing-lg) var(--spacing-2xl);
		width: max-content;
	}
	
	.benefits__card {
		width: var(--card-width-mobile);
		height: var(--card-height-mobile);
		flex-shrink: 0;
		border-radius: var(--border-radius-lg);
		border: var(--border-width-mobile) solid var(--color-border);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-lg);
		padding: var(--spacing-xl);
		background: var(--color-background);
		box-shadow: var(--box-shadow);
		transition: transform var(--transition-fast), box-shadow var(--transition-base);
	}
	
	.benefits__card:hover {
		transform: translateY(-2px);
		box-shadow: var(--box-shadow-hover);
	}
	
	@media (min-width: 1024px) {
		.benefits__mobile {
			display: none;
		}
	}
	
	/* =============================================================================
	   ICON STYLES
	   ============================================================================= */
	
	.benefits__icon {
		width: var(--icon-size);
		height: var(--icon-size);
		flex-shrink: 0;
		border-radius: var(--border-radius-full);
		background: var(--color-icon-background);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	/* =============================================================================
	   CONTENT STYLES
	   ============================================================================= */
	
	.benefits__content {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		flex: 1;
	}
	
	.benefits__title {
		color: var(--color-text-primary);
		font-family: var(--font-family);
		font-size: var(--font-size-title-tablet);
		font-weight: var(--font-weight-title);
		line-height: var(--line-height);
		letter-spacing: var(--letter-spacing-title);
		margin: 0;
	}
	
	.benefits__subtitle {
		color: var(--color-text-primary);
		font-family: var(--font-family);
		font-size: var(--font-size-subtitle-tablet);
		font-weight: var(--font-weight-subtitle);
		line-height: var(--line-height);
		letter-spacing: var(--letter-spacing-subtitle);
		margin: 0;
	}
	
	.benefits__link {
		color: var(--color-link);
		font-family: var(--font-family);
		font-size: var(--font-size-link-tablet);
		font-weight: var(--font-weight-subtitle);
		line-height: var(--line-height);
		letter-spacing: var(--letter-spacing-link);
		text-decoration: underline;
		transition: opacity var(--transition-base);
		margin: 0;
	}
	
	.benefits__link:hover {
		opacity: 0.8;
	}
	
	/* =============================================================================
	   RESPONSIVE BREAKPOINTS
	   ============================================================================= */
	
	/* Mobile pequeno: até 375px */
	@media (max-width: 375px) {
		.benefits__card {
			width: var(--card-width-mobile);
			height: 130px;
			border-radius: var(--border-radius-md);
			padding: var(--spacing-lg);
			gap: var(--spacing-md);
		}
		
		.benefits__icon {
			width: var(--icon-size-mobile);
			height: var(--icon-size-mobile);
		}
		
		.benefits__title {
			font-size: var(--font-size-title-mobile);
		}
		
		.benefits__subtitle {
			font-size: var(--font-size-subtitle-mobile);
		}
		
		.benefits__link {
			font-size: var(--font-size-link-mobile);
		}
	}
	
	/* Desktop: 1024px+ */
	@media (min-width: 1024px) {
		.benefits__title {
			font-size: var(--font-size-title-desktop);
		}
		
		.benefits__subtitle {
			font-size: var(--font-size-subtitle-desktop);
		}
		
		.benefits__link {
			font-size: var(--font-size-link-desktop);
		}
	}
</style> 