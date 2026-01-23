import { useState } from 'react';
import { getStickerImagePath } from '../../config/stickerConfig';

interface StickerShapeProps {
  type: string;
  size: number;
}

/**
 * SVGフォールバック用の設定
 * PNG画像が存在しない場合に表示
 * IDは {パッケージID}-{シールID} 形式
 */
const svgFallbackConfig: Record<string, { color: string; strokeColor: string }> = {
  '001-001': { color: '#FFD700', strokeColor: '#FFA500' },  // Star
  '001-002': { color: '#FF69B4', strokeColor: '#FF1493' },  // Heart
  '001-003': { color: '#87CEEB', strokeColor: '#4682B4' },  // Circle
  '001-004': { color: '#90EE90', strokeColor: '#32CD32' },  // Square
  '001-005': { color: '#DDA0DD', strokeColor: '#BA55D3' },  // Triangle
  '001-006': { color: '#FFB6C1', strokeColor: '#FF69B4' },  // Flower
};

function SvgFallback({ type, size }: { type: string; size: number }) {
  const config = svgFallbackConfig[type] || { color: '#CCCCCC', strokeColor: '#999999' };

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        {/* メインのグラデーション - より立体的に */}
        <linearGradient id={`gradient-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={config.color} stopOpacity="1" />
          <stop offset="50%" stopColor={config.color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={config.strokeColor} stopOpacity="0.9" />
        </linearGradient>
        {/* 光沢感を出すハイライト */}
        <linearGradient id={`highlight-${type}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.6" />
          <stop offset="30%" stopColor="white" stopOpacity="0.2" />
          <stop offset="50%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        {/* シールの光沢マスク */}
        <radialGradient id={`gloss-${type}`} cx="30%" cy="30%" r="60%">
          <stop offset="0%" stopColor="white" stopOpacity="0.4" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      {type === '001-001' && (
        <g>
          <path
            d="M50 10 L61 39 L92 39 L67 58 L78 87 L50 68 L22 87 L33 58 L8 39 L39 39 Z"
            fill={`url(#gradient-${type})`}
          />
          <path
            d="M50 10 L61 39 L92 39 L67 58 L78 87 L50 68 L22 87 L33 58 L8 39 L39 39 Z"
            fill={`url(#gloss-${type})`}
          />
        </g>
      )}

      {type === '001-002' && (
        <g>
          <path
            d="M50 85 C50 85, 20 60, 20 40 C20 25, 30 15, 40 15 C45 15, 50 20, 50 20 C50 20, 55 15, 60 15 C70 15, 80 25, 80 40 C80 60, 50 85, 50 85 Z"
            fill={`url(#gradient-${type})`}
          />
          <path
            d="M50 85 C50 85, 20 60, 20 40 C20 25, 30 15, 40 15 C45 15, 50 20, 50 20 C50 20, 55 15, 60 15 C70 15, 80 25, 80 40 C80 60, 50 85, 50 85 Z"
            fill={`url(#gloss-${type})`}
          />
        </g>
      )}

      {type === '001-003' && (
        <g>
          <circle cx="50" cy="50" r="40" fill={`url(#gradient-${type})`} />
          <circle cx="50" cy="50" r="40" fill={`url(#gloss-${type})`} />
        </g>
      )}

      {type === '001-004' && (
        <g>
          <rect x="15" y="15" width="70" height="70" rx="8" fill={`url(#gradient-${type})`} />
          <rect x="15" y="15" width="70" height="70" rx="8" fill={`url(#gloss-${type})`} />
        </g>
      )}

      {type === '001-005' && (
        <g>
          <path d="M50 15 L85 85 L15 85 Z" fill={`url(#gradient-${type})`} />
          <path d="M50 15 L85 85 L15 85 Z" fill={`url(#gloss-${type})`} />
        </g>
      )}

      {type === '001-006' && (
        <g>
          {[0, 72, 144, 216, 288].map((angle, i) => (
            <ellipse
              key={i}
              cx="50"
              cy="50"
              rx="15"
              ry="25"
              fill={`url(#gradient-${type})`}
              transform={`rotate(${angle} 50 50) translate(0 -15)`}
            />
          ))}
          <circle cx="50" cy="50" r="12" fill="#FFD700" />
          <circle cx="50" cy="50" r="12" fill={`url(#gloss-${type})`} />
        </g>
      )}

      {/* 未知のタイプの場合のデフォルト */}
      {!['001-001', '001-002', '001-003', '001-004', '001-005', '001-006'].includes(type) && (
        <g>
          <circle cx="50" cy="50" r="40" fill={`url(#gradient-${type})`} />
          <circle cx="50" cy="50" r="40" fill={`url(#gloss-${type})`} />
        </g>
      )}
    </svg>
  );
}

export function StickerShape({ type, size }: StickerShapeProps) {
  const [imageError, setImageError] = useState(false);
  const imagePath = getStickerImagePath(type);

  // 画像読み込みエラー時はSVGフォールバックを表示
  if (imageError) {
    return (
      <div style={{ width: size, height: size }}>
        <SvgFallback type={type} size={size} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src={imagePath}
        alt={type}
        width={size}
        height={size}
        style={{
          objectFit: 'contain',
          maxWidth: '100%',
          maxHeight: '100%',
        }}
        onError={() => setImageError(true)}
      />
    </div>
  );
}
