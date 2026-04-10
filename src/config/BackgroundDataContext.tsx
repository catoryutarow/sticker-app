import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { backgroundsApi, Background } from '@/api/backgroundsApi';
import {
  BackgroundDefinition,
  registerDynamicBackground,
  clearDynamicBackgrounds,
} from './backgroundConfig';

interface BackgroundDataContextType {
  backgrounds: BackgroundDefinition[];
  rawBackgrounds: Background[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const BackgroundDataContext = createContext<BackgroundDataContextType>({
  backgrounds: [],
  rawBackgrounds: [],
  isLoading: true,
  error: null,
  reload: async () => {},
});

export function useBackgroundData() {
  return useContext(BackgroundDataContext);
}

function convertToDefinition(bg: Background): BackgroundDefinition {
  return {
    id: bg.id,
    name: bg.name,
    nameJa: bg.name_ja || bg.name,
    filename: bg.filename,
    isSpecial: bg.is_special === 1,
    specialKitId: bg.special_kit_id,
  };
}

interface BackgroundDataProviderProps {
  children: ReactNode;
}

export function BackgroundDataProvider({ children }: BackgroundDataProviderProps) {
  const [backgrounds, setBackgrounds] = useState<BackgroundDefinition[]>([]);
  const [rawBackgrounds, setRawBackgrounds] = useState<Background[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBackgrounds = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await backgroundsApi.getBackgrounds();
      const defs = result.backgrounds.map(convertToDefinition);

      // Register globally for legacy getBackgroundImagePath() callers
      clearDynamicBackgrounds();
      defs.forEach(registerDynamicBackground);

      setBackgrounds(defs);
      setRawBackgrounds(result.backgrounds);
      setError(null);
    } catch (err) {
      console.error('Failed to load backgrounds:', err);
      setError('背景の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackgrounds();
  }, [loadBackgrounds]);

  return (
    <BackgroundDataContext.Provider
      value={{
        backgrounds,
        rawBackgrounds,
        isLoading,
        error,
        reload: loadBackgrounds,
      }}
    >
      {children}
    </BackgroundDataContext.Provider>
  );
}
