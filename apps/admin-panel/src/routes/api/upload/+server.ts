import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Lista de tipos MIME permitidos
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp'
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/mov',
  'video/quicktime'
];

// Tamanhos máximos
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop() || 'bin';
  return `${timestamp}_${randomString}.${extension}`;
}

async function uploadToCloudflareR2(file: File, platform: any): Promise<string> {
  try {
    // Para desenvolvimento local, simular upload retornando URL temporária
    if (!platform?.env?.R2_BUCKET) {
      console.warn('R2_BUCKET não configurado, simulando upload para desenvolvimento');
      const fileName = generateFileName(file.name);
      // Usar uma URL simulada que pode ser testada
      return `https://cdn.marketplace-gdg.exemplo.com/uploads/${fileName}`;
    }

    const fileName = generateFileName(file.name);
    const arrayBuffer = await file.arrayBuffer();
    
    // Upload para Cloudflare R2
    await platform.env.R2_BUCKET.put(fileName, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });
    
    // Retornar URL pública (ajustar conforme sua configuração)
    const publicUrl = `${platform.env.R2_PUBLIC_URL || 'https://cdn.marketplace-gdg.com'}/${fileName}`;
    return publicUrl;
    
  } catch (error) {
    console.error('Erro no upload para R2:', error);
    throw new Error('Falha no upload do arquivo');
  }
}

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return json({
        success: false,
        error: 'Content-Type deve ser multipart/form-data'
      }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return json({
        success: false,
        error: 'Nenhum arquivo enviado'
      }, { status: 400 });
    }

    // Validar tipo de arquivo
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
    
    if (!isImage && !isVideo) {
      return json({
        success: false,
        error: `Tipo de arquivo não permitido: ${file.type}. Use JPG, PNG, GIF, WebP para imagens ou MP4, WebM, MOV para vídeos.`
      }, { status: 400 });
    }

    // Validar tamanho
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return json({
        success: false,
        error: `Arquivo muito grande. Máximo ${maxSizeMB}MB para ${isImage ? 'imagens' : 'vídeos'}.`
      }, { status: 400 });
    }

    // Fazer upload
    const url = await uploadToCloudflareR2(file, platform);

    return json({
      success: true,
      url,
      metadata: {
        originalName: file.name,
        type: file.type,
        size: file.size,
        isImage,
        isVideo
      }
    });

  } catch (error) {
    console.error('Erro no upload:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}; 