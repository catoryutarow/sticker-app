import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { StickerAlbum } from '@/app/components/StickerAlbum';
import { ThreeBackground } from '@/app/components/ThreeBackground';

const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

export default function App() {
  return (
    <DndProvider
      backend={isTouchDevice ? TouchBackend : HTML5Backend}
      options={isTouchDevice ? { delayTouchStart: 80 } : undefined}
    >
      {/* 背景レイヤー（最背面） */}
      <div
        className="fixed inset-0"
        style={{
          backgroundImage: 'url(/page-backgrounds/background.png), linear-gradient(to bottom right, #fffbeb, #fff7ed, #fff1f2)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0,
        }}
      />

      {/* Three.js アニメーション（背景の上） */}
      <ThreeBackground />

      {/* メインコンテンツ */}
      <div
        className="min-h-screen p-4 lg:p-8 pb-32 lg:pb-8 relative"
        style={{ zIndex: 10 }}
      >
        <StickerAlbum />
      </div>
    </DndProvider>
  );
}