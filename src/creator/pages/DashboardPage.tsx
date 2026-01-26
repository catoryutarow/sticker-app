import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth';
import { kitsApi, type Kit } from '@/api/kitsApi';
import { KitCard } from '../components/KitCard';

type SortOption = 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc' | 'popular';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'created_desc', label: '作成日（新しい順）' },
  { value: 'created_asc', label: '作成日（古い順）' },
  { value: 'name_asc', label: '名前（A→Z）' },
  { value: 'name_desc', label: '名前（Z→A）' },
  { value: 'popular', label: '人気順' },
];

export const DashboardPage = () => {
  const { user } = useAuth();
  const [kits, setKits] = useState<Kit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('created_desc');

  useEffect(() => {
    const loadKits = async () => {
      try {
        const response = await kitsApi.getKits();
        setKits(response.kits);
      } catch {
        // エラーは無視してデフォルト値を使用
      } finally {
        setIsLoading(false);
      }
    };
    loadKits();
  }, []);

  const sortedKits = useMemo(() => {
    const sorted = [...kits];
    switch (sortBy) {
      case 'created_desc':
        return sorted.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case 'created_asc':
        return sorted.sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      case 'name_asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
      case 'name_desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name, 'ja'));
      case 'popular':
        // 人気順は将来的にダウンロード数などで実装
        // 現在は公開中を上に、シール数の多い順
        return sorted.sort((a, b) => {
          if (a.status === 'published' && b.status !== 'published') return -1;
          if (a.status !== 'published' && b.status === 'published') return 1;
          return (b.sticker_count || 0) - (a.sticker_count || 0);
        });
      default:
        return sorted;
    }
  }, [kits, sortBy]);

  const handleDelete = async (kit: Kit) => {
    if (!confirm(`「${kit.name}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }
    try {
      await kitsApi.deleteKit(kit.id);
      setKits(prev => prev.filter(k => k.id !== kit.id));
    } catch (error) {
      console.error('Failed to delete kit:', error);
      alert('削除に失敗しました');
    }
  };

  const totalStickers = kits.reduce((sum, kit) => sum + (kit.sticker_count || 0), 0);
  const publishedKits = kits.filter(kit => kit.status === 'published');

  return (
    <div className="space-y-6">
      {/* ウェルカムセクション */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          ようこそ、{user?.displayName || user?.email}さん
        </h1>
        <p className="mt-2 text-gray-600">
          クリエイターダッシュボードへようこそ。ここからシールキットの作成・管理ができます。
        </p>
      </div>

      {/* スタッツカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">作成したキット</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {isLoading ? '-' : kits.length}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {publishedKits.length} 公開中
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">シール数</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {isLoading ? '-' : totalStickers}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            全キット合計
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">総ダウンロード数</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">0</div>
          <div className="mt-1 text-sm text-gray-500">Coming soon</div>
        </div>
      </div>

      {/* キット一覧 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-lg font-medium text-gray-900">キット一覧</h2>
          <div className="flex items-center gap-3">
            {/* ソートセレクト */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {/* 新規作成ボタン */}
            <Link
              to="/creator/kits/new"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新規作成
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600">読み込み中...</span>
            </div>
          </div>
        ) : sortedKits.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-gray-500 mb-4">まだキットがありません</p>
            <Link
              to="/creator/kits/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              最初のキットを作成
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sortedKits.map(kit => (
              <KitCard key={kit.id} kit={kit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* はじめ方ガイド（キットが少ない場合のみ表示） */}
      {kits.length < 3 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-blue-900">シールキットの作り方</h2>
          </div>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">キットを作成</h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  「新規作成」ボタンからキットを作ります。名前と背景色を決めるだけでOK！
                </p>
                <div className="mt-2 p-3 bg-white/60 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-700 flex items-start gap-1.5">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                    </svg>
                    <span>
                      <strong>キー（調）って？</strong>
                      <br />
                      音楽の音の高さの基準です。分からなければ「おまかせ」を選べば自動で決まります。同じキーの音は一緒に鳴らすと心地よく響きます。
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">シールを追加</h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  キット詳細ページで「シールを追加」からシールを作成します。
                </p>
                <div className="mt-2 p-3 bg-white/60 rounded-lg border border-blue-100 space-y-2">
                  <p className="text-xs text-gray-700">
                    <strong>音声タイプを選ぼう：</strong>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                      </svg>
                      メロディ = ピアノ、ギター、歌など
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="3" strokeWidth={2} />
                        <circle cx="12" cy="12" r="7" strokeWidth={2} />
                      </svg>
                      ドラム = 太鼓、手拍子、効果音など
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">画像と音声を設定</h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  シールをタップして展開し、画像（PNG/JPG）と音声を設定します。
                </p>
                <div className="mt-2 p-3 bg-white/60 rounded-lg border border-blue-100">
                  <p className="text-xs text-gray-700">
                    <strong>音声の設定方法：</strong>
                  </p>
                  <ul className="mt-1 text-xs text-gray-600 space-y-0.5">
                    <li className="flex items-center gap-1">
                      <span className="text-green-500">✓</span>
                      <strong>ライブラリから選ぶ</strong>（おすすめ！キーに合った音が揃っています）
                    </li>
                    <li className="flex items-center gap-1">
                      <span className="text-green-500">✓</span>
                      自分の音声ファイルをアップロード（MP3/WAV）
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">公開する</h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  すべてのシールに画像と音声を設定したら、「公開」ボタンでみんなに公開できます！
                </p>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="mt-5 pt-4 border-t border-blue-200">
            <p className="text-xs text-blue-700 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>
                <strong>ヒント：</strong>
                まずは3〜4枚のシールで小さなキットを作ってみましょう。慣れてきたら増やしていけばOK！
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
