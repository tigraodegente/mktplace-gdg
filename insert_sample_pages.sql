-- Script para inserir páginas estáticas e posts do blog iniciais
-- Execute este script para popular a tabela 'pages' com conteúdo inicial

-- Limpar dados existentes (opcional - apenas para desenvolvimento)
-- DELETE FROM pages;

-- Inserir páginas institucionais
INSERT INTO pages (id, title, slug, content, meta_title, meta_description, is_published, created_at, updated_at) VALUES
-- Página "Sobre a Empresa"
('page-1', 'Sobre a Empresa', 'a-empresa', 
'<h1>Sobre a Grão de Gente</h1>
<p>A Grão de Gente é uma empresa familiar brasileira que nasceu do sonho de oferecer produtos de qualidade para bebês e crianças. Fundada em 2010, crescemos e nos tornamos referência no mercado infantil.</p>

<h2>Nossa História</h2>
<p>Tudo começou quando nossos fundadores, pais de primeira viagem, sentiram dificuldade em encontrar produtos que unissem qualidade, segurança e preço justo para seus filhos. Foi assim que surgiu a ideia de criar uma empresa que oferecesse exatamente o que eles gostariam de ter encontrado.</p>

<h2>Nossa Missão</h2>
<p>Proporcionar aos pais produtos seguros, confortáveis e de qualidade para o desenvolvimento saudável e feliz de seus filhos, sempre com o melhor custo-benefício do mercado.</p>

<h2>Nossos Valores</h2>
<ul>
<li><strong>Qualidade:</strong> Todos os nossos produtos passam por rigorosos testes de qualidade</li>
<li><strong>Segurança:</strong> A segurança das crianças é nossa prioridade absoluta</li>
<li><strong>Sustentabilidade:</strong> Utilizamos materiais eco-friendly sempre que possível</li>
<li><strong>Família:</strong> Entendemos as necessidades das famílias brasileiras</li>
</ul>

<h2>Certificações</h2>
<p>Todos os nossos produtos possuem certificação do INMETRO e seguem as normas de segurança internacionais para produtos infantis.</p>',
'Sobre a Grão de Gente - Nossa História e Missão',
'Conheça a história da Grão de Gente, empresa brasileira especializada em produtos infantis de qualidade. Saiba mais sobre nossa missão e valores.',
true, NOW(), NOW()),

-- Política de Privacidade
('page-2', 'Política de Privacidade', 'central-de-atendimento/politica-de-privacidade',
'<h1>Política de Privacidade</h1>
<p>Esta Política de Privacidade descreve como a Grão de Gente coleta, usa e protege suas informações pessoais quando você utiliza nosso site e serviços.</p>

<h2>Informações que Coletamos</h2>
<p>Coletamos informações que você nos fornece diretamente, como:</p>
<ul>
<li>Nome completo</li>
<li>E-mail</li>
<li>Telefone</li>
<li>Endereço de entrega</li>
<li>Informações de pagamento</li>
</ul>

<h2>Como Utilizamos suas Informações</h2>
<p>Utilizamos suas informações para:</p>
<ul>
<li>Processar e entregar seus pedidos</li>
<li>Fornecer suporte ao cliente</li>
<li>Melhorar nossos produtos e serviços</li>
<li>Enviar comunicações marketing (com seu consentimento)</li>
</ul>

<h2>Proteção de Dados</h2>
<p>Implementamos medidas de segurança técnicas e organizacionais adequadas para proteger suas informações pessoais contra acesso não autorizado, alteração, divulgação ou destruição.</p>

<h2>Compartilhamento de Dados</h2>
<p>Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, exceto quando necessário para processar seu pedido ou quando exigido por lei.</p>

<h2>Cookies</h2>
<p>Utilizamos cookies para melhorar sua experiência em nosso site. Você pode desabilitar os cookies em seu navegador, mas isso pode afetar a funcionalidade do site.</p>

<h2>Seus Direitos</h2>
<p>Você tem o direito de:</p>
<ul>
<li>Acessar suas informações pessoais</li>
<li>Corrigir informações incorretas</li>
<li>Solicitar a exclusão de seus dados</li>
<li>Retirar seu consentimento a qualquer momento</li>
</ul>

<h2>Contato</h2>
<p>Para questões sobre esta política, entre em contato conosco em: <a href="mailto:privacidade@graodegente.com.br">privacidade@graodegente.com.br</a></p>

<p><em>Última atualização: Janeiro de 2024</em></p>',
'Política de Privacidade - Grão de Gente',
'Conheça nossa política de privacidade e como protegemos seus dados pessoais. Transparência e segurança em primeiro lugar.',
true, NOW(), NOW()),

