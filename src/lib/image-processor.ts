const MAX_SIZE = 1024;    // Max dimension in px
const QUALITY = 0.85;     // JPEG quality
const MAX_BYTES = 1_500_000; // ~1.5MB after base64

/**
 * Compress and resize an image file to fit within limits.
 * Returns a base64-encoded JPEG string (without data: prefix).
 */
export async function processImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Scale down if needed
          if (width > MAX_SIZE || height > MAX_SIZE) {
            const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas context unavailable');

          ctx.drawImage(img, 0, 0, width, height);

          // Try progressive quality reduction if too large
          let quality = QUALITY;
          let base64 = canvas.toDataURL('image/jpeg', quality);

          while (base64.length > MAX_BYTES && quality > 0.3) {
            quality -= 0.1;
            base64 = canvas.toDataURL('image/jpeg', quality);
          }

          // Strip the data:image/jpeg;base64, prefix
          const stripped = base64.replace(/^data:image\/jpeg;base64,/, '');
          resolve(stripped);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a base64 string to a Blob for Canvas operations.
 */
export function base64ToBlob(base64: string, type = 'image/jpeg'): Blob {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type });
}
