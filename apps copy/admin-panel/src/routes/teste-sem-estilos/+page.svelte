<!-- Página de teste SEM estilos globais -->
<svelte:head>
    <title>Teste SEM Estilos</title>
    <style>
        /* Reset total - sobrescrever TUDO */
        * {
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            font-family: Arial, sans-serif !important;
        }
        
        body {
            background: #ffffff !important;
            color: #000000 !important;
        }
    </style>
</svelte:head>

<!-- Página 100% independente - SEM header nem sidebar da Store -->
<div style="width: 100vw; height: 100vh; background: #ffffff; font-family: Arial, sans-serif; padding: 0; margin: 0; overflow-x: auto;">
    
    <!-- Header BÁSICO - SEM cor turquesa -->
    <div style="background: #e9ecef; padding: 15px 20px; border-bottom: 2px solid #dee2e6; width: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h1 style="margin: 0; color: #495057; font-size: 24px; font-weight: bold;">🛠️ Admin Panel SEM Estilos</h1>
                <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 14px;">Página isolada - ZERO herança da Store</p>
            </div>
            <div style="background: #f8f9fa; padding: 8px 15px; border: 1px solid #dee2e6; border-radius: 4px;">
                <span style="color: #495057; font-weight: bold;">Admin Básico</span>
            </div>
        </div>
    </div>

    <div style="display: flex; width: 100%; min-height: calc(100vh - 80px);">
        
        <!-- Sidebar BÁSICA - SEM estilos da Store -->
        <div style="width: 250px; background: #f8f9fa; border-right: 2px solid #dee2e6; padding: 20px; box-sizing: border-box;">
            <h3 style="margin: 0 0 20px 0; color: #495057; font-size: 18px; font-weight: bold; padding-bottom: 10px; border-bottom: 1px solid #dee2e6;">Menu Básico</h3>
            
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <a href="#" style="display: block; padding: 12px 15px; color: #495057; text-decoration: none; background: #ffffff; border: 1px solid #dee2e6; border-radius: 4px; font-weight: 500;">
                    📊 Dashboard Básico
                </a>
                <a href="#" style="display: block; padding: 12px 15px; color: #495057; text-decoration: none; background: #ffffff; border: 1px solid #dee2e6; border-radius: 4px; font-weight: 500;">
                    📦 Produtos Simples
                </a>
                <a href="#" style="display: block; padding: 12px 15px; color: #495057; text-decoration: none; background: #ffffff; border: 1px solid #dee2e6; border-radius: 4px; font-weight: 500;">
                    🛒 Pedidos Básicos
                </a>
                <a href="#" style="display: block; padding: 12px 15px; color: #495057; text-decoration: none; background: #ffffff; border: 1px solid #dee2e6; border-radius: 4px; font-weight: 500;">
                    👥 Usuários Simples
                </a>
                <a href="#" style="display: block; padding: 12px 15px; color: #495057; text-decoration: none; background: #ffffff; border: 1px solid #dee2e6; border-radius: 4px; font-weight: 500;">
                    📈 Relatórios Básicos
                </a>
                <a href="#" style="display: block; padding: 12px 15px; color: #495057; text-decoration: none; background: #ffffff; border: 1px solid #dee2e6; border-radius: 4px; font-weight: 500;">
                    ⚙️ Configurações Simples
                </a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                <a href="/" style="display: block; padding: 10px 15px; color: #007bff; text-decoration: underline; text-align: center; font-weight: bold; background: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 4px;">
                    ← Voltar para Página COM Estilos
                </a>
            </div>
        </div>

        <!-- Conteúdo principal BÁSICO -->
        <div style="flex: 1; padding: 30px; background: #ffffff; overflow-y: auto;">
            
            <!-- Título da comparação -->
            <div style="text-align: center; padding: 20px; background: #fff3cd; border: 2px solid #ffeaa7; border-radius: 8px; margin-bottom: 30px;">
                <h2 style="margin: 0 0 10px 0; color: #856404; font-size: 22px; font-weight: bold;">🔍 COMPARAÇÃO VISUAL REAL</h2>
                <p style="margin: 0; color: #856404; font-size: 16px;">Esta página usa ZERO estilos da Store - Compare com a página principal!</p>
            </div>
            
            <!-- Cards de status BÁSICOS -->
            <h3 style="margin: 0 0 20px 0; color: #495057; font-size: 20px; font-weight: bold;">Dashboard SEM Identidade Visual da Store</h3>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px;">
                
                <div style="background: #ffffff; border: 2px solid #dee2e6; padding: 25px; border-radius: 6px; text-align: center; box-shadow: none;">
                    <div style="font-size: 36px; margin-bottom: 15px;">👥</div>
                    <h4 style="margin: 0 0 10px 0; color: #6c757d; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Total Usuários</h4>
                    <p style="margin: 0 0 8px 0; color: #495057; font-size: 32px; font-weight: bold;">1,234</p>
                    <small style="color: #6c757d; font-size: 12px;">❌ Sem cor turquesa da Store</small>
                </div>
                
                <div style="background: #ffffff; border: 2px solid #dee2e6; padding: 25px; border-radius: 6px; text-align: center; box-shadow: none;">
                    <div style="font-size: 36px; margin-bottom: 15px;">💰</div>
                    <h4 style="margin: 0 0 10px 0; color: #6c757d; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Receita Total</h4>
                    <p style="margin: 0 0 8px 0; color: #495057; font-size: 32px; font-weight: bold;">R$ 45.678</p>
                    <small style="color: #6c757d; font-size: 12px;">❌ Design genérico Bootstrap</small>
                </div>
                
                <div style="background: #ffffff; border: 2px solid #dee2e6; padding: 25px; border-radius: 6px; text-align: center; box-shadow: none;">
                    <div style="font-size: 36px; margin-bottom: 15px;">📦</div>
                    <h4 style="margin: 0 0 10px 0; color: #6c757d; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Pedidos Hoje</h4>
                    <p style="margin: 0 0 8px 0; color: #495057; font-size: 32px; font-weight: bold;">89</p>
                    <small style="color: #6c757d; font-size: 12px;">❌ Sem ícones SVG profissionais</small>
                </div>
                
            </div>

            <!-- Tabela de comparação detalhada -->
            <div style="background: #ffffff; border: 2px solid #dee2e6; border-radius: 8px; padding: 25px; margin-bottom: 30px; box-shadow: none;">
                <h3 style="margin: 0 0 20px 0; color: #495057; font-size: 20px; font-weight: bold; text-align: center;">📋 Comparação Elemento por Elemento</h3>
                
                <table style="width: 100%; border-collapse: collapse; border: 2px solid #dee2e6;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 15px; border: 1px solid #dee2e6; text-align: left; color: #495057; font-weight: bold;">Elemento</th>
                            <th style="padding: 15px; border: 1px solid #dee2e6; text-align: center; color: #dc3545; font-weight: bold;">❌ Esta Página (SEM Estilos)</th>
                            <th style="padding: 15px; border: 1px solid #dee2e6; text-align: center; color: #28a745; font-weight: bold;">✅ Página Principal (COM Estilos Store)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 15px; border: 1px solid #dee2e6; font-weight: bold; color: #495057;">Header</td>
                            <td style="padding: 15px; border: 1px solid #dee2e6; text-align: center; color: #dc3545; background: #f8d7da;">Cinza Bootstrap (#e9ecef)</td>
                            <td style="padding: 15px; border: 1px solid #dee2e6; text-align: center; color: #28a745; background: #d1edfd;">Turquesa Store (#00BFB3)</td>
                        </tr>
                        <tr style="background: #f8f9fa;">
                            <td style="padding: 15px; border: 1px solid #dee2e6; font-weight: bold; color: #495057;">Sidebar</td>
                            <td style="padding: 15px; border: 1px solid #dee2e6; text-align: center; color: #dc3545; background: #f8d7da;">Básica sem sombras</td>
                            <td style="padding: 15px; border: 1px solid #dee2e6; text-align: center; color: #28a745; background: #d1edfd;">Elegante com sombras</td>
                        </tr>
                        <tr>
                            <td style="padding: 15px; border: 1px solid #dee2e6; font-weight: bold; color: #495057;">Ícones</td>
                            <td style="padding: 15px; border: 1px solid #dee2e6; text-align: center; color: #dc3545; background: #f8d7da;">Emojis simples 📊📦</td>
                            <td style="padding: 15px; border: 1px solid #dee2e6; text-align: center; color: #28a745; background: #d1edfd;">SVGs profissionais</td>
                        </tr>
                        <tr style="background: #f8f9fa;">
                            <td style="padding: 15px; border: 1px solid #dee2e6; font-weight: bold; color: #495057;">Tipografia</td>
                            <td style="padding: 15px; border: 1px solid #dee2e6; text-align: center; color: #dc3545; background: #f8d7da;">Arial padrão</td>
                            <td style="padding: 15px; border: 1px solid #dee2e6; text-align: center; color: #28a745; background: #d1edfd;">Lato (fonte Store)</td>
                        </tr>
                        <tr>
                            <td style="padding: 15px; border: 1px solid #dee2e6; font-weight: bold; color: #495057;">Botões</td>
                            <td style="padding: 15px; border: 1px solid #dee2e6; text-align: center; color: #dc3545; background: #f8d7da;">Bootstrap azul (#007bff)</td>
                            <td style="padding: 15px; border: 1px solid #dee2e6; text-align: center; color: #28a745; background: #d1edfd;">Cyan Store (#00BFB3)</td>
                        </tr>
                        <tr style="background: #f8f9fa;">
                            <td style="padding: 15px; border: 1px solid #dee2e6; font-weight: bold; color: #495057;">Cards</td>
                            <td style="padding: 15px; border: 1px solid #dee2e6; text-align: center; color: #dc3545; background: #f8d7da;">Bordas básicas, sem sombra</td>
                            <td style="padding: 15px; border: 1px solid #dee2e6; text-align: center; color: #28a745; background: #d1edfd;">Bordas arredondadas, sombras elegantes</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Seção de botões de teste -->
            <div style="background: #ffffff; border: 2px solid #dee2e6; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 20px 0; color: #495057; font-size: 18px; font-weight: bold;">🔘 Botões SEM Identidade da Store</h3>
                <div style="margin-bottom: 20px;">
                    <button style="background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; margin: 8px; cursor: pointer; font-weight: 500;">Botão Primário Bootstrap</button>
                    <button style="background: #6c757d; color: white; padding: 12px 24px; border: none; border-radius: 4px; margin: 8px; cursor: pointer; font-weight: 500;">Botão Secundário</button>
                    <button style="background: #28a745; color: white; padding: 12px 24px; border: none; border-radius: 4px; margin: 8px; cursor: pointer; font-weight: 500;">Botão Sucesso</button>
                    <button style="background: #dc3545; color: white; padding: 12px 24px; border: none; border-radius: 4px; margin: 8px; cursor: pointer; font-weight: 500;">Botão Perigo</button>
                </div>
                <p style="margin: 0; color: #6c757d; font-size: 14px; font-style: italic;">🔸 Compare com os botões da página principal que usam a cor turquesa (#00BFB3) da Store</p>
            </div>

            <!-- Call to action final -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 15px 0; font-size: 24px; font-weight: bold;">🎯 TESTE CONCLUÍDO!</h3>
                <p style="margin: 0 0 20px 0; font-size: 16px; opacity: 0.9;">Agora você viu a diferença real entre ter e não ter os estilos centralizados da Store</p>
                <a href="/" style="display: inline-block; background: #ffffff; color: #667eea; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.1);">
                    ← Voltar para Dashboard COM Estilos da Store
                </a>
            </div>

        </div>
    </div>
</div> 