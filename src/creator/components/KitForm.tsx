import { useState } from 'react';
import type { Kit, CreateKitRequest, UpdateKitRequest } from '@/api/kitsApi';

interface KitFormProps {
  kit?: Kit;
  onSubmit: (data: CreateKitRequest | UpdateKitRequest) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

// 平行調をまとめたキー選択肢（メジャー/マイナー）
const MUSICAL_KEYS = [
  { value: 'random', label: 'おまかせ（ランダム）' },
  { value: 'C/Am', label: 'C / Am' },
  { value: 'G/Em', label: 'G / Em' },
  { value: 'D/Bm', label: 'D / Bm' },
  { value: 'A/F#m', label: 'A / F#m' },
  { value: 'E/C#m', label: 'E / C#m' },
  { value: 'B/G#m', label: 'B / G#m' },
  { value: 'F#/D#m', label: 'F# / D#m' },
  { value: 'F/Dm', label: 'F / Dm' },
  { value: 'Bb/Gm', label: 'B♭ / Gm' },
  { value: 'Eb/Cm', label: 'E♭ / Cm' },
  { value: 'Ab/Fm', label: 'A♭ / Fm' },
  { value: 'Db/Bbm', label: 'D♭ / B♭m' },
];

const PRESET_COLORS = [
  '#E0E0E0', '#FFB4B4', '#FFD9B4', '#FFFAB4', '#B4FFB4',
  '#B4FFFF', '#B4D9FF', '#D9B4FF', '#FFB4FF', '#8B4513'
];

export const KitForm = ({ kit, onSubmit, onCancel, isSubmitting }: KitFormProps) => {
  const [name, setName] = useState(kit?.name || '');
  const [nameJa, setNameJa] = useState(kit?.name_ja || '');
  const [description, setDescription] = useState(kit?.description || '');
  const [color, setColor] = useState(kit?.color || '#E0E0E0');
  const [musicalKey, setMusicalKey] = useState(kit?.musical_key || 'random');
  const [status, setStatus] = useState<'draft' | 'published'>(kit?.status || 'draft');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('キット名は必須です');
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        nameJa: nameJa.trim() || undefined,
        description: description.trim() || undefined,
        color,
        musicalKey,
        ...(kit && { status }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          キット名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Piano Essentials"
        />
      </div>

      <div>
        <label htmlFor="nameJa" className="block text-sm font-medium text-gray-700">
          キット名（日本語）
        </label>
        <input
          type="text"
          id="nameJa"
          value={nameJa}
          onChange={(e) => setNameJa(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="ピアノ・エッセンシャルズ"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          説明
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="このキットの説明..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          カラー
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_COLORS.map((presetColor) => (
            <button
              key={presetColor}
              type="button"
              onClick={() => setColor(presetColor)}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${
                color === presetColor ? 'border-blue-500 scale-110' : 'border-gray-200'
              }`}
              style={{ backgroundColor: presetColor }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer"
          />
        </div>
      </div>

      <div>
        <label htmlFor="musicalKey" className="block text-sm font-medium text-gray-700">
          キー（調）
        </label>
        <select
          id="musicalKey"
          value={musicalKey}
          onChange={(e) => setMusicalKey(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          {MUSICAL_KEYS.map((key) => (
            <option key={key.value} value={key.value}>
              {key.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-gray-500 leading-relaxed">
          {kit ? (
            // 編集時：確定済みのキーを表示
            <>
              このキットのキーは <strong className="text-gray-700">{kit.musical_key}</strong> です。<br />
              音声ライブラリからは、このキーに合った音源のみ選択できます。
            </>
          ) : (
            // 新規作成時
            <>
              {musicalKey === 'random' ? (
                <>
                  <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    おまかせ
                  </span>
                  を選ぶと、キット作成時にランダムなキーが自動で決定されます。<br />
                  決定後は、そのキーに合った音源のみがライブラリに表示されます。
                </>
              ) : (
                <>
                  選択したキーに合った音源がライブラリに表示されます。<br />
                  自分で音源をアップロードする場合は、このキーに合った音源をご用意ください。
                </>
              )}
            </>
          )}
        </p>
      </div>

      {kit && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ステータス
          </label>
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="status"
                value="draft"
                checked={status === 'draft'}
                onChange={() => setStatus('draft')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">下書き</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="status"
                value="published"
                checked={status === 'published'}
                onChange={() => setStatus('published')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">公開</span>
            </label>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            キャンセル
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '保存中...' : kit ? '更新する' : '作成する'}
        </button>
      </div>
    </form>
  );
};
