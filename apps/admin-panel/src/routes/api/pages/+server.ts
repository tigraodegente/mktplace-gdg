import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// TODO: Importar withDatabase do store quando disponível
// Por enquanto, simulando a mesma estrutura
async function withDatabase(platform: any, callback: (db: any) => Promise<any>) {
  // Mock temporário - substituir por conexão real
  const mockDb = {
    query: async (strings: TemplateStringsArray, ...values: any[]) => {
      // Simular query SQL - substituir por implementação real
      console.log('SQL Mock:', strings.join('?'), values);
      return [];
    },
    queryOne: async (strings: TemplateStringsArray, ...values: any[]) => {
      console.log('SQL Mock (One):', strings.join('?'), values);
      return null;
    }
  };
  
  return await callback(mockDb);
}

export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    const result = await withDatabase(platform, async (db) => {
      // Buscar todas as páginas publicadas
      const pages = await db.query`
        SELECT 
          id,
          title,
          slug,
          content,
          meta_title,
          meta_description,
          is_published,
          created_at,
          updated_at
        FROM pages 
        ORDER BY updated_at DESC
      `;
      
      return pages;
    });

    // Por enquanto, retornar mock + estrutura real
    const mockPages = [
      {
        id: '1',
        title: 'Sobre a Empresa',
        slug: 'a-empresa',
        content: '<h1>Sobre a Grão de Gente</h1>\n<p>A Grão de Gente é uma empresa familiar brasileira que nasceu do sonho de oferecer produtos de qualidade para bebês e crianças. Fundada em 2010, crescemos e nos tornamos referência no mercado infantil.</p>\n\n<h2>Nossa História</h2>\n<p>Tudo começou quando nossos fundadores, pais de primeira viagem, sentiram dificuldade em encontrar produtos que unissem qualidade, segurança e preço justo para seus filhos. Foi assim que surgiu a ideia de criar uma empresa que oferecesse exatamente o que eles gostariam de ter encontrado.</p>\n\n<h2>Nossa Missão</h2>\n<p>Proporcionar aos pais produtos seguros, confortáveis e de qualidade para o desenvolvimento saudável e feliz de seus filhos, sempre com o melhor custo-benefício do mercado.</p>\n\n<h2>Nossos Valores</h2>\n<ul>\n<li><strong>Qualidade:</strong> Todos os nossos produtos passam por rigorosos testes de qualidade</li>\n<li><strong>Segurança:</strong> A segurança das crianças é nossa prioridade absoluta</li>\n<li><strong>Sustentabilidade:</strong> Utilizamos materiais eco-friendly sempre que possível</li>\n<li><strong>Família:</strong> Entendemos as necessidades das famílias brasileiras</li>\n</ul>',
        meta_title: 'Sobre a Grão de Gente - Nossa História e Missão',
        meta_description: 'Conheça a história da Grão de Gente, empresa brasileira especializada em produtos infantis de qualidade. Saiba mais sobre nossa missão e valores.',
        is_published: true,
        created_at: new Date('2024-01-15').toISOString(),
        updated_at: new Date('2024-01-15').toISOString()
      },
      {
        id: '2',
        title: 'Política de Privacidade',
        slug: 'central-de-atendimento/politica-de-privacidade',
        content: '<h1>Política de Privacidade</h1>\n<p>Esta Política de Privacidade descreve como a Grão de Gente coleta, usa e protege suas informações pessoais quando você utiliza nosso site e serviços.</p>\n\n<h2>Informações que Coletamos</h2>\n<p>Coletamos informações que você nos fornece diretamente, como:</p>\n<ul>\n<li>Nome completo</li>\n<li>E-mail</li>\n<li>Telefone</li>\n<li>Endereço de entrega</li>\n<li>Informações de pagamento</li>\n</ul>\n\n<h2>Como Utilizamos suas Informações</h2>\n<p>Utilizamos suas informações para:</p>\n<ul>\n<li>Processar e entregar seus pedidos</li>\n<li>Fornecer suporte ao cliente</li>\n<li>Melhorar nossos produtos e serviços</li>\n<li>Enviar comunicações marketing (com seu consentimento)</li>\n</ul>\n\n<h2>Proteção de Dados</h2>\n<p>Implementamos medidas de segurança técnicas e organizacionais adequadas para proteger suas informações pessoais contra acesso não autorizado, alteração, divulgação ou destruição.</p>\n\n<h2>Seus Direitos</h2>\n<p>Você tem o direito de:</p>\n<ul>\n<li>Acessar suas informações pessoais</li>\n<li>Corrigir informações incorretas</li>\n<li>Solicitar a exclusão de seus dados</li>\n<li>Retirar seu consentimento a qualquer momento</li>\n</ul>\n\n<h2>Contato</h2>\n<p>Para questões sobre esta política, entre em contato conosco em: <a href="mailto:privacidade@graodegente.com.br">privacidade@graodegente.com.br</a></p>',
        meta_title: 'Política de Privacidade - Grão de Gente',
        meta_description: 'Conheça nossa política de privacidade e como protegemos seus dados pessoais. Transparência e segurança em primeiro lugar.',
        is_published: true,
        created_at: new Date('2024-01-10').toISOString(),
        updated_at: new Date('2024-01-10').toISOString()
      },
      {
        id: '3',
        title: 'Como Cuidar das Roupinhas do Bebê',
        slug: 'blog/como-cuidar-roupinhas-bebe',
        content: '<h1>Como Cuidar das Roupinhas do Bebê</h1>\n<p>As roupinhas do bebê merecem cuidados especiais para garantir que sejam seguras, macias e duráveis. Aqui estão nossas dicas essenciais para manter as peças do seu pequeno sempre perfeitas.</p>\n\n<h2>Antes da Primeira Lavagem</h2>\n<p>Sempre lave as roupas novas antes do primeiro uso, mesmo que pareçam limpas. Isso remove possíveis resíduos de fabricação e torna as peças mais macias para a pele sensível do bebê.</p>\n\n<h2>Escolha do Sabão</h2>\n<p>Use sabões neutros e hipoalergênicos, específicos para roupas de bebê. Evite amaciantes convencionais e prefira produtos naturais como vinagre branco diluído.</p>\n\n<h2>Temperatura da Água</h2>\n<p>Lave sempre com água morna (máximo 40°C). Água muito quente pode danificar as fibras e causar encolhimento.</p>\n\n<h2>Secagem</h2>\n<p>Prefira secar à sombra para preservar as cores e evitar que o sol ressaque o tecido. Se usar secadora, use temperatura baixa.</p>\n\n<h2>Manchas Difíceis</h2>\n<p>Para manchas de leite ou papinha, deixe de molho em água fria antes de lavar. Bicarbonato de sódio é um excelente removedor natural de odores.</p>\n\n<h2>Armazenamento</h2>\n<p>Guarde as roupas em local seco e arejado. Use sachês de lavanda natural para manter o cheiro agradável.</p>\n\n<p><em>Lembre-se: roupas bem cuidadas duram mais e proporcionam maior conforto para seu bebê!</em></p>',
        meta_title: 'Como Cuidar das Roupinhas do Bebê - Dicas Essenciais',
        meta_description: 'Aprenda como lavar, secar e conservar as roupinhas do seu bebê de forma segura e eficiente. Dicas práticas para o dia a dia.',
        is_published: true,
        created_at: new Date('2024-05-20').toISOString(),
        updated_at: new Date('2024-05-20').toISOString()
      }
    ];

    return json({
      success: true,
      data: mockPages
    });

  } catch (error) {
    console.error('Erro ao listar páginas:', error);
    return json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erro ao buscar páginas'
      }
    }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const data = await request.json();
    
    const result = await withDatabase(platform, async (db) => {
      // Inserir nova página
      const [newPage] = await db.query`
        INSERT INTO pages (title, slug, content, meta_title, meta_description, is_published, created_at, updated_at)
        VALUES (${data.title}, ${data.slug}, ${data.content}, ${data.meta_title}, ${data.meta_description}, ${data.is_published}, NOW(), NOW())
        RETURNING *
      `;
      
      return newPage;
    });
    
    // Por enquanto, simular criação
    const newPage = {
      id: Math.random().toString(36),
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('📝 Nova página criada:', newPage);
    
    return json({
      success: true,
      data: newPage
    });

  } catch (error) {
    console.error('Erro ao criar página:', error);
    return json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Erro ao criar página'
      }
    }, { status: 500 });
  }
}; 