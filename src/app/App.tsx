import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { StickerAlbum } from '@/app/components/StickerAlbum';

export default function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 lg:p-8 pb-32 lg:pb-8">
        <StickerAlbum />
      </div>
    </DndProvider>
  );
}