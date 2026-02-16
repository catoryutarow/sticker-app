import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL;

interface Article {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  published_at: string;
}

export function LatestArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/articles?limit=3`);
        const data = await res.json();
        setArticles(data.articles || []);
      } catch {
        // 記事取得に失敗してもアプリの動作には影響しない
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading || articles.length === 0) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <section className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">
          ブログ
        </h2>
        <Link
          to="/articles"
          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          すべての記事
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {articles.map((article) => (
          <Link
            key={article.id}
            to={`/articles/${article.slug}`}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 overflow-hidden group"
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
                <span className="text-3xl">📝</span>
              </div>
            )}
            <div className="p-4">
              <h3 className="font-bold text-gray-900 mb-1.5 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                {article.title}
              </h3>
              {article.description && (
                <p className="text-sm text-gray-500 mb-2 line-clamp-2">
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
    </section>
  );
}
