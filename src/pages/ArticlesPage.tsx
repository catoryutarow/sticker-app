import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Calendar } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL;

interface Article {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  published_at: string;
}

interface Pagination {
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  const loadArticles = useCallback(async (p: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/articles?page=${p}&limit=12`);
      const data = await res.json();
      setArticles(data.articles);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to load articles:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArticles(page);
  }, [page, loadArticles]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: articles.map((article, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'BlogPosting',
        headline: article.title,
        description: article.description || '',
        url: `https://sirucho.com/articles/${article.slug}`,
        datePublished: article.published_at,
        ...(article.thumbnail && { image: `https://sirucho.com${article.thumbnail}` }),
      },
    })),
  };

  return (
    <>
      <Helmet>
        <title>ブログ | シール帳</title>
        <meta name="description" content="シール帳の公式ブログ。音楽シールの使い方、作曲のコツ、新機能のお知らせなどをお届けします。" />
        <link rel="canonical" href="https://sirucho.com/articles" />
        <meta property="og:title" content="ブログ | シール帳" />
        <meta property="og:description" content="シール帳の公式ブログ。音楽シールの使い方、作曲のコツ、新機能のお知らせなどをお届けします。" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://sirucho.com/articles" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            トップページへ戻る
          </Link>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
            ブログ
          </h1>

          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-600">読み込み中...</span>
              </div>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">記事はまだありません。</p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                  <Link
                    key={article.id}
                    to={`/articles/${article.slug}`}
                    className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden group"
                  >
                    {article.thumbnail ? (
                      <div className="aspect-video bg-gray-100 overflow-hidden">
                        <img
                          src={article.thumbnail}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                        <span className="text-4xl">📝</span>
                      </div>
                    )}
                    <div className="p-4">
                      <h2 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                        {article.title}
                      </h2>
                      {article.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {article.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <time dateTime={article.published_at}>
                          {formatDate(article.published_at)}
                        </time>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* ページネーション */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-10">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={!pagination.hasPrev}
                    className="px-4 py-2 rounded-lg bg-white shadow text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    前のページ
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-600">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!pagination.hasNext}
                    className="px-4 py-2 rounded-lg bg-white shadow text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    次のページ
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