-- Como Comprar
('page-3', 'Como Comprar', 'central-de-atendimento/como-comprar',
'<h1>Como Comprar na Grão de Gente</h1>
<p>Comprar em nosso site é fácil, rápido e seguro. Siga este guia passo a passo para fazer seu pedido:</p>

<h2>1. Escolha seus Produtos</h2>
<p>Navegue por nossas categorias ou use a busca para encontrar o que procura. Clique no produto para ver detalhes, fotos e avaliações.</p>

<h2>2. Adicione ao Carrinho</h2>
<p>Selecione o tamanho, cor (quando aplicável) e quantidade desejada. Clique em "Adicionar ao Carrinho".</p>

<h2>3. Revise seu Pedido</h2>
<p>No carrinho, confira os itens selecionados, quantidades e o total do pedido. Você pode alterar quantidades ou remover itens.</p>

<h2>4. Faça Login ou Cadastre-se</h2>
<p>Se já tem conta, faça login. Se é primeira compra, crie sua conta rapidamente com e-mail e senha.</p>

<h2>5. Endereço de Entrega</h2>
<p>Informe o endereço completo onde deseja receber seus produtos. Você pode cadastrar múltiplos endereços.</p>

<h2>6. Escolha o Frete</h2>
<p>Selecione entre as opções de entrega disponíveis para seu CEP. Veja prazos e valores de cada modalidade.</p>

<h2>7. Forma de Pagamento</h2>
<p>Escolha entre:</p>
<ul>
<li>Cartão de crédito (até 12x sem juros)</li>
<li>Cartão de débito</li>
<li>PIX (desconto de 5%)</li>
<li>Boleto bancário</li>
</ul>

<h2>8. Confirme o Pedido</h2>
<p>Revise todos os dados e clique em "Finalizar Pedido". Você receberá uma confirmação por e-mail.</p>

<h2>Acompanhe seu Pedido</h2>
<p>Acesse "Meus Pedidos" em sua conta para acompanhar o status e o código de rastreamento.</p>',
'Como Comprar - Passo a Passo | Grão de Gente',
'Aprenda como fazer seu pedido de forma fácil e segura. Guia completo passo a passo para comprar na Grão de Gente.',
true, NOW(), NOW()),

