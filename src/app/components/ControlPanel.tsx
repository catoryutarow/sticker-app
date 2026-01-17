import { Undo2, Redo2, Save, FolderOpen, Trash2 } from 'lucide-react';

interface ControlPanelProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onLoad: () => void;
  onClear: () => void;
}

export function ControlPanel({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onLoad,
  onClear,
}: ControlPanelProps) {
  return (
    <div className="mb-0 lg:mb-6">
      <div className="relative">
        {/* 装飾と背景 */}
        <div 
          className="relative rounded-none lg:rounded-lg shadow-xl overflow-hidden"
          style={{
            background: '#fef3c7',
          }}
        >
          <div 
            className="relative p-3 lg:p-4"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 250, 245, 0.85) 100%)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="flex flex-wrap items-center justify-center gap-2 lg:gap-3">
              {/* 戻る/進む */}
              <div className="flex gap-2">
                <button
                  onClick={onUndo}
                  disabled={!canUndo}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                    canUndo
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md hover:shadow-lg active:scale-95'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  title="元に戻す"
                >
                  <Undo2 className="w-5 h-5" />
                  <span className="hidden sm:inline">戻る</span>
                </button>
                
                <button
                  onClick={onRedo}
                  disabled={!canRedo}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                    canRedo
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md hover:shadow-lg active:scale-95'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  title="やり直す"
                >
                  <Redo2 className="w-5 h-5" />
                  <span className="hidden sm:inline">進む</span>
                </button>
              </div>

              {/* 区切り */}
              <div className="w-px h-8 bg-amber-200"></div>

              {/* 保存/読込 */}
              <div className="flex gap-2">
                <button
                  onClick={onSave}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
                  title="保存"
                >
                  <Save className="w-5 h-5" />
                  <span className="hidden sm:inline">保存</span>
                </button>
                
                <button
                  onClick={onLoad}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
                  title="読込"
                >
                  <FolderOpen className="w-5 h-5" />
                  <span className="hidden sm:inline">読込</span>
                </button>
              </div>

              {/* 区切り */}
              <div className="w-px h-8 bg-amber-200"></div>

              {/* クリア */}
              <button
                onClick={onClear}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
                title="クリア"
              >
                <Trash2 className="w-5 h-5" />
                <span className="hidden sm:inline">クリア</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}