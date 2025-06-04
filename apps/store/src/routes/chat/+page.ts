import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
  // Capturar parâmetros da URL atual
  const category = url.searchParams.get('category');
  
  // Construir URL de redirecionamento
  let redirectUrl = '/atendimento';
  const params = new URLSearchParams();
  
  // Definir tab como chat
  params.append('tab', 'chat');
  
  // Manter categoria se fornecida
  if (category) {
    params.append('category', category);
  }
  
  // Redirecionar para nova central de atendimento
  throw redirect(302, `${redirectUrl}?${params.toString()}`);
}; 