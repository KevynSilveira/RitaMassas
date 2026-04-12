import type { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';

import { resolveStoredAssetUri, uploadWebImage } from './web-api';

export type PendingProductPhotoUpload = {
  base64: string;
  fileName: string;
  mimeType: string | null;
};

function readBlobAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Nao foi possivel ler a imagem.'));
    };
    reader.readAsDataURL(blob);
  });
}

async function fetchAssetAsBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return readBlobAsBase64(blob);
}

export async function createPendingProductPhotoUpload(
  asset: ImagePickerAsset
): Promise<PendingProductPhotoUpload | null> {
  if (Platform.OS !== 'web') return null;

  const base64 = asset.base64 ?? (await fetchAssetAsBase64(asset.uri));
  return {
    base64,
    fileName: asset.fileName ?? `produto-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? null,
  };
}

export async function persistProductPhoto(
  currentPhotoUri: string | null,
  pendingUpload: PendingProductPhotoUpload | null
): Promise<string | null> {
  if (Platform.OS === 'web' && pendingUpload) {
    return uploadWebImage(pendingUpload);
  }
  return currentPhotoUri;
}

export function resolveProductPhotoUri(photoUri: string | null): string | null {
  return resolveStoredAssetUri(photoUri);
}
