import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { extFromMime } from '../utils/media-storage';

export interface PickedImage {
  dataUrl: string;
  ext: string;
}

// Keep images small enough to share over WhatsApp / email comfortably.
const MAX_SIDE = 1600;

const resize = (dataUrl: string): Promise<PickedImage> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.85), ext: 'jpg' });
    };
    img.onerror = () => {
      const mime = dataUrl.slice(5, dataUrl.indexOf(';'));
      resolve({ dataUrl, ext: extFromMime(mime, 'jpg') });
    };
    img.src = dataUrl;
  });

/** Web: open a file input. `capture` asks mobile browsers to open the camera. */
const pickWithInput = (capture: boolean): Promise<string | null> =>
  new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (capture) input.setAttribute('capture', 'environment');
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });

export const useCamera = () => {
  const pick = useCallback(async (fromCamera: boolean): Promise<PickedImage | null> => {
    let dataUrl: string | null = null;
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await Camera.getPhoto({
          source: fromCamera ? CameraSource.Camera : CameraSource.Photos,
          resultType: CameraResultType.DataUrl,
          quality: 85,
          width: MAX_SIDE,
          correctOrientation: true,
        });
        dataUrl = photo.dataUrl ?? null;
      } catch {
        return null; // cancelled
      }
    } else {
      dataUrl = await pickWithInput(fromCamera);
    }
    return dataUrl ? resize(dataUrl) : null;
  }, []);

  return {
    takePhoto: () => pick(true),
    chooseFromGallery: () => pick(false),
  };
};
