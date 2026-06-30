import { rewrite } from '@vercel/edge';

export const config = {
  matcher: [
    // 既存: /w/:shareId への OGP rewrite 用
    '/w/:path*',
    // メンテモード用: HTML パス全般。静的アセットと maintenance.html 自身は除外
    '/((?!_next|maintenance\\.html|assets|stickers|backgrounds|audio|sounds|page-backgrounds|.*\\.(?:png|jpg|jpeg|svg|webp|ico|xml|txt|js|css|woff|woff2|mp3|wav|ogg|m4a|mp4)).*)',
  ],
};

const FALLBACK_MAINTENANCE_HTML = `<!doctype html><html lang="ja"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="robots" content="noindex"/><title>メンテナンス中 — シール帳</title></head><body style="font-family:-apple-system,system-ui,sans-serif;padding:40px 24px;text-align:center;color:#1f2937;background:#fdf6ff"><h1 style="font-size:20px;margin:0 0 12px">ただいまメンテナンス中です</h1><p style="color:#4b5563;line-height:1.7">復旧までしばらくお待ちください。</p><p style="margin-top:24px;font-size:12px;color:#9ca3af">— Spollup Inc.</p></body></html>`;

export default async function middleware(request: Request) {
  const url = new URL(request.url);

  if (process.env.MAINTENANCE_MODE === '1') {
    let html = FALLBACK_MAINTENANCE_HTML;
    try {
      const res = await fetch(new URL('/maintenance.html', url.origin));
      if (res.ok) {
        html = await res.text();
      }
    } catch {
      // fetch 失敗時は inline fallback を返す
    }

    return new Response(html, {
      status: 503,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'retry-after': '3600',
        'cache-control': 'no-store',
      },
    });
  }

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
