import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { adminApi } from '../api/adminApi';

const toSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

export const ArticleEditPage = () => {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const isNew = !articleId;
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!articleId) return;

    const loadArticle = async () => {
      try {
        const { article } = await adminApi.getArticle(articleId);
        setTitle(article.title);
        setSlug(article.slug);
        setSlugManuallyEdited(true);
        setDescription(article.description || '');
        setContent(article.content);
        setThumbnail(article.thumbnail || '');
        setStatus(article.status);
      } catch {
        setError('記事が見つかりませんでした');
      } finally {
        setIsLoading(false);
      }
    };
    loadArticle();
  }, [articleId]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugManuallyEdited) {
      setSlug(toSlug(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setSlug(value.replace(/[^a-z0-9-]/g, ''));
  };

  const handleSave = async (saveStatus?: 'draft' | 'published') => {
    const finalStatus = saveStatus || status;
    setIsSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const data = {
        slug,
        title,
        description: description || undefined,
        content,
        thumbnail: thumbnail || undefined,
        status: finalStatus,
      };

      if (isNew) {
        const { article } = await adminApi.createArticle(data);
        setSaveMessage('記事を作成しました');
        navigate(`/admin/articles/${article.id}`, { replace: true });
      } else {
        await adminApi.updateArticle(articleId!, data);
        setStatus(finalStatus);
        setSaveMessage('保存しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { imagePath } = await adminApi.uploadArticleImage(file);
      setThumbnail(imagePath);
    } catch {
      setError('サムネイルのアップロードに失敗しました');
    }
  };

  const handleContentImageUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const { imagePath } = await adminApi.uploadArticleImage(file);
        const textarea = contentRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const markdown = `![${file.name}](${imagePath})`;
          const newContent = content.slice(0, start) + markdown + content.slice(end);
          setContent(newContent);
          // カーソルを挿入テキストの後ろに
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + markdown.length;
            textarea.focus();
          }, 0);
        }
      } catch {
        setError('画像のアップロードに失敗しました');
      }
    };
    input.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error && !title) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <Link to="/admin/articles" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
          ← 記事一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/articles" className="text-gray-500 hover:text-gray-700">
            ← 記事一覧
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? '新規記事作成' : '記事編集'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
            status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
          }`}>
            {status === 'published' ? '公開中' : '下書き'}
          </span>
        </div>
      </div>

      {/* メッセージ */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {saveMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {saveMessage}
        </div>
      )}

      {/* メタ情報 */}
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="記事タイトル"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">スラッグ (URL)</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">/articles/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="url-slug"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">メタディスクリプション</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="SEO用の記事概要（160文字程度推奨）"
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">{description.length} 文字</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">サムネイル画像</label>
          <div className="flex items-center gap-4">
            {thumbnail && (
              <img src={thumbnail} alt="サムネイル" className="w-32 h-20 object-cover rounded-lg" />
            )}
            <label className="cursor-pointer px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors">
              {thumbnail ? '変更' : 'アップロード'}
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailUpload}
                className="hidden"
              />
            </label>
            {thumbnail && (
              <button
                onClick={() => setThumbnail('')}
                className="text-sm text-red-500 hover:text-red-700"
              >
                削除
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Markdownエディタ */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
          <span className="text-sm font-medium text-gray-700">本文 (Markdown)</span>
          <button
            onClick={handleContentImageUpload}
            className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors"
          >
            画像を挿入
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
          {/* エディタ */}
          <div>
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Markdownで記事を書いてください..."
              className="w-full h-[500px] px-4 py-3 font-mono text-sm resize-none focus:outline-none"
            />
          </div>

          {/* プレビュー */}
          <div className="p-4 h-[500px] overflow-y-auto bg-gray-50">
            <div className="prose prose-sm prose-gray max-w-none prose-headings:text-gray-900 prose-a:text-indigo-600 prose-img:rounded-xl">
              {content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              ) : (
                <p className="text-gray-400 italic">プレビューがここに表示されます...</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => handleSave('draft')}
          disabled={isSaving || !title || !content || !slug}
          className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          下書き保存
        </button>
        <button
          onClick={() => handleSave('published')}
          disabled={isSaving || !title || !content || !slug}
          className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {status === 'published' ? '更新して公開' : '公開する'}
        </button>
      </div>
    </div>
  );
};
