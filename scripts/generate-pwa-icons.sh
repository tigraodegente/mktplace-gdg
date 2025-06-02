#!/bin/bash

# =====================================================
# Script para gerar ícones PWA nas dimensões corretas
# =====================================================

echo "🎨 Gerando ícones PWA..."

cd apps/store/static/icons

# Criar SVG base se não existir
if [ ! -f "icon-base.svg" ]; then
    echo "📝 Criando SVG base..."
    cat > icon-base.svg << 'EOF'
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#00BFB3"/>
  <circle cx="256" cy="256" r="200" fill="#ffffff" opacity="0.95"/>
  <text x="256" y="320" font-family="Arial, sans-serif" font-size="140" font-weight="bold" fill="#00BFB3" text-anchor="middle">GDG</text>
</svg>
EOF
fi

# Função para criar PNG a partir de SVG
create_png_from_svg() {
    local size=$1
    local input="icon-base.svg"
    local output="icon-${size}x${size}.png"
    
    echo "🔧 Gerando ${output}..."
    
    # Se tiver ImageMagick instalado
    if command -v convert &> /dev/null; then
        convert -background none -resize ${size}x${size} "$input" "$output"
        echo "✅ ${output} criado com ImageMagick"
    # Se tiver rsvg-convert instalado
    elif command -v rsvg-convert &> /dev/null; then
        rsvg-convert -w $size -h $size "$input" -o "$output"
        echo "✅ ${output} criado com rsvg-convert"
    else
        # Criar PNG placeholder simples usando SVG
        cat > "icon-${size}x${size}.svg" << EOF
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#00BFB3"/>
  <circle cx="$(($size/2))" cy="$(($size/2))" r="$(($size*2/5))" fill="#ffffff" opacity="0.95"/>
  <text x="$(($size/2))" y="$((($size/2)+($size/8)))" font-family="Arial, sans-serif" font-size="$(($size/3))" font-weight="bold" fill="#00BFB3" text-anchor="middle">GDG</text>
</svg>
EOF
        echo "⚠️  Nenhum conversor encontrado. Criado ${output}.svg como alternativa"
        echo "   Instale ImageMagick: brew install imagemagick"
        echo "   Ou librsvg: brew install librsvg"
    fi
}

# Criar ícones em diferentes tamanhos
create_png_from_svg 72
create_png_from_svg 144
create_png_from_svg 192
create_png_from_svg 512

# Criar ícone maskable (com padding extra)
echo "🎭 Criando ícone maskable..."
cat > icon-maskable.svg << 'EOF'
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#00BFB3"/>
  <circle cx="256" cy="256" r="160" fill="#ffffff" opacity="0.95"/>
  <text x="256" y="300" font-family="Arial, sans-serif" font-size="100" font-weight="bold" fill="#00BFB3" text-anchor="middle">GDG</text>
</svg>
EOF

echo ""
echo "📊 Status dos ícones:"
ls -lh *.png *.svg 2>/dev/null | grep -E "(icon-|badge-)"

echo ""
echo "✨ Concluído!" 