-- Trocas e Devoluções
('page-4', 'Trocas e Devoluções', 'central-de-atendimento/devolucao-do-produto',
'<h1>Trocas e Devoluções</h1>
<p>Sua satisfação é nossa prioridade. Veja como trocar ou devolver produtos de forma simples e sem complicações.</p>

<h2>Prazo para Trocas e Devoluções</h2>
<p>Você tem até <strong>7 dias</strong> após o recebimento do produto para solicitar troca ou devolução, conforme o Código de Defesa do Consumidor.</p>

<h2>Condições para Troca/Devolução</h2>
<p>O produto deve estar:</p>
<ul>
<li>Em perfeitas condições de uso</li>
<li>Com embalagem original</li>
<li>Com etiquetas e lacres preservados</li>
<li>Acompanhado da nota fiscal</li>
</ul>

<h2>Como Solicitar</h2>
<ol>
<li>Acesse "Meus Pedidos" em sua conta</li>
<li>Clique em "Solicitar Troca/Devolução"</li>
<li>Selecione o(s) produto(s) e motivo</li>
<li>Aguarde a aprovação (até 24h)</li>
</ol>

<h2>Retirada do Produto</h2>
<p>Após aprovação, agende a retirada:</p>
<ul>
<li><strong>Gratuita:</strong> Em sua residência (prazo de 5 dias úteis)</li>
<li><strong>Expressa:</strong> Nos Correios mais próximos (código será enviado)</li>
</ul>

<h2>Motivos para Troca</h2>
<ul>
<li>Produto com defeito</li>
<li>Tamanho incorreto</li>
<li>Produto diferente do pedido</li>
<li>Arrependimento da compra</li>
</ul>

<h2>Reembolso</h2>
<p>Em caso de devolução:</p>
<ul>
<li><strong>Cartão de crédito:</strong> Estorno em até 2 faturas</li>
<li><strong>Outros pagamentos:</strong> Depósito em até 10 dias úteis</li>
</ul>

<h2>Produtos que NÃO podem ser trocados</h2>
<ul>
<li>Produtos personalizados</li>
<li>Itens de higiene íntima (se violada embalagem)</li>
<li>Produtos em promoção específica (quando indicado)</li>
</ul>

<h2>Precisa de Ajuda?</h2>
<p>Entre em contato conosco:</p>
<ul>
<li>WhatsApp: (35) 99999-9999</li>
<li>E-mail: trocas@graodegente.com.br</li>
<li>Telefone: (35) 3333-3333</li>
</ul>',
'Trocas e Devoluções - Central de Atendimento',
'Saiba como trocar ou devolver produtos de forma fácil e sem complicações. Políticas claras e processo simplificado.',
true, NOW(), NOW());

-- Inserir posts do blog
INSERT INTO pages (id, title, slug, content, meta_title, meta_description, is_published, created_at, updated_at) VALUES
-- Post 1: Como Cuidar das Roupinhas do Bebê
('blog-1', 'Como Cuidar das Roupinhas do Bebê', 'blog/como-cuidar-roupinhas-bebe',
'<h1>Como Cuidar das Roupinhas do Bebê</h1>
<p>As roupinhas do bebê merecem cuidados especiais para garantir que sejam seguras, macias e duráveis. Aqui estão nossas dicas essenciais para manter as peças do seu pequeno sempre perfeitas.</p>

<h2>Antes da Primeira Lavagem</h2>
<p>Sempre lave as roupas novas antes do primeiro uso, mesmo que pareçam limpas. Isso remove possíveis resíduos de fabricação e torna as peças mais macias para a pele sensível do bebê.</p>

<h2>Escolha do Sabão</h2>
<p>Use sabões neutros e hipoalergênicos, específicos para roupas de bebê. Evite amaciantes convencionais e prefira produtos naturais como vinagre branco diluído.</p>

<h2>Temperatura da Água</h2>
<p>Lave sempre com água morna (máximo 40°C). Água muito quente pode danificar as fibras e causar encolhimento.</p>

<h2>Secagem</h2>
<p>Prefira secar à sombra para preservar as cores e evitar que o sol ressaque o tecido. Se usar secadora, use temperatura baixa.</p>

<h2>Manchas Difíceis</h2>
<p>Para manchas de leite ou papinha, deixe de molho em água fria antes de lavar. Bicarbonato de sódio é um excelente removedor natural de odores.</p>

<h2>Armazenamento</h2>
<p>Guarde as roupas em local seco e arejado. Use sachês de lavanda natural para manter o cheiro agradável.</p>

<p><em>Lembre-se: roupas bem cuidadas duram mais e proporcionam maior conforto para seu bebê!</em></p>',
'Como Cuidar das Roupinhas do Bebê - Dicas Essenciais',
'Aprenda como lavar, secar e conservar as roupinhas do seu bebê de forma segura e eficiente. Dicas práticas para o dia a dia.',
true, '2024-05-20 10:00:00', '2024-05-20 10:00:00'),

