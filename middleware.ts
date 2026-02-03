import { rewrite } from '@vercel/edge';

export const config = {
  matcher: '/w/:path*',
};

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const pathMatch = url.pathname.match(/^\/w\/([^/]+)$/);

  if (!pathMatch) {
    return;
  }

  const shareId = pathMatch[1];

  // Check if request is from a crawler/bot
  const userAgent = request.headers.get('user-agent') || '';
  const isCrawler = /bot|crawl|spider|slurp|facebookexternalhit|twitterbot|linkedinbot|pinterest|telegrambot|whatsapp|discordbot|slackbot|applebot|bingbot|googlebot|yandex|baidu|duckduck|semrush|ahref|preview/i.test(userAgent);

  // For crawlers, rewrite to the OGP API endpoint (internal rewrite, not redirect)
  if (isCrawler) {
    return rewrite(new URL(`/api/ogp?id=${shareId}`, url.origin));
  }

  // For regular browsers, let the SPA handle it
  return;
}
