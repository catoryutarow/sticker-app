import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { StickerAlbum } from '@/app/components/StickerAlbum';

const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

export default function App() {
  return (
    <DndProvider
      backend={isTouchDevice ? TouchBackend : HTML5Backend}
      options={isTouchDevice ? { delayTouchStart: 80 } : undefined}
    >
      <div
        className="min-h-screen p-4 lg:p-8 pb-32 lg:pb-8"
        style={{
          backgroundImage: 'url(/page-backgrounds/background.png), linear-gradient(to bottom right, #fffbeb, #fff7ed, #fff1f2)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <StickerAlbum />
      </div>
    </DndProvider>
  );
}