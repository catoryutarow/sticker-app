interface StickerShapeProps {
  type: string;
  size: number;
}

const stickerConfig: Record<string, { color: string; gradient: string }> = {
  star: { 
    color: '#FFD700', 
    gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' 
  },
  heart: { 
    color: '#FF69B4', 
    gradient: 'linear-gradient(135deg, #FF69B4 0%, #FF1493 100%)' 
  },
  circle: { 
    color: '#87CEEB', 
    gradient: 'linear-gradient(135deg, #87CEEB 0%, #4682B4 100%)' 
  },
  square: { 
    color: '#90EE90', 
    gradient: 'linear-gradient(135deg, #90EE90 0%, #32CD32 100%)' 
  },
  triangle: { 
    color: '#DDA0DD', 
    gradient: 'linear-gradient(135deg, #DDA0DD 0%, #BA55D3 100%)' 
  },
  flower: { 
    color: '#FFB6C1', 
    gradient: 'linear-gradient(135deg, #FFB6C1 0%, #FF69B4 100%)' 
  },
};

export function StickerShape({ type, size }: StickerShapeProps) {
  const config = stickerConfig[type] || stickerConfig.circle;
  
  return (
    <div style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <defs>
          <linearGradient id={`gradient-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={config.color} stopOpacity="1" />
            <stop offset="100%" stopColor={config.color} stopOpacity="0.7" />
          </linearGradient>
          <filter id={`shadow-${type}`}>
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.3" />
          </filter>
        </defs>

        {type === 'star' && (
          <path
            d="M50 10 L61 39 L92 39 L67 58 L78 87 L50 68 L22 87 L33 58 L8 39 L39 39 Z"
            fill={`url(#gradient-${type})`}
            stroke="#FFA500"
            strokeWidth="2"
            filter={`url(#shadow-${type})`}
          />
        )}

        {type === 'heart' && (
          <path
            d="M50 85 C50 85, 20 60, 20 40 C20 25, 30 15, 40 15 C45 15, 50 20, 50 20 C50 20, 55 15, 60 15 C70 15, 80 25, 80 40 C80 60, 50 85, 50 85 Z"
            fill={`url(#gradient-${type})`}
            stroke="#FF1493"
            strokeWidth="2"
            filter={`url(#shadow-${type})`}
          />
        )}

        {type === 'circle' && (
          <circle
            cx="50"
            cy="50"
            r="40"
            fill={`url(#gradient-${type})`}
            stroke="#4682B4"
            strokeWidth="2"
            filter={`url(#shadow-${type})`}
          />
        )}

        {type === 'square' && (
          <rect
            x="15"
            y="15"
            width="70"
            height="70"
            rx="8"
            fill={`url(#gradient-${type})`}
            stroke="#32CD32"
            strokeWidth="2"
            filter={`url(#shadow-${type})`}
          />
        )}

        {type === 'triangle' && (
          <path
            d="M50 15 L85 85 L15 85 Z"
            fill={`url(#gradient-${type})`}
            stroke="#BA55D3"
            strokeWidth="2"
            filter={`url(#shadow-${type})`}
          />
        )}

        {type === 'flower' && (
          <g>
            {/* 花びら */}
            {[0, 72, 144, 216, 288].map((angle, i) => (
              <ellipse
                key={i}
                cx="50"
                cy="50"
                rx="15"
                ry="25"
                fill={`url(#gradient-${type})`}
                stroke="#FF69B4"
                strokeWidth="1.5"
                transform={`rotate(${angle} 50 50) translate(0 -15)`}
              />
            ))}
            {/* 中心 */}
            <circle
              cx="50"
              cy="50"
              r="12"
              fill="#FFD700"
              stroke="#FFA500"
              strokeWidth="2"
            />
            <g filter={`url(#shadow-${type})`}>
              <circle cx="50" cy="50" r="12" fill="transparent" />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
