#!/usr/bin/env python3

"""
Script para gerar ícones PWA em PNG
Requer: pip install pillow
"""

import os
from PIL import Image, ImageDraw, ImageFont

# Cores do tema
PRIMARY_COLOR = "#00BFB3"
WHITE = "#FFFFFF"

# Tamanhos dos ícones
ICON_SIZES = [72, 144, 192, 512]

def create_icon(size):
    """Cria um ícone PNG com o tamanho especificado"""
    # Criar imagem com fundo transparente
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Desenhar fundo quadrado com cor primária
    draw.rectangle([0, 0, size, size], fill=PRIMARY_COLOR)
    
    # Desenhar círculo branco no centro
    margin = size // 10
    circle_bbox = [margin, margin, size - margin, size - margin]
    draw.ellipse(circle_bbox, fill=WHITE)
    
    # Adicionar texto "GDG" no centro
    text = "GDG"
    
    # Tentar usar uma fonte do sistema, senão usa fonte padrão
    try:
        font_size = size // 3
        # Tenta algumas fontes comuns
        for font_name in ['Arial', 'Helvetica', 'DejaVuSans']:
            try:
                font = ImageFont.truetype(font_name, font_size)
                break
            except:
                continue
        else:
            # Se não encontrar nenhuma, usa a fonte padrão
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()
    
    # Calcular posição do texto
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - size // 20  # Ajuste fino vertical
    
    # Desenhar texto
    draw.text((x, y), text, fill=PRIMARY_COLOR, font=font)
    
    return img

def main():
    """Função principal"""
    print("🎨 Gerando ícones PWA em Python...")
    
    # Diretório de saída
    output_dir = "apps/store/static/icons"
    os.makedirs(output_dir, exist_ok=True)
    
    # Gerar cada tamanho
    for size in ICON_SIZES:
        filename = f"icon-{size}x{size}.png"
        filepath = os.path.join(output_dir, filename)
        
        print(f"📝 Gerando {filename}...")
        
        try:
            img = create_icon(size)
            img.save(filepath, 'PNG')
            print(f"✅ {filename} criado com sucesso!")
        except Exception as e:
            print(f"❌ Erro ao criar {filename}: {e}")
    
    # Gerar ícone badge 72x72
    print("📝 Gerando badge-72x72.png...")
    try:
        img = create_icon(72)
        img.save(os.path.join(output_dir, "badge-72x72.png"), 'PNG')
        print("✅ badge-72x72.png criado com sucesso!")
    except Exception as e:
        print(f"❌ Erro ao criar badge: {e}")
    
    print("\n✨ Concluído!")
    
    # Verificar se os arquivos foram criados
    print("\n📊 Arquivos criados:")
    for size in ICON_SIZES:
        filepath = os.path.join(output_dir, f"icon-{size}x{size}.png")
        if os.path.exists(filepath):
            file_size = os.path.getsize(filepath) / 1024  # KB
            print(f"  ✓ icon-{size}x{size}.png ({file_size:.1f} KB)")

if __name__ == "__main__":
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        print("❌ Pillow não está instalado!")
        print("   Execute: pip install pillow")
        exit(1)
    
    main() 