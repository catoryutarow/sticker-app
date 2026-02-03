import type { VercelRequest, VercelResponse } from '@vercel/node';

const SITE_URL = 'https://sirucho.com';
const API_URL = 'https://api.sirucho.com';

interface Work {
  id: string;
  shareId: string;
  title: string;
  stickers: { id: string }[];
  thumbnailUrl?: string;
  viewCount: number;
  createdAt: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateOgpHtml(work: Work, shareId: string): string {
  const title = escapeHtml(work.title || 'シールアルバム作品');
  const description = escapeHtml(`${work.stickers.length}個のシールで作られた作品`);
  const url = `${SITE_URL}/w/${shareId}`;
  const image = work.thumbnailUrl || `${SITE_URL}/og-default.png`;
  const absoluteImage = image.startsWith('http') ? image : `${SITE_URL}${image}`;

  // Return minimal HTML with OGP that redirects to the real page
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | シール帳</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${url}">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ja_JP">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="シール帳">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${absoluteImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${absoluteImage}">

  <meta name="robots" content="index, follow">

  <!-- JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "name": "${title}",
    "description": "${description}",
    "url": "${url}",
    "image": "${absoluteImage}",
    "author": {
      "@type": "Organization",
      "name": "シール帳"
    }
  }
  </script>
</head>
<body>
  <p>リダイレクト中...</p>
  <script>window.location.replace("${url}");</script>
  <noscript><meta http-equiv="refresh" content="0;url=${url}"></noscript>
</body>
</html>`;
}

function generate404Html(): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ページが見つかりません | シール帳</title>
  <meta name="robots" content="noindex">
  <style>
    body {
      font-family: system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #fffbeb 0%, #fff7ed 50%, #fff1f2 100%);
    }
    .container { text-align: center; padding: 2rem; }
    h1 { font-size: 4rem; margin: 0; color: #1f2937; }
    p { color: #6b7280; margin: 1rem 0; }
    a {
      display: inline-block;
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(to right, #6366f1, #a855f7);
      color: white;
      text-decoration: none;
      border-radius: 0.75rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>404</h1>
    <p>お探しの作品は見つかりませんでした</p>
    <a href="/">トップページへ</a>
  </div>
</body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send('<html><body>Invalid request</body></html>');
  }

  try {
    // Fetch work data from API
    const apiResponse = await fetch(`${API_URL}/works/${id}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!apiResponse.ok) {
      // Work not found - return 404
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send(generate404Html());
    }

    const work: Work = await apiResponse.json();

    // Return HTML with proper OGP tags
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
    return res.status(200).send(generateOgpHtml(work, id));
  } catch (error) {
    console.error('OGP handler error:', error);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send('<html><body>Internal Server Error</body></html>');
  }
}
