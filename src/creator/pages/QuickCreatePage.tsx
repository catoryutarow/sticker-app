import { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { kitsApi, type Sticker } from '@/api/kitsApi';
import { audioLibraryApi, type LibrarySound } from '@/api/audioLibraryApi';
import { ImageCropper } from '../components/ImageCropper';
import { TagSelector } from '../components/TagSelector';
import { getStickerImageUrl, getAssetBaseUrl } from '@/config/assetUrl';

// ステッカー数ごとの自動レイアウトプリセット
const LAYOUT_PRESETS: Record<number, Array<{ x: number; y: number; size: number; rotation: number }>> = {
  2: [
    { x: 25, y: 25, size: 90, rotation: -5 },
    { x: 60, y: 55, size: 85, rotation: 8 },
  ],
  3: [
    { x: 20, y: 18, size: 80, rotation: -5 },
    { x: 60, y: 12, size: 75, rotation: 8 },
    { x: 35, y: 58, size: 85, rotation: -3 },
  ],
  4: [
    { x: 22, y: 15, size: 75, rotation: -5 },
    { x: 65, y: 12, size: 70, rotation: 8 },
    { x: 18, y: 55, size: 80, rotation: 3 },
    { x: 62, y: 52, size: 75, rotation: -8 },
  ],
  5: [
    { x: 20, y: 12, size: 70, rotation: -5 },
    { x: 60, y: 10, size: 65, rotation: 8 },
    { x: 15, y: 45, size: 75, rotation: 3 },
    { x: 55, y: 42, size: 70, rotation: -8 },
    { x: 35, y: 72, size: 72, rotation: 5 },
  ],
};

const PRESET_COLORS = [
  '#FFB4B4', '#FFD9B4', '#FFFAB4', '#B4FFB4', '#B4FFFF',
  '#B4D9FF', '#D9B4FF', '#FFB4FF',
];

function addJitter(preset: Array<{ x: number; y: number; size: number; rotation: number }>) {
  return preset.map(p => ({
    x: Math.max(5, Math.min(85, p.x + (Math.random() - 0.5) * 10)),
    y: Math.max(5, Math.min(85, p.y + (Math.random() - 0.5) * 10)),
    size: Math.max(50, Math.min(120, Math.round(p.size + (Math.random() - 0.5) * 10))),
    rotation: Math.max(-30, Math.min(30, Math.round(p.rotation + (Math.random() - 0.5) * 6))),
  }));
}

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

interface SelectedImage {
  id: string;
  file: File;
  previewUrl: string;
  croppedBlob?: Blob;
}

interface LayoutInstance {
  uid: string;
  stickerId: string;
  x: number; y: number; size: number; rotation: number;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS = ['quickCreate.step1Title', 'quickCreate.step2Title', 'quickCreate.step3Title', 'quickCreate.step4Title', 'quickCreate.step5Title'];

const MUSICAL_KEYS = [
  { value: 'random', labelKey: 'quickCreate.musicalKeyAuto' },
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

export const QuickCreatePage = () => {
  const { t } = useTranslation();
  const { kitId: editKitId } = useParams<{ kitId?: string }>();
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const fileInputId = 'quick-create-file-input';

  const [step, setStep] = useState<WizardStep>(1);
  const [error, setError] = useState('');
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // 既存キット編集モード

  // Step 1: 画像選択
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [croppingFile, setCroppingFile] = useState<File | null>(null);
  const [cropQueue, setCropQueue] = useState<File[]>([]);

  // Step 2: 配置
  const [kitId, setKitId] = useState('');
  const [kitNumber, setKitNumber] = useState('');
  const [kitColor, setKitColor] = useState(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
  const [createdStickers, setCreatedStickers] = useState<Sticker[]>([]);
  const [layouts, setLayouts] = useState<LayoutInstance[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState({ current: 0, total: 0 });
  const [dragging, setDragging] = useState<{ uid: string; startX: number; startY: number; startLx: number; startLy: number } | null>(null);

  // Step 3: 音設定
  const [musicalKey, setMusicalKey] = useState('random');
  const [percussionMap, setPercussionMap] = useState<Record<string, boolean>>({});
  const [audioLib, setAudioLib] = useState<Record<string, LibrarySound[]>>({});
  const [soundAssignment, setSoundAssignment] = useState<Record<string, LibrarySound>>({});
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [bouncingId, setBouncingId] = useState<string | null>(null);
  const [customAudioMap, setCustomAudioMap] = useState<Record<string, { name: string; url: string }>>({});
  const [uploadingAudioId, setUploadingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUploadRef = useRef<HTMLInputElement>(null);
  const audioUploadTargetRef = useRef<string | null>(null);

  // Step 4: 名前・説明・タグ
  const [kitName, setKitName] = useState('');
  const [kitDescription, setKitDescription] = useState('');
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  // ====== 下書き復帰 ======

  useEffect(() => {
    if (!editKitId) return;
    setIsLoadingDraft(true);
    (async () => {
      try {
        const { kit, stickers } = await kitsApi.getKit(editKitId);
        setIsEditMode(true);
        setKitId(kit.id);
        setKitNumber(kit.kit_number);
        setKitColor(kit.color);
        setCreatedStickers(stickers);
        setMusicalKey(kit.musical_key || 'random');
        if (kit.name && !kit.name.startsWith('Kit ')) setKitName(kit.name);
        if (kit.description) setKitDescription(kit.description);

        // percussion マップ
        const pMap: Record<string, boolean> = {};
        stickers.forEach(s => { pMap[s.id] = !!s.is_percussion; });
        setPercussionMap(pMap);

        // レイアウト読み込み
        const allLayouts: LayoutInstance[] = [];
        for (const sticker of stickers) {
          const res = await kitsApi.getLayouts(editKitId, sticker.id);
          for (const l of res.layouts) {
            allLayouts.push({ uid: uid(), stickerId: sticker.id, x: l.x, y: l.y, size: l.size, rotation: l.rotation });
          }
        }
        setLayouts(allLayouts);

        // タグ読み込み
        try {
          const { fetchKitTags } = await import('@/api/tagsApi');
          const tags = await fetchKitTags(editKitId);
          setTagNames(tags.map(t => t.name));
        } catch { /* タグなしでもOK */ }

        // 音声ライブラリ読み込み
        audioLibraryApi.getLibrary().then(res => {
          const flat: Record<string, LibrarySound[]> = {};
          for (const [cat, sounds] of Object.entries(res.categories)) {
            flat[cat] = sounds.filter(s => s.available);
          }
          setAudioLib(flat);
        }).catch(() => {});

        // 既存キットは常にStep 2（配置）から
        setStep(2);
      } catch {
        setError(t('quickCreate.error'));
      } finally {
        setIsLoadingDraft(false);
      }
    })();
  }, [editKitId]);

  // ====== Step 1 ======

  const handleFilesSelected = (fileList: FileList) => {
    const files = Array.from(fileList);
    const remaining = 5 - images.length;
    const toAdd = files.slice(0, remaining);
    if (toAdd.length === 0) return;
    setCroppingFile(toAdd[0]);
    setCropQueue(toAdd.slice(1));
  };

  const handleCropComplete = (blob: Blob) => {
    setImages(prev => [...prev, { id: uid(), file: croppingFile!, previewUrl: URL.createObjectURL(blob), croppedBlob: blob }]);
    if (cropQueue.length > 0) {
      setCroppingFile(cropQueue[0]);
      setCropQueue(prev => prev.slice(1));
    } else {
      setCroppingFile(null);
    }
  };

  const handleCropCancel = () => {
    if (cropQueue.length > 0) {
      setCroppingFile(cropQueue[0]);
      setCropQueue(prev => prev.slice(1));
    } else {
      setCroppingFile(null);
    }
  };

  const handleRemoveImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  };

  // Step 1 → 2: キット作成 + ステッカーアップロード
  const handleGoToStep2 = async () => {
    const croppedImages = images.filter(img => img.croppedBlob);
    if (croppedImages.length < 2) return;

    setError('');
    setIsCreating(true);
    setCreateProgress({ current: 0, total: croppedImages.length });

    try {
      // 仮名でキット作成
      const kitRes = await kitsApi.createKit({ name: `Kit ${Date.now()}`, color: kitColor });
      const newKitId = kitRes.kit.id;
      setKitId(newKitId);
      setKitNumber(kitRes.kit.kit_number);

      const presets = addJitter(LAYOUT_PRESETS[croppedImages.length]);
      const stickers: Sticker[] = [];
      const newLayouts: LayoutInstance[] = [];

      for (let i = 0; i < croppedImages.length; i++) {
        setCreateProgress({ current: i + 1, total: croppedImages.length });
        const img = croppedImages[i];
        const stickerRes = await kitsApi.createSticker(newKitId, { name: `Sticker ${i + 1}` });
        const file = new File([img.croppedBlob!], `sticker-${i + 1}.png`, { type: 'image/png' });
        const uploadRes = await kitsApi.uploadStickerImage(newKitId, stickerRes.sticker.id, file);
        await kitsApi.createLayout(newKitId, stickerRes.sticker.id, presets[i]);
        stickers.push({ ...uploadRes.sticker, image_uploaded: 1 });
        newLayouts.push({ uid: uid(), stickerId: stickerRes.sticker.id, ...presets[i] });
      }

      setCreatedStickers(stickers);
      setLayouts(newLayouts);
      setSelectedUid(null);
      // percussion マップ初期化（デフォルト: 最初の1枚をドラム、残りをメロディ）
      const pMap: Record<string, boolean> = {};
      stickers.forEach((s, i) => { pMap[s.id] = i === 0; });
      setPercussionMap(pMap);
      // 音声ライブラリをバックグラウンドでロード
      audioLibraryApi.getLibrary().then(res => {
        const flat: Record<string, LibrarySound[]> = {};
        for (const [cat, sounds] of Object.entries(res.categories)) {
          flat[cat] = sounds.filter(s => s.available);
        }
        setAudioLib(flat);
      }).catch(() => {});
      setStep(2);
    } catch {
      setError(t('quickCreate.error'));
    } finally {
      setIsCreating(false);
    }
  };

  // ====== Step 2 ======

  const selectedLayout = layouts.find(l => l.uid === selectedUid);
  const selectedSticker = selectedLayout ? createdStickers.find(s => s.id === selectedLayout.stickerId) : null;

  const handleShuffle = () => {
    const count = layouts.length;
    const nearest = Math.min(5, Math.max(2, count));
    const base = LAYOUT_PRESETS[nearest] || LAYOUT_PRESETS[5];
    const presets = addJitter(base);
    setLayouts(prev => prev.map((l, i) => ({ ...l, ...presets[i % presets.length] })));
    setSelectedUid(null);
  };

  const handleColorChange = async (color: string) => {
    setKitColor(color);
    if (kitId) { try { await kitsApi.updateKit(kitId, { color }); } catch { /* */ } }
  };

  const handleAddInstance = (sticker: Sticker) => {
    const offset = layouts.filter(l => l.stickerId === sticker.id).length;
    setLayouts(prev => [...prev, {
      uid: uid(), stickerId: sticker.id,
      x: Math.max(5, Math.min(85, 20 + offset * 12 + (Math.random() - 0.5) * 10)),
      y: Math.max(5, Math.min(85, 20 + offset * 10 + (Math.random() - 0.5) * 10)),
      size: Math.round(70 + (Math.random() - 0.5) * 20),
      rotation: Math.round((Math.random() - 0.5) * 16),
    }]);
  };

  const handleRemoveInstance = (stickerId: string) => {
    const instances = layouts.filter(l => l.stickerId === stickerId);
    if (instances.length <= 0 || layouts.length <= 1) return;
    const lastUid = instances[instances.length - 1].uid;
    setLayouts(prev => prev.filter(l => l.uid !== lastUid));
    if (selectedUid === lastUid) setSelectedUid(null);
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, u: string) => {
    e.preventDefault();
    setSelectedUid(u);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const layout = layouts.find(l => l.uid === u);
    if (!layout) return;
    setDragging({ uid: u, startX: clientX, startY: clientY, startLx: layout.x, startLy: layout.y });
  };

  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging || !previewAreaRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = previewAreaRef.current.getBoundingClientRect();
    const dx = ((clientX - dragging.startX) / rect.width) * 100;
    const dy = ((clientY - dragging.startY) / rect.height) * 100;
    setLayouts(prev => prev.map(l =>
      l.uid === dragging.uid ? { ...l, x: Math.max(0, Math.min(90, dragging.startLx + dx)), y: Math.max(0, Math.min(90, dragging.startLy + dy)) } : l
    ));
  }, [dragging]);

  const handleDragEnd = useCallback(() => { setDragging(null); }, []);

  const updateLayout = (u: string, field: 'size' | 'rotation', value: number) => {
    setLayouts(prev => prev.map(l => l.uid === u ? { ...l, [field]: value } : l));
  };

  const instanceCountOf = (stickerId: string) => layouts.filter(l => l.stickerId === stickerId).length;

  // ====== 音声プレビュー ======

  // 全ステッカーに音を割り当て（初回 & キー変更時のみ）
  const assignAllSounds = () => {
    const allSounds = Object.values(audioLib).flat();
    if (allSounds.length === 0) return;
    const key = musicalKey === 'random' ? 'C/Am' : musicalKey;
    const newAssignment: Record<string, LibrarySound> = {};
    const usedIds = new Set<string>();

    for (const sticker of createdStickers) {
      const isPerc = percussionMap[sticker.id] ?? false;
      const matches = allSounds.filter(s =>
        s.isPercussion === isPerc &&
        (s.musicalKey === null || s.musicalKey === key) &&
        !usedIds.has(s.id)
      );
      const pool = matches.length > 0 ? matches : allSounds.filter(s =>
        s.isPercussion === isPerc && (s.musicalKey === null || s.musicalKey === key)
      );
      if (pool.length > 0) {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        newAssignment[sticker.id] = pick;
        usedIds.add(pick.id);
      }
    }
    setSoundAssignment(newAssignment);
  };

  // 1ステッカーだけ再割り当て（ドラム/メロディ切り替え時）
  // isPerc を引数で受け取る（state 更新前に呼ばれるため）
  const assignSoundForOne = (stickerId: string, isPerc: boolean) => {
    const allSounds = Object.values(audioLib).flat();
    if (allSounds.length === 0) return;
    const key = musicalKey === 'random' ? 'C/Am' : musicalKey;
    const matches = allSounds.filter(s =>
      s.isPercussion === isPerc && (s.musicalKey === null || s.musicalKey === key)
    );
    if (matches.length > 0) {
      const pick = matches[Math.floor(Math.random() * matches.length)];
      setSoundAssignment(prev => ({ ...prev, [stickerId]: pick }));
    }
    setBouncingId(stickerId);
    setTimeout(() => setBouncingId(null), 400);
  };

  // キー変更時のみ全体再割り当て
  const prevKeyRef = useRef(musicalKey);
  if (Object.keys(audioLib).length > 0 && createdStickers.length > 0 && prevKeyRef.current !== musicalKey) {
    prevKeyRef.current = musicalKey;
    setTimeout(assignAllSounds, 0);
  }

  // 初回割り当て（audioLib ロード完了時）
  const didInitAssign = useRef(false);
  if (Object.keys(audioLib).length > 0 && createdStickers.length > 0 && !didInitAssign.current) {
    didInitAssign.current = true;
    setTimeout(assignAllSounds, 0);
  }

  // 1ステッカーだけ別の音に切り替え
  const reshuffleSingleSound = (stickerId: string) => {
    const allSounds = Object.values(audioLib).flat();
    const key = musicalKey === 'random' ? 'C/Am' : musicalKey;
    const isPerc = percussionMap[stickerId] ?? false;
    const current = soundAssignment[stickerId];
    const matches = allSounds.filter(s =>
      s.isPercussion === isPerc &&
      (s.musicalKey === null || s.musicalKey === key) &&
      s.id !== current?.id
    );
    if (matches.length > 0) {
      const pick = matches[Math.floor(Math.random() * matches.length)];
      setSoundAssignment(prev => ({ ...prev, [stickerId]: pick }));
    }
    // ぽわんアニメーション
    setBouncingId(stickerId);
    setTimeout(() => setBouncingId(null), 400);
    // 切り替え後に自動再生
    setTimeout(() => playPreview(stickerId), 50);
  };

  const playPreview = (stickerId: string) => {
    // カスタム音声があればそちらを再生
    const custom = customAudioMap[stickerId];
    const sound = soundAssignment[stickerId];
    const url = custom ? custom.url : (sound?.path ? (getAssetBaseUrl() + sound.path) : null);
    if (!url) return;

    if (playingId === stickerId && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }
    if (audioRef.current) { audioRef.current.pause(); }
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingId(stickerId);
    audio.play().catch(() => {});
    audio.onended = () => { setPlayingId(null); audioRef.current = null; };
  };

  // カスタム音声アップロード
  const handleAudioUpload = async (stickerId: string, file: File) => {
    setUploadingAudioId(stickerId);
    try {
      await kitsApi.uploadStickerAudio(kitId, stickerId, file);
      const localUrl = URL.createObjectURL(file);
      setCustomAudioMap(prev => ({ ...prev, [stickerId]: { name: file.name, url: localUrl } }));
      setBouncingId(stickerId);
      setTimeout(() => setBouncingId(null), 400);
    } catch {
      // アップロード失敗は無視
    } finally {
      setUploadingAudioId(null);
    }
  };

  // ====== Step 4: 公開 ======

  const handlePublish = async () => {
    if (!kitId || !kitName.trim()) return;
    setIsPublishing(true);
    setError('');
    try {
      // 編集モードの場合、一度 draft に戻して編集可能にする
      if (isEditMode) {
        await kitsApi.updateKit(kitId, { status: 'draft' });
      }

      // レイアウト同期
      for (const sticker of createdStickers) {
        const res = await kitsApi.getLayouts(kitId, sticker.id);
        for (const existing of res.layouts) {
          await kitsApi.deleteLayout(kitId, sticker.id, existing.id);
        }
      }
      for (const inst of layouts) {
        await kitsApi.createLayout(kitId, inst.stickerId, { x: inst.x, y: inst.y, size: inst.size, rotation: inst.rotation });
      }
      // 音設定を反映: キー + 各ステッカーの percussion
      for (const sticker of createdStickers) {
        const isPerc = percussionMap[sticker.id] ?? false;
        if (isPerc !== !!sticker.is_percussion) {
          await kitsApi.updateSticker(kitId, sticker.id, { isPercussion: isPerc });
        }
      }
      // 名前・説明・キーを更新して公開
      await kitsApi.updateKit(kitId, {
        name: kitName.trim(),
        ...(kitDescription.trim() && { description: kitDescription.trim() }),
        musicalKey: musicalKey,
        status: 'published',
      });
      // タグ保存
      if (tagNames.length > 0) {
        const { updateKitTags } = await import('@/api/tagsApi');
        await updateKitTags(kitId, tagNames);
      }
      setStep(5);
    } catch {
      setError(t('quickCreate.error'));
    } finally {
      setIsPublishing(false);
    }
  };

  // ====== 算出値 ======
  const canGoToStep2 = images.length >= 2 && !croppingFile;

  // ====== レンダリング ======
  return (
    <div className="max-w-lg mx-auto space-y-6 pb-12">
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/creator" className="hover:text-gray-700">{t('nav.dashboard')}</Link>
        <span>/</span>
        <span className="text-gray-900">{t('quickCreate.title')}</span>
      </nav>

      {/* ステップインジケーター */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-colors flex-shrink-0 ${
              step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
            }`}>
              {step > s ? (
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : s}
            </div>
            {s < 5 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>
      {/* 現在のステップ名 */}
      <p className="text-center text-sm font-medium text-blue-600">{t(STEP_LABELS[step - 1])}</p>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

      {/* 下書き読み込み中 */}
      {isLoadingDraft && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600">{t('common.loading')}</span>
          </div>
        </div>
      )}

      {/* ===== Step 1: 画像選択 ===== */}
      {step === 1 && !isLoadingDraft && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">{t('quickCreate.selectImages')}</h3>
              <span className="text-sm text-gray-500">{t('quickCreate.imageCount', { count: images.length })}</span>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, idx) => {
                const img = images[idx];
                const isRequired = idx < 2;
                if (img) {
                  return (
                    <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border-2 border-blue-400 shadow-sm">
                      <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => handleRemoveImage(img.id)}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                }
                const isNext = idx === images.length;
                return (
                  <label key={`slot-${idx}`} htmlFor={fileInputId}
                    className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isRequired && images.length < 2 ? 'border-blue-400 bg-blue-50 hover:bg-blue-100' : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                    } ${isNext ? 'ring-2 ring-blue-300 ring-offset-1' : ''}`}>
                    <svg className={`w-6 h-6 ${isRequired && images.length < 2 ? 'text-blue-400' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                    {isRequired && images.length <= idx && <span className="text-[10px] text-blue-500 font-medium mt-0.5">{idx + 1}</span>}
                  </label>
                );
              })}
            </div>

            <input id={fileInputId} type="file" accept="image/*"
              className="absolute w-0 h-0 opacity-0 overflow-hidden"
              onChange={e => { if (e.target.files && e.target.files.length > 0) handleFilesSelected(e.target.files); }} />

            <p className="mt-3 text-xs text-gray-400 text-center">{t('quickCreate.dragDropHint')}</p>
            {images.length > 0 && images.length < 2 && (
              <p className="mt-2 text-sm text-amber-600 text-center">{t('quickCreate.minImages')}</p>
            )}
          </div>

          <button onClick={handleGoToStep2} disabled={!canGoToStep2 || isCreating}
            className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium text-base hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {isCreating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{createProgress.current > 0 ? t('quickCreate.creatingStep', { current: createProgress.current, total: createProgress.total }) : t('quickCreate.creating')}</span>
              </>
            ) : (
              <><span>{t('quickCreate.next')}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            {t('quickCreate.advancedHint')}{' '}
            <Link to="/creator/kits/new" className="text-blue-500 hover:underline">{t('quickCreate.advancedLink')}</Link>
          </p>
        </div>
      )}

      {/* ===== Step 2: 配置確定 ===== */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative rounded-xl overflow-hidden select-none"
              style={{ width: 280, height: 420, background: '#fefefe',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 12px 24px -8px rgba(0,0,0,0.15)',
                border: '1px solid rgba(255,255,255,0.8)' }}>
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: kitColor }} />
              <div ref={previewAreaRef} className="relative cursor-crosshair" style={{ height: 380, marginTop: 40 }}
                onClick={() => setSelectedUid(null)}
                onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}
                onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}>
                {layouts.map((inst) => {
                  const sticker = createdStickers.find(s => s.id === inst.stickerId);
                  if (!sticker) return null;
                  const isSelected = selectedUid === inst.uid;
                  return (
                    <div key={inst.uid}
                      className={`absolute cursor-grab active:cursor-grabbing transition-shadow ${isSelected ? 'ring-3 ring-blue-500 ring-offset-1 z-10 rounded-sm' : ''}`}
                      style={{ left: `${inst.x}%`, top: `${inst.y}%`, width: inst.size, height: inst.size, transform: `rotate(${inst.rotation}deg)` }}
                      onClick={e => { e.stopPropagation(); setSelectedUid(inst.uid); }}
                      onMouseDown={e => handleDragStart(e, inst.uid)} onTouchStart={e => handleDragStart(e, inst.uid)}>
                      <img src={getStickerImageUrl(kitNumber, sticker.full_id)} alt=""
                        className="w-full h-full object-contain drop-shadow-md pointer-events-none" draggable={false} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* サイズ + 回転 */}
          <div className="bg-white rounded-lg border p-3">
            {selectedLayout && selectedSticker ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                    <img src={getStickerImageUrl(kitNumber, selectedSticker.full_id)} alt="" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 flex-1">{selectedSticker.name}</span>
                  <span className="text-[10px] text-gray-400">{t('layout.selectedHint')}</span>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-600 font-medium">{t('layout.size')}</label>
                    <span className="text-xs text-gray-500 font-mono">{selectedLayout.size}px</span>
                  </div>
                  <input type="range" min="40" max="130" value={selectedLayout.size}
                    onChange={e => updateLayout(selectedLayout.uid, 'size', Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-600 font-medium">{t('layout.rotation')}</label>
                    <span className="text-xs text-gray-500 font-mono">{selectedLayout.rotation}°</span>
                  </div>
                  <input type="range" min="-45" max="45" value={selectedLayout.rotation}
                    onChange={e => updateLayout(selectedLayout.uid, 'rotation', Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                </div>
              </div>
            ) : (
              <p className="text-center text-xs text-gray-400 py-1">{t('layout.selectToAdjust')}</p>
            )}
          </div>

          {/* 増減 */}
          <div className="bg-gray-50 rounded-lg border p-3">
            <div className="flex flex-wrap gap-2">
              {createdStickers.map(sticker => {
                const count = instanceCountOf(sticker.id);
                return (
                  <div key={sticker.id} className="flex items-center gap-1.5 px-2 py-1.5 bg-white rounded-lg border">
                    <div className="w-7 h-7 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                      <img src={getStickerImageUrl(kitNumber, sticker.full_id)} alt={sticker.name} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-xs text-gray-500 font-mono w-4 text-center">{count}</span>
                    <button onClick={() => handleRemoveInstance(sticker.id)} disabled={count <= 0 || layouts.length <= 1}
                      className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-500 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={2} d="M20 12H4" /></svg>
                    </button>
                    <button onClick={() => handleAddInstance(sticker)}
                      className="w-6 h-6 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* カラー + シャッフル */}
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className="flex flex-wrap gap-1.5 flex-1">
                {PRESET_COLORS.map(color => (
                  <button key={color} onClick={() => handleColorChange(color)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${kitColor === color ? 'border-blue-600 scale-110' : 'border-gray-200 hover:border-gray-400'}`}
                    style={{ background: color }} />
                ))}
              </div>
              <button onClick={handleShuffle}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 flex-shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t('quickCreate.shuffle')}
              </button>
            </div>
          </div>

          {/* 次へ */}
          <button onClick={() => setStep(3)}
            className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium text-base hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
            <span>{t('quickCreate.next')}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}

      {/* ===== Step 3: 音の設定 ===== */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 text-center">{t('quickCreate.soundSettingDesc')}</p>

          {/* キー選択 */}
          <div className="bg-white shadow rounded-lg p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('quickCreate.musicalKey')}</label>
            <select value={musicalKey} onChange={e => setMusicalKey(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
              {MUSICAL_KEYS.map(k => (
                <option key={k.value} value={k.value}>{k.labelKey ? t(k.labelKey) : k.label}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-400">{t('quickCreate.musicalKeyDesc')}</p>
          </div>

          {/* 各ステッカーのドラム/メロディ切り替え + 試聴 */}
          <div className="bg-white shadow rounded-lg p-5 space-y-3">
            {createdStickers.map(sticker => {
              const isPerc = percussionMap[sticker.id] ?? false;
              const isBouncing = bouncingId === sticker.id;
              const sound = soundAssignment[sticker.id];
              return (
                <div key={sticker.id}
                  className={`flex items-center gap-2 sm:gap-3 transition-transform ${isBouncing ? 'animate-[bounce-pop_0.4s_ease]' : ''}`}
                  style={isBouncing ? { animation: 'bounce-pop 0.4s ease' } : {}}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img src={getStickerImageUrl(kitNumber, sticker.full_id)} alt="" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* トグル: ドラム / メロディ */}
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                      <button
                        onClick={() => {
                          if (isPerc) return;
                          setPercussionMap(prev => ({ ...prev, [sticker.id]: true }));
                          assignSoundForOne(sticker.id, true);
                        }}
                        className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                          isPerc ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {t('quickCreate.drumLabel')}
                      </button>
                      <button
                        onClick={() => {
                          if (!isPerc) return;
                          setPercussionMap(prev => ({ ...prev, [sticker.id]: false }));
                          assignSoundForOne(sticker.id, false);
                        }}
                        className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                          !isPerc ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {t('quickCreate.melodyLabel')}
                      </button>
                    </div>
                    {/* 割り当て中の音名 */}
                    <p className="text-[10px] text-gray-400 truncate pl-0.5">
                      {customAudioMap[sticker.id]
                        ? customAudioMap[sticker.id].name
                        : sound ? (sound.nameJa || sound.name) : ''}
                    </p>
                  </div>
                  {/* 切り替え / アップロード / 試聴ボタン群 */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* 切り替えボタン（カスタム音声がない時のみ） */}
                    {!customAudioMap[sticker.id] && (
                      <button
                        onClick={() => reshuffleSingleSound(sticker.id)}
                        disabled={Object.keys(audioLib).length === 0}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30"
                        title="Change sound"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    )}
                    {/* カスタム音声解除ボタン */}
                    {customAudioMap[sticker.id] && (
                      <button
                        onClick={() => setCustomAudioMap(prev => { const next = { ...prev }; delete next[sticker.id]; return next; })}
                        className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors"
                        title="Remove custom audio"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    {/* 音声アップロードボタン（PC のみ） */}
                    <button
                      onClick={() => { audioUploadTargetRef.current = sticker.id; audioUploadRef.current?.click(); }}
                      disabled={uploadingAudioId === sticker.id}
                      className="hidden sm:flex w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 items-center justify-center text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                      title="Upload audio"
                    >
                      {uploadingAudioId === sticker.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      )}
                    </button>
                    {/* 試聴ボタン */}
                    <button
                      onClick={() => playPreview(sticker.id)}
                      disabled={!sound && !customAudioMap[sticker.id]}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors disabled:opacity-30 ${
                        playingId === sticker.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {playingId === sticker.id ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 音声アップロード用 hidden input（PC のみ使用） */}
          <input ref={audioUploadRef} type="file" accept="audio/mpeg,audio/mp3" className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              const target = audioUploadTargetRef.current;
              if (file && target) handleAudioUpload(target, file);
              e.target.value = '';
              audioUploadTargetRef.current = null;
            }} />

          {/* 次へ */}
          <button onClick={() => setStep(4)}
            className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium text-base hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
            <span>{t('quickCreate.next')}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}

      {/* ===== Step 4: 名前・説明・タグ ===== */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('quickCreate.kitNameLabel')} <span className="text-red-500">*</span>
            </label>
            <input type="text" value={kitName} onChange={e => setKitName(e.target.value)}
              placeholder={t('quickCreate.kitNamePlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              autoFocus />
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('kitForm.description')}
              <span className="text-gray-400 font-normal ml-1">({t('common.optional')})</span>
            </label>
            <textarea value={kitDescription} onChange={e => setKitDescription(e.target.value)} rows={2}
              placeholder={t('kitForm.descriptionPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none" />
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('kitDetail.editTags')}
              <span className="text-gray-400 font-normal ml-1">({t('common.optional')})</span>
            </label>
            <TagSelector selectedTags={tagNames} onChange={setTagNames} maxTags={5} />
          </div>

          <button onClick={handlePublish} disabled={isPublishing || !kitName.trim()}
            className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium text-base hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md">
            {isPublishing ? (
              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />{t(isEditMode ? 'quickCreate.updating' : 'quickCreate.publishing')}</>
            ) : (
              <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{t(isEditMode ? 'quickCreate.update' : 'quickCreate.publish')}</>
            )}
          </button>
        </div>
      )}

      {/* ===== Step 5: 完成 ===== */}
      {step === 5 && (
        <div className="text-center space-y-6 py-8">
          <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('quickCreate.complete')}</h2>
            <p className="mt-2 text-gray-600">{t('quickCreate.completeDesc')}</p>
          </div>
          <div className="flex justify-center">
            <div className="relative rounded-lg overflow-hidden shadow-lg"
              style={{ width: 140, height: 210, background: `linear-gradient(135deg, ${kitColor}40 0%, ${kitColor}20 100%)` }}>
              <div className="relative" style={{ height: 190 }}>
                {layouts.map(inst => {
                  const sticker = createdStickers.find(s => s.id === inst.stickerId);
                  if (!sticker) return null;
                  return (
                    <div key={inst.uid} className="absolute"
                      style={{ left: `${inst.x}%`, top: `${inst.y}%`, width: inst.size * 0.5, height: inst.size * 0.5, transform: `rotate(${inst.rotation}deg)` }}>
                      <img src={getStickerImageUrl(kitNumber, sticker.full_id)} alt="" className="w-full h-full object-contain" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <Link to="/creator" className="py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-center">
              {t('quickCreate.backToDashboard')}
            </Link>
            <button onClick={() => {
              setStep(1); setImages([]); setKitId(''); setKitNumber(''); setKitName(''); setKitDescription(''); setTagNames([]);
              setCreatedStickers([]); setLayouts([]); setSelectedUid(null); setMusicalKey('random'); setPercussionMap({}); setSoundAssignment({}); didInitAssign.current = false;
              setKitColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]); setError('');
            }} className="py-3 px-6 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              {t('quickCreate.createAnother')}
            </button>
          </div>
        </div>
      )}

      {/* ImageCropper モーダル */}
      {croppingFile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full">
            <ImageCropper imageFile={croppingFile} onComplete={handleCropComplete} onCancel={handleCropCancel} outputSize={256} />
          </div>
        </div>
      )}
    </div>
  );
};