-- Post 2: Primeiros Passos do Bebê
('blog-2', '5 Dicas para os Primeiros Passos do Bebê', 'blog/primeiros-passos-bebe',
'<h1>5 Dicas para os Primeiros Passos do Bebê</h1>
<p>Os primeiros passos do bebê são um marco emocionante! Veja como estimular e apoiar seu pequeno nesta fase tão especial.</p>

<h2>1. Deixe o Bebê Descalço</h2>
<p>Sempre que possível, deixe o bebê andar descalço em casa. Isso ajuda no desenvolvimento do equilíbrio e fortalece os músculos dos pés.</p>

<h2>2. Crie um Ambiente Seguro</h2>
<p>Remova obstáculos e objetos perigosos. Use protetores de quina e certifique-se de que o chão esteja limpo e livre de objetos pequenos.</p>

<h2>3. Estimule com Brinquedos</h2>
<p>Use brinquedos de empurrar ou coloque objetos interessantes em locais que incentivem o bebê a se mover e explorar.</p>

<h2>4. Seja Paciente</h2>
<p>Cada bebê tem seu tempo. Alguns começam a andar aos 9 meses, outros aos 15 meses. Ambos estão dentro do normal!</p>

<h2>5. Celebre as Conquistas</h2>
<p>Comemore cada tentativa e progresso. Seu entusiasmo motiva o bebê a continuar tentando.</p>

<h2>Quando se Preocupar</h2>
<p>Se aos 18 meses o bebê ainda não caminha ou mostra sinais de querer caminhar, consulte o pediatra.</p>

<h2>Calçados Adequados</h2>
<p>Quando for necessário usar sapatos, escolha modelos flexíveis, com sola antiderrapante e que permitam o movimento natural dos pés.</p>',
'5 Dicas para os Primeiros Passos do Bebê - Desenvolvimento Infantil',
'Descubra como estimular e apoiar seu bebê nos primeiros passos. Dicas práticas para um desenvolvimento saudável e seguro.',
true, '2024-05-15 14:30:00', '2024-05-15 14:30:00'),

-- Post 3: Alimentação Saudável
('blog-3', 'Introdução Alimentar: Guia Completo para Pais', 'blog/introducao-alimentar-guia',
'<h1>Introdução Alimentar: Guia Completo para Pais</h1>
<p>A introdução alimentar é um momento especial na vida do bebê e da família. Saiba como fazer essa transição de forma segura e prazerosa.</p>

<h2>Quando Começar</h2>
<p>A Organização Mundial da Saúde recomenda iniciar a introdução alimentar aos 6 meses, mantendo o aleitamento materno até pelo menos 2 anos.</p>

<h2>Sinais de Prontidão</h2>
<ul>
<li>Bebê consegue sentar com apoio</li>
<li>Mostra interesse pelos alimentos</li>
<li>Consegue pegar objetos e levar à boca</li>
<li>Perdeu o reflexo de protrusão da língua</li>
</ul>

<h2>Primeiros Alimentos</h2>
<p>Comece com:</p>
<ul>
<li>Frutas amassadas (banana, mamão, pera)</li>
<li>Legumes cozidos (batata-doce, cenoura, abóbora)</li>
<li>Verduras refogadas</li>
<li>Cereais sem glúten (arroz, quinoa)</li>
</ul>

<h2>Método BLW (Baby-Led Weaning)</h2>
<p>O bebê explora os alimentos com as próprias mãos, desenvolvendo autonomia e coordenação motora. Sempre supervisionado!</p>

<h2>Alimentos a Evitar no Primeiro Ano</h2>
<ul>
<li>Mel (risco de botulismo)</li>
<li>Açúcar e sal</li>
<li>Leite de vaca integral</li>
<li>Frutos do mar e amendoim (alergênicos)</li>
<li>Alimentos ultraprocessados</li>
</ul>

<h2>Dicas Importantes</h2>
<ul>
<li>Ofereça o mesmo alimento várias vezes</li>
<li>Respeite a saciedade do bebê</li>
<li>Faça das refeições momentos prazerosos</li>
<li>Varie cores, texturas e sabores</li>
</ul>

<h2>Engasgo vs. Reflexo de Gag</h2>
<p>O reflexo de gag é normal e protege contra engasgo. Mantenha-se calma e deixe o bebê processar o alimento naturalmente.</p>',
'Introdução Alimentar: Guia Completo para Pais - Alimentação Infantil',
'Tudo sobre introdução alimentar: quando começar, primeiros alimentos, BLW e dicas importantes para uma alimentação saudável.',
true, '2024-05-10 09:15:00', '2024-05-10 09:15:00'),

