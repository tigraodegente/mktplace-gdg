export async function GET({ params, url }: { params: { width: string; height: string }; url: URL }) {
	const { width, height } = params;
	const text = url.searchParams.get('text') || 'Image';
	const bg = url.searchParams.get('bg') || 'cccccc';
	const color = url.searchParams.get('color') || '000000';
	
	const svg = `
		<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
			<rect width="100%" height="100%" fill="#${bg}"/>
			<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
				font-family="Arial, sans-serif" font-size="24" fill="#${color}">
				${text}
			</text>
		</svg>
	`;
	
	return new Response(svg, {
		headers: {
			'Content-Type': 'image/svg+xml',
			'Cache-Control': 'public, max-age=31536000'
		}
	});
} 