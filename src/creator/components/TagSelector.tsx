import { useState, useEffect, useRef } from 'react';
import { fetchTags, type Tag } from '@/api/tagsApi';

interface TagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  disabled?: boolean;
}

export const TagSelector = ({
  selectedTags,
  onChange,
  maxTags = 5,
  disabled = false,
}: TagSelectorProps) => {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadTags = async () => {
      try {
        const data = await fetchTags();
        setAllTags(data.tags);
      } catch (error) {
        console.error('Failed to load tags:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadTags();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const canAddMore = selectedTags.length < maxTags;

  const handleToggleFixedTag = (tagName: string) => {
    if (disabled) return;
    if (selectedTags.includes(tagName)) {
      onChange(selectedTags.filter(t => t !== tagName));
    } else if (canAddMore) {
      onChange([...selectedTags, tagName]);
    }
  };

  const handleAddCustomTag = (tagName: string) => {
    if (disabled || !canAddMore) return;
    const normalized = tagName.trim().toLowerCase();
    if (!normalized || selectedTags.includes(normalized)) return;
    if (normalized.length > 30) return;
    onChange([...selectedTags, normalized]);
    setCustomInput('');
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tagName: string) => {
    if (disabled) return;
    onChange(selectedTags.filter(t => t !== tagName));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (customInput.trim()) {
        handleAddCustomTag(customInput);
      }
    }
    if (e.key === 'Backspace' && !customInput && selectedTags.length > 0) {
      handleRemoveTag(selectedTags[selectedTags.length - 1]);
    }
  };

  // フィルタされたサジェスト
  const suggestions = allTags
    .filter(t => !selectedTags.includes(t.name))
    .filter(t => !customInput || t.name.includes(customInput.toLowerCase()))
    .map(t => ({ name: t.name, usageCount: t.usage_count }));

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        タグ（最大{maxTags}個）
      </label>

      {/* 選択済みタグ + 入力フィールド */}
      <div
        className={`flex flex-wrap items-center gap-2 p-2 border rounded-lg min-h-[42px] ${
          disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white cursor-text'
        } ${showSuggestions ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300'}`}
        onClick={() => {
          if (!disabled && inputRef.current) {
            inputRef.current.focus();
          }
        }}
      >
        {selectedTags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
          >
            #{tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveTag(tag);
                }}
                className="w-4 h-4 flex items-center justify-center text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-200"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </span>
        ))}

        {canAddMore && !disabled && (
          <input
            ref={inputRef}
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleInputKeyDown}
            placeholder={selectedTags.length === 0 ? 'タグを追加...' : ''}
            className="flex-1 min-w-[100px] px-1 py-0.5 text-sm outline-none bg-transparent"
          />
        )}

        {!canAddMore && (
          <span className="text-xs text-gray-400 px-1">最大数に達しました</span>
        )}
      </div>

      {/* サジェストドロップダウン */}
      {showSuggestions && canAddMore && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.slice(0, 10).map(suggestion => (
            <button
              key={suggestion.name}
              type="button"
              onClick={() => handleAddCustomTag(suggestion.name)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
            >
              <span>#{suggestion.name}</span>
              {suggestion.usageCount > 0 && (
                <span className="text-xs text-gray-400">{suggestion.usageCount}件</span>
              )}
            </button>
          ))}

          {customInput.trim() && !suggestions.some(s => s.name === customInput.toLowerCase()) && (
            <button
              type="button"
              onClick={() => handleAddCustomTag(customInput)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between border-t"
            >
              <span>
                「{customInput.trim()}」を新しいタグとして追加
              </span>
              <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">新規</span>
            </button>
          )}
        </div>
      )}

      {/* タグ一覧 */}
      {allTags.length > 0 && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-1.5">
            {allTags.map(tag => {
              const isSelected = selectedTags.includes(tag.name);
              return (
                <button
                  key={tag.id || tag.name}
                  type="button"
                  onClick={() => handleToggleFixedTag(tag.name)}
                  disabled={disabled || (!isSelected && !canAddMore)}
                  className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                    isSelected
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  } ${(disabled || (!isSelected && !canAddMore)) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  #{tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-2 text-xs text-gray-500">
        タグを選択または入力
      </p>
    </div>
  );
};
