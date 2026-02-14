import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL;

interface Article {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  thumbnail: string | null;
  published_at: string;
}

interface NavArticle {
  slug: string;
  title: string;
}

export function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [prevArticle, setPrevArticle] = useState<NavArticle | null>(null);
  const [nextArticle, setNextArticle] = useState<NavArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadArticle = async () => {
      if (!slug) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/articles/${slug}`);
        if (!res.ok) {
          setError('記事が見つかりませんでした');
          return;
        }
        const data = await res.json();
        setArticle(data.article);
        setPrevArticle(data.prevArticle);
        setNextArticle(data.nextArticle);
      } catch {
        setError('記事の読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };
    loadArticle();
  }, [slug]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-8 px-4">
        <div className="max-w-3xl mx-auto text-center py-12">
          <p className="text-gray-500 mb-4">{error || '記事が見つかりません'}</p>
          <Link to="/articles" className="text-indigo-600 hover:text-indigo-800">
            ← 記事一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.description || '',
    url: `https://sirucho.com/articles/${article.slug}`,
    datePublished: article.published_at,
    dateModified: article.published_at,
    author: {
      '@type': 'Organization',
      name: 'シール帳',
      url: 'https://sirucho.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'シール帳',
      url: 'https://sirucho.com',
    },
    ...(article.thumbnail && {
      image: `https://sirucho.com${article.thumbnail}`,
    }),
  };

  return (
    <>
      <Helmet>
        <title>{article.title} | シール帳</title>
        <meta name="description" content={article.description || article.title} />
        <link rel="canonical" href={`https://sirucho.com/articles/${article.slug}`} />
        <meta property="og:title" content={`${article.title} | シール帳`} />
        <meta property="og:description" content={article.description || article.title} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://sirucho.com/articles/${article.slug}`} />
        {article.thumbnail && (
          <meta property="og:image" content={`https://sirucho.com${article.thumbnail}`} />
        )}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/articles"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            記事一覧へ戻る
          </Link>

          <article className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {article.thumbnail && (
              <div className="aspect-video bg-gray-100">
                <img
                  src={article.thumbnail}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-6 md:p-10">
              <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-4">
                <Calendar className="w-4 h-4" />
                <time dateTime={article.published_at}>
                  {formatDate(article.published_at)}
                </time>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
                {article.title}
              </h1>

              <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-a:text-indigo-600 prose-img:rounded-xl prose-img:shadow-md">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {article.content}
                </ReactMarkdown>
              </div>
            </div>
          </article>

          {/* 前後記事ナビ */}
          {(prevArticle || nextArticle) && (
            <nav className="grid grid-cols-2 gap-4 mt-8">
              {prevArticle ? (
                <Link
                  to={`/articles/${prevArticle.slug}`}
                  className="bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                    <ChevronLeft className="w-3.5 h-3.5" />
                    前の記事
                  </div>
                  <p className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {prevArticle.title}
                  </p>
                </Link>
              ) : (
                <div />
              )}
              {nextArticle ? (
                <Link
                  to={`/articles/${nextArticle.slug}`}
                  className="bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow group text-right"
                >
                  <div className="flex items-center justify-end gap-1 text-xs text-gray-400 mb-1">
                    次の記事
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {nextArticle.title}
                  </p>
                </Link>
              ) : (
                <div />
              )}
            </nav>
          )}
        </div>
      </div>
    </>
  );
}
