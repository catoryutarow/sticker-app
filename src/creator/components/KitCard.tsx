import { Link } from 'react-router-dom';
import type { Kit } from '@/api/kitsApi';

interface KitCardProps {
  kit: Kit;
  onDelete?: (kit: Kit) => void;
}

export const KitCard = ({ kit, onDelete }: KitCardProps) => {
  return (
    <div
      className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow"
      style={{ borderTop: `4px solid ${kit.color}` }}
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {kit.name}
            </h3>
            {kit.name_ja && (
              <p className="text-sm text-gray-500 mt-1">{kit.name_ja}</p>
            )}
          </div>
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
              kit.status === 'published'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {kit.status === 'published' ? '公開中' : '下書き'}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
            {kit.sticker_count ?? 0} シール
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            {kit.musical_key}
          </span>
          <span className="text-gray-400">#{kit.kit_number}</span>
        </div>

        {kit.description && (
          <p className="mt-3 text-sm text-gray-600 line-clamp-2">{kit.description}</p>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <Link
            to={`/creator/kits/${kit.id}`}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            編集する
          </Link>
          {onDelete && (
            <button
              onClick={() => onDelete(kit)}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              削除
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