-- Post 4: Sono do Bebê
('blog-4', 'Como Estabelecer uma Rotina de Sono para o Bebê', 'blog/rotina-sono-bebe',
'<h1>Como Estabelecer uma Rotina de Sono para o Bebê</h1>
<p>Uma boa rotina de sono é fundamental para o desenvolvimento saudável do bebê e para o bem-estar de toda a família.</p>

<h2>Importância do Sono</h2>
<p>Durante o sono, o bebê:</p>
<ul>
<li>Consolida memórias e aprendizados</li>
<li>Produz hormônios de crescimento</li>
<li>Fortalece o sistema imunológico</li>
<li>Desenvolve o sistema nervoso</li>
</ul>

<h2>Quantidade de Sono por Idade</h2>
<ul>
<li><strong>0-3 meses:</strong> 14-17 horas por dia</li>
<li><strong>4-11 meses:</strong> 12-15 horas por dia</li>
<li><strong>1-2 anos:</strong> 11-14 horas por dia</li>
</ul>

<h2>Criando a Rotina Ideal</h2>
<h3>1. Estabeleça Horários</h3>
<p>Mantenha horários consistentes para dormir e acordar, mesmo nos fins de semana.</p>

<h3>2. Ritual de Sono</h3>
<p>Crie uma sequência relaxante:</p>
<ul>
<li>Banho morno</li>
<li>Massagem suave</li>
<li>Roupinha confortável</li>
<li>História ou canção de ninar</li>
<li>Ambiente escuro e silencioso</li>
</ul>

<h3>3. Ambiente Adequado</h3>
<ul>
<li>Temperatura entre 20-22°C</li>
<li>Quarto escuro ou com luz muito baixa</li>
<li>Ruído branco ou silêncio</li>
<li>Berço seguro e confortável</li>
</ul>

<h2>Sinais de Sono</h2>
<p>Observe quando o bebê:</p>
<ul>
<li>Esfrega os olhos</li>
<li>Boceja</li>
<li>Fica irritado</li>
<li>Perde interesse em brinquedos</li>
</ul>

<h2>Métodos de Treinamento</h2>
<p>Existem várias abordagens. Escolha a que mais se adequa à sua família e seja consistente.</p>

<h2>Dicas Extras</h2>
<ul>
<li>Evite eletrônicos antes de dormir</li>
<li>Mantenha alimentação leve no jantar</li>
<li>Seja paciente - pode levar semanas para estabelecer</li>
<li>Procure ajuda se necessário</li>
</ul>',
'Como Estabelecer uma Rotina de Sono para o Bebê - Guia Completo',
'Aprenda a criar uma rotina de sono eficaz para seu bebê. Dicas práticas para noites tranquilas e desenvolvimento saudável.',
true, '2024-05-05 16:45:00', '2024-05-05 16:45:00');

-- Confirmar inserção
SELECT 'Páginas e posts inseridos com sucesso!' as status; 