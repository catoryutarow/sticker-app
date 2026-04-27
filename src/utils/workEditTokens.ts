const STORAGE_KEY_PREFIX = 'sticker-app-work-edit-token:';

function getStorageKey(shareId: string): string {
  return `${STORAGE_KEY_PREFIX}${shareId}`;
}

export function saveWorkEditToken(shareId: string, editToken: string): void {
  localStorage.setItem(getStorageKey(shareId), editToken);
}

export function getWorkEditToken(shareId: string): string | null {
  return localStorage.getItem(getStorageKey(shareId));
}

export function removeWorkEditToken(shareId: string): void {
  localStorage.removeItem(getStorageKey(shareId));
}
