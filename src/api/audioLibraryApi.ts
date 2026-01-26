// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface LibrarySound {
  id: string;
  name: string;
  nameJa: string;
  file: string;
  isPercussion: boolean;
  musicalKey: string | null;  // キー情報（例: "C/Am"）、nullはキーに依存しない
  available: boolean;
  path: string | null;
}

export interface AudioLibraryResponse {
  categories: {
    drums: LibrarySound[];
    bass: LibrarySound[];
    synth: LibrarySound[];
    instruments: LibrarySound[];
  };
}

class AudioLibraryApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'AudioLibraryApiError';
  }
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json();
  if (!response.ok) {
    throw new AudioLibraryApiError(response.status, data.error || 'An error occurred');
  }
  return data;
};

export const audioLibraryApi = {
  /**
   * 音声ライブラリ一覧取得
   */
  getLibrary: async (): Promise<AudioLibraryResponse> => {
    const response = await fetch(`${API_BASE_URL}/audio-library`, {
      method: 'GET',
    });
    return handleResponse<AudioLibraryResponse>(response);
  },

  /**
   * ライブラリ音声をシールに割り当て
   */
  assignLibraryAudio: async (
    kitId: string,
    stickerId: string,
    soundId: string
  ): Promise<{ sticker: any; audioPath: string; sourceSound: LibrarySound }> => {
    const response = await fetch(
      `${API_BASE_URL}/kits/${kitId}/stickers/${stickerId}/audio-from-library`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ soundId }),
      }
    );
    return handleResponse<{ sticker: any; audioPath: string; sourceSound: LibrarySound }>(response);
  },
};

export { AudioLibraryApiError };
