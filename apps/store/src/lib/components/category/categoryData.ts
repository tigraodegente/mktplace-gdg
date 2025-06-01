// ===== CATEGORY DATA =====
// Mock data for category section component

export interface CategoryItem {
	id: string;
	name: string;
	description: string;
	price: string;
	image: string;
	slug: string;
}

export interface CategoryGroup {
	id: string;
	name: string;
	items: CategoryItem[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
	{
		id: 'enxoval',
		name: 'Enxoval e acessórios',
		items: [
			{
				id: '1',
				name: 'Kit Berço',
				description: 'Mais de 80 modelos disponíveis em diversos estilos.',
				price: '274,56',
				image: 'https://picsum.photos/300/200?random=1',
				slug: 'kit-berco'
			},
			{
				id: '2', 
				name: 'Almofadas',
				description: 'Conforto e estilo para decoração.',
				price: '89,90',
				image: 'https://picsum.photos/300/200?random=2',
				slug: 'almofadas'
			},
			{
				id: '3',
				name: 'Roupinhas',
				description: 'Roupas para bebês e crianças.',
				price: '45,90',
				image: 'https://picsum.photos/300/200?random=3',
				slug: 'roupinhas'
			},
			{
				id: '4',
				name: 'Acessórios',
				description: 'Acessórios diversos para o quarto.',
				price: '125,00',
				image: 'https://picsum.photos/300/200?random=4',
				slug: 'acessorios'
			},
			{
				id: '5',
				name: 'Lençóis',
				description: 'Lençóis de alta qualidade para bebês.',
				price: '89,90',
				image: 'https://picsum.photos/300/200?random=21',
				slug: 'lencois'
			},
			{
				id: '6',
				name: 'Mantas',
				description: 'Mantas macias e quentinhas.',
				price: '156,00',
				image: 'https://picsum.photos/300/200?random=22',
				slug: 'mantas'
			},
			{
				id: '7',
				name: 'Toalhas',
				description: 'Kit de toalhas felpudas.',
				price: '78,50',
				image: 'https://picsum.photos/300/200?random=23',
				slug: 'toalhas'
			},
			{
				id: '8',
				name: 'Babadores',
				description: 'Babadores impermeáveis e estilosos.',
				price: '35,90',
				image: 'https://picsum.photos/300/200?random=24',
				slug: 'babadores'
			}
		]
	},
	{
		id: 'moveis',
		name: 'Móveis',
		items: [
			{
				id: '1',
				name: 'Cômoda',
				description: 'Mais de 80 modelos disponíveis em diversos estilos.',
				price: '274,56',
				image: 'https://picsum.photos/300/200?random=5',
				slug: 'comoda'
			},
			{
				id: '2',
				name: 'Berço',
				description: 'Os mais baratos do Brasil!',
				price: '292,49',
				image: 'https://picsum.photos/300/200?random=6',
				slug: 'berco'
			},
			{
				id: '3',
				name: 'Poltrona e Puff',
				description: 'Mais conforto na hora da amamentação.',
				price: '615,50',
				image: 'https://picsum.photos/300/200?random=7',
				slug: 'poltrona-puff'
			},
			{
				id: '4',
				name: 'Móveis Quarto Completo',
				description: 'Compre seu quarto Encontre o combo ideal para você.',
				price: '745,90',
				image: 'https://picsum.photos/300/200?random=8',
				slug: 'quarto-completo'
			},
			{
				id: '5',
				name: 'Guarda-Roupa',
				description: 'Espaço organizado para as roupinhas.',
				price: '489,90',
				image: 'https://picsum.photos/300/200?random=25',
				slug: 'guarda-roupa'
			},
			{
				id: '6',
				name: 'Mesa e Cadeira',
				description: 'Conjunto infantil para estudos.',
				price: '235,00',
				image: 'https://picsum.photos/300/200?random=26',
				slug: 'mesa-cadeira'
			},
			{
				id: '7',
				name: 'Estante',
				description: 'Estante para livros e brinquedos.',
				price: '189,90',
				image: 'https://picsum.photos/300/200?random=27',
				slug: 'estante'
			},
			{
				id: '8',
				name: 'Trocador',
				description: 'Trocador seguro e funcional.',
				price: '156,50',
				image: 'https://picsum.photos/300/200?random=28',
				slug: 'trocador'
			}
		]
	},
	{
		id: 'combos',
		name: 'Combos',
		items: [
			{
				id: '1',
				name: 'Combo Berço + Cômoda',
				description: 'Kit completo para o quarto do bebê.',
				price: '890,99',
				image: 'https://picsum.photos/300/200?random=9',
				slug: 'combo-berco-comoda'
			},
			{
				id: '2',
				name: 'Combo Quarto Completo',
				description: 'Tudo que você precisa em um só kit.',
				price: '1.250,00',
				image: 'https://picsum.photos/300/200?random=10',
				slug: 'combo-quarto-completo'
			},
			{
				id: '3',
				name: 'Combo Enxoval',
				description: 'Kit enxoval completo para recém-nascidos.',
				price: '320,90',
				image: 'https://picsum.photos/300/200?random=11',
				slug: 'combo-enxoval'
			},
			{
				id: '4',
				name: 'Combo Decoração',
				description: 'Itens decorativos para o quarto.',
				price: '180,50',
				image: 'https://picsum.photos/300/200?random=12',
				slug: 'combo-decoracao'
			},
			{
				id: '5',
				name: 'Combo Banho',
				description: 'Kit completo para hora do banho.',
				price: '125,90',
				image: 'https://picsum.photos/300/200?random=29',
				slug: 'combo-banho'
			},
			{
				id: '6',
				name: 'Combo Alimentação',
				description: 'Tudo para alimentação do bebê.',
				price: '89,90',
				image: 'https://picsum.photos/300/200?random=30',
				slug: 'combo-alimentacao'
			},
			{
				id: '7',
				name: 'Combo Passeio',
				description: 'Kit para sair com o bebê.',
				price: '456,00',
				image: 'https://picsum.photos/300/200?random=31',
				slug: 'combo-passeio'
			},
			{
				id: '8',
				name: 'Combo Segurança',
				description: 'Produtos para segurança infantil.',
				price: '198,50',
				image: 'https://picsum.photos/300/200?random=32',
				slug: 'combo-seguranca'
			}
		]
	},
	{
		id: 'infantil',
		name: 'Infantil',
		items: [
			{
				id: '1',
				name: 'Brinquedos',
				description: 'Diversão garantida para todas as idades.',
				price: '89,90',
				image: 'https://picsum.photos/300/200?random=13',
				slug: 'brinquedos'
			},
			{
				id: '2',
				name: 'Livros Infantis',
				description: 'Estimule a leitura desde cedo.',
				price: '35,90',
				image: 'https://picsum.photos/300/200?random=14',
				slug: 'livros-infantis'
			},
			{
				id: '3',
				name: 'Jogos Educativos',
				description: 'Aprender brincando é mais divertido.',
				price: '125,00',
				image: 'https://picsum.photos/300/200?random=15',
				slug: 'jogos-educativos'
			},
			{
				id: '4',
				name: 'Material Escolar',
				description: 'Tudo para o ano letivo.',
				price: '78,50',
				image: 'https://picsum.photos/300/200?random=16',
				slug: 'material-escolar'
			},
			{
				id: '5',
				name: 'Pelúcias',
				description: 'Bichinhos fofos e macios.',
				price: '45,90',
				image: 'https://picsum.photos/300/200?random=33',
				slug: 'pelucias'
			},
			{
				id: '6',
				name: 'Instrumentos Musicais',
				description: 'Desenvolva o talento musical.',
				price: '156,00',
				image: 'https://picsum.photos/300/200?random=34',
				slug: 'instrumentos-musicais'
			},
			{
				id: '7',
				name: 'Quebra-Cabeças',
				description: 'Diversão e raciocínio lógico.',
				price: '29,90',
				image: 'https://picsum.photos/300/200?random=35',
				slug: 'quebra-cabecas'
			},
			{
				id: '8',
				name: 'Arte e Pintura',
				description: 'Kit para pequenos artistas.',
				price: '67,50',
				image: 'https://picsum.photos/300/200?random=36',
				slug: 'arte-pintura'
			}
		]
	},
	{
		id: 'moda',
		name: 'Moda',
		items: [
			{
				id: '1',
				name: 'Roupas Bebê',
				description: 'Moda confortável para os pequenos.',
				price: '45,90',
				image: 'https://picsum.photos/300/200?random=17',
				slug: 'roupas-bebe'
			},
			{
				id: '2',
				name: 'Roupas Infantil',
				description: 'Estilo e conforto para crianças.',
				price: '89,90',
				image: 'https://picsum.photos/300/200?random=18',
				slug: 'roupas-infantil'
			},
			{
				id: '3',
				name: 'Calçados',
				description: 'Primeiros passinhos com segurança.',
				price: '125,90',
				image: 'https://picsum.photos/300/200?random=19',
				slug: 'calcados'
			},
			{
				id: '4',
				name: 'Acessórios Fashion',
				description: 'Completem o visual dos pequenos.',
				price: '35,90',
				image: 'https://picsum.photos/300/200?random=20',
				slug: 'acessorios-fashion'
			},
			{
				id: '5',
				name: 'Pijamas',
				description: 'Noites confortáveis e divertidas.',
				price: '56,90',
				image: 'https://picsum.photos/300/200?random=37',
				slug: 'pijamas'
			},
			{
				id: '6',
				name: 'Fantasias',
				description: 'Para brincadeiras e festas.',
				price: '78,50',
				image: 'https://picsum.photos/300/200?random=38',
				slug: 'fantasias'
			},
			{
				id: '7',
				name: 'Chapéus e Bonés',
				description: 'Proteção e estilo.',
				price: '29,90',
				image: 'https://picsum.photos/300/200?random=39',
				slug: 'chapeus-bones'
			},
			{
				id: '8',
				name: 'Meias e Meia-Calça',
				description: 'Pezinhos sempre quentinhos.',
				price: '19,90',
				image: 'https://picsum.photos/300/200?random=40',
				slug: 'meias-meia-calca'
			}
		]
	}
];

export const DEFAULT_ACTIVE_TAB = 'moveis';
export const LOADING_DELAY = 500; 