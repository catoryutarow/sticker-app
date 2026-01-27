import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  fetchTags,
  searchKits,
  type Tag,
  type PublicKitWithTags,
} from '@/api/tagsApi';

interface KitFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectKit: (kitNumber: string) => void;
}

export function KitFinderModal({ isOpen, onClose, onSelectKit }: KitFinderModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [kits, setKits] = useState<PublicKitWithTags[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTagsLoading, setIsTagsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // タグを読み込み
  useEffect(() => {
    if (!isOpen) return;

    const loadTags = async () => {
      setIsTagsLoading(true);
      try {
        const data = await fetchTags();
        setAllTags(data.tags);
      } catch (error) {
        console.error('Failed to load tags:', error);
      } finally {
        setIsTagsLoading(false);
      }
    };
    loadTags();
  }, [isOpen]);

  // キットを検索
  const doSearch = useCallback(async (resetPage = true) => {
    setIsLoading(true);
    try {
      const currentPage = resetPage ? 1 : page;
      const result = await searchKits({
        search: searchQuery || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        page: currentPage,
        limit: 12,
      });

      if (resetPage) {
        setKits(result.kits);
        setPage(1);
      } else {
        setKits(prev => [...prev, ...result.kits]);
      }
      setHasMore(result.pagination.hasNext);
      setTotal(result.pagination.total);
    } catch (error) {
      console.error('Failed to search kits:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedTags, page]);

  // 検索条件が変わったら検索
  useEffect(() => {
    if (!isOpen) return;
    doSearch(true);
  }, [isOpen, searchQuery, selectedTags]);

  // モーダルを閉じたらリセット
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedTags([]);
      setKits([]);
      setPage(1);
    }
  }, [isOpen]);

  // ESCキーで閉じる
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleToggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
    doSearch(false);
  };

  const handleSelectKit = (kit: PublicKitWithTags) => {
    onSelectKit(kit.kit_number);
    onClose();
  };

  // Portal でbody直下にレンダリング
  return createPortal(
    <>
      {/* オーバーレイ */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* サイドパネル（右からスライドイン） */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900">キットを探す</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 検索ボックス */}
        <div className="px-4 py-3 border-b">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="キット名やタグで検索..."
              className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
              autoFocus={isOpen}
            />
            <svg
              className="absolute left-3.5 top-3 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 p-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* タグフィルター */}
        {!isTagsLoading && allTags.length > 0 && (
          <div className="px-4 py-3 border-b bg-gray-50/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">タグで絞り込み</p>
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  クリア
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {allTags.map(tag => (
                <button
                  key={tag.id || tag.name}
                  onClick={() => handleToggleTag(tag.name)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-all duration-200 ${
                    selectedTags.includes(tag.name)
                      ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 結果件数 */}
        <div className="px-4 py-2 text-xs text-gray-500 bg-white border-b flex items-center justify-between">
          <span>
            {isLoading && kits.length === 0 ? (
              '検索中...'
            ) : (
              <>{total}件</>
            )}
          </span>
          {selectedTags.length > 0 && (
            <span className="text-blue-600">
              {selectedTags.length}個のタグで絞り込み中
            </span>
          )}
        </div>

        {/* キット一覧 */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && kits.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-3" />
                <p className="text-sm text-gray-500">読み込み中...</p>
              </div>
            </div>
          ) : kits.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center px-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-600 font-medium">キットが見つかりません</p>
                <p className="text-sm text-gray-400 mt-1">検索条件を変更してください</p>
              </div>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {kits.map(kit => (
                <button
                  key={kit.id}
                  onClick={() => handleSelectKit(kit)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all duration-200 text-left group"
                >
                  {/* サムネイル */}
                  <div
                    className="w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden shadow-sm"
                    style={{ backgroundColor: kit.color }}
                  >
                    <img
                      src={`/assets/thumbnails/kit-${kit.kit_number}.png`}
                      alt={kit.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>

                  {/* 情報 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {kit.name}
                    </h3>

                    {/* タグ */}
                    {kit.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {kit.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag.name}
                            className={`px-1.5 py-0.5 text-[10px] rounded-md ${
                              tag.isCustom
                                ? 'bg-gray-100 text-gray-500'
                                : 'bg-blue-100 text-blue-600'
                            }`}
                          >
                            {tag.name}
                          </span>
                        ))}
                        {kit.tags.length > 3 && (
                          <span className="text-[10px] text-gray-400">
                            +{kit.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 矢印 */}
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}

              {/* もっと読み込むボタン */}
              {hasMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="w-full py-3 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isLoading ? '読み込み中...' : 'もっと見る'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* フッター（ヒント） */}
        <div className="px-4 py-3 border-t bg-gray-50 text-center">
          <p className="text-xs text-gray-400">
            キットをタップして選択
          </p>
        </div>
      </div>
    </>,
    document.body
  );
}
