import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { kitsApi, type CreateKitRequest } from '@/api/kitsApi';

const PRESET_COLORS = [
  '#E0E0E0', '#FFB4B4', '#FFD9B4', '#FFFAB4', '#B4FFB4',
  '#B4FFFF', '#B4D9FF', '#D9B4FF', '#FFB4FF', '#8B4513'
];

const MUSICAL_KEYS = [
  { value: 'random', labelKey: 'kitForm.autoRandom' },
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

export const NewKitPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [color, setColor] = useState('#E0E0E0');
  const [musicalKey, setMusicalKey] = useState('random');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError(t('kitForm.nameRequired'));
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const data: CreateKitRequest = {
        name: name.trim(),
        color,
        musicalKey,
      };
      const response = await kitsApi.createKit(data);
      navigate(`/creator/kits/${response.kit.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('kitForm.errorOccurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-12">
      {/* パンくず */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/creator" className="hover:text-gray-700">{t('nav.dashboard')}</Link>
        <span>/</span>
        <span className="text-gray-900">{t('newKit.breadcrumb')}</span>
      </nav>

      {/* かんたん作成への誘導 */}
      <Link
        to="/creator/kits/quick"
        className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3 hover:bg-blue-100 transition-colors group"
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 transition-colors">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-800">{t('quickCreate.dashboardTitle')}</p>
          <p className="text-xs text-blue-600">{t('quickCreate.dashboardDesc')}</p>
        </div>
        <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>

      {/* エラー */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      {/* キット名 */}
      <div className="bg-white shadow rounded-lg p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('kitForm.kitName')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            placeholder="Piano Essentials"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            autoFocus
          />
        </div>

      </div>

      {/* カラー + キー */}
      <div className="bg-white shadow rounded-lg p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('kitForm.color')}</label>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  color === c ? 'border-blue-600 scale-110' : 'border-gray-200 hover:border-gray-400'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-gray-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('kitForm.musicalKey')}</label>
          <select
            value={musicalKey}
            onChange={e => setMusicalKey(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {MUSICAL_KEYS.map(k => (
              <option key={k.value} value={k.value}>
                {k.labelKey ? t(k.labelKey) : k.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-gray-400">
            {musicalKey === 'random' ? t('kitForm.autoDesc') : t('kitForm.selectedKeyDesc')}
          </p>
        </div>
      </div>

      {/* 作成ボタン */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !name.trim()}
        className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium text-base hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {t('kitForm.saving')}
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('kitForm.create')}
          </>
        )}
      </button>
    </div>
  );
};
