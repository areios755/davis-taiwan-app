const MAX_SIZE = 600;
const TARGET_BYTES = 150 * 1024;

export interface CompressResult {
  base64: string;
  originalSize: number;
  compressedSize: number;
}

/**
 * Compress a product image: resize to max 600px, square crop center, JPEG.
 */
export async function compressProductImage(file: File): Promise<CompressResult> {
  const originalSize = file.size;

  // If already small enough and is JPEG, just convert to base64
  if (originalSize <= TARGET_BYTES && file.type === 'image/jpeg') {
    const base64 = await fileToBase64(file);
    return { base64, originalSize, compressedSize: originalSize };
  }

  const img = await loadImage(file);
  const { canvas } = cropAndResize(img);

  // Try quality 0.85 first
  let blob = await canvasToBlob(canvas, 0.85);
  if (blob.size > TARGET_BYTES) {
    blob = await canvasToBlob(canvas, 0.7);
  }
  if (blob.size > TARGET_BYTES) {
    blob = await canvasToBlob(canvas, 0.5);
  }

  const base64 = await blobToBase64(blob);
  return { base64, originalSize, compressedSize: blob.size };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    const url = URL.createObjectURL(file);
    img.src = url;
  });
}

function cropAndResize(img: HTMLImageElement): { canvas: HTMLCanvasElement } {
  // Square crop from center
  const srcSize = Math.min(img.width, img.height);
  const sx = (img.width - srcSize) / 2;
  const sy = (img.height - srcSize) / 2;

  const outSize = Math.min(srcSize, MAX_SIZE);
  const canvas = document.createElement('canvas');
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, outSize, outSize);
  return { canvas };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
      'image/jpeg',
      quality,
    );
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data:image/jpeg;base64, prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
