import type { ProductCombo } from '@/lib/breed-combos';
import { PRODUCTS } from '@/data/products';

const FONT = "'PingFang TC', 'Microsoft JhengHei', 'Noto Sans TC', sans-serif";
const NAVY = '#0B1E3D';
const BLUE = '#1A4A9E';
const GOLD = '#D4A843';
const WHITE = '#FFFFFF';
const LIGHT_BG = '#F8F9FA';

type CardSize = 'post' | 'story';

interface CardData {
  breed: string;
  petType: string;
  color?: string;
  coatAnalysis: string;
  combo: ProductCombo;
  photoDataUrl?: string | null; // data:image/jpeg;base64,...
}

const SIZES: Record<CardSize, { w: number; h: number }> = {
  post: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 },
};

/** Load an image from a URL and return an HTMLImageElement */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}

/** Draw rounded rectangle */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Word-wrap text and return lines */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const char of text) {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Generate a share card as a Blob.
 */
export async function generateShareCard(
  data: CardData,
  size: CardSize = 'post',
): Promise<Blob> {
  const { w, h } = SIZES[size];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, w, h);

  // ── Top bar (navy) ──
  const topBarH = 120;
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, w, topBarH);

  // Logo
  try {
    const logo = await loadImage('/logo.png');
    const logoH = 50;
    const logoW = (logo.width / logo.height) * logoH;
    ctx.drawImage(logo, 40, (topBarH - logoH) / 2, logoW, logoH);
  } catch {
    // Draw text fallback
    ctx.fillStyle = WHITE;
    ctx.font = `bold 32px ${FONT}`;
    ctx.fillText('Davis', 40, topBarH / 2 + 12);
  }

  ctx.fillStyle = WHITE;
  ctx.font = `24px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('AI 寵物洗護分析報告', w - 40, topBarH / 2 + 8);
  ctx.textAlign = 'left';

  let y = topBarH + 40;

  // ── Pet photo ──
  if (data.photoDataUrl) {
    try {
      const photo = await loadImage(data.photoDataUrl);
      const photoW = w * 0.6;
      const photoH = photoW; // square crop
      const photoX = (w - photoW) / 2;

      // Gold border
      ctx.save();
      roundRect(ctx, photoX - 4, y - 4, photoW + 8, photoH + 8, 24);
      ctx.fillStyle = GOLD;
      ctx.fill();

      // Photo clipped with rounded corners
      roundRect(ctx, photoX, y, photoW, photoH, 20);
      ctx.clip();

      // Center-crop the photo
      const srcAspect = photo.width / photo.height;
      let sx = 0, sy = 0, sw = photo.width, sh = photo.height;
      if (srcAspect > 1) {
        sw = photo.height;
        sx = (photo.width - sw) / 2;
      } else {
        sh = photo.width;
        sy = (photo.height - sh) / 2;
      }
      ctx.drawImage(photo, sx, sy, sw, sh, photoX, y, photoW, photoH);
      ctx.restore();

      // Shadow effect
      ctx.save();
      const gradient = ctx.createLinearGradient(0, y + photoH - 30, 0, y + photoH + 20);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.05)');
      ctx.fillStyle = gradient;
      ctx.fillRect(photoX, y + photoH - 30, photoW, 50);
      ctx.restore();

      y += photoH + 30;
    } catch {
      // Skip photo if loading fails
    }
  }

  // ── Breed info ──
  ctx.fillStyle = NAVY;
  ctx.font = `bold 32px ${FONT}`;
  ctx.textAlign = 'center';
  const breedLine = [data.breed, data.petType, data.color].filter(Boolean).join(' . ');
  ctx.fillText(breedLine, w / 2, y + 10);
  y += 20;

  // Coat analysis
  ctx.font = `22px ${FONT}`;
  ctx.fillStyle = '#666666';
  const analysisLines = wrapText(ctx, data.coatAnalysis, w - 120);
  for (const line of analysisLines.slice(0, 2)) {
    y += 30;
    ctx.fillText(line, w / 2, y);
  }
  y += 30;

  // ── Recommended combo ──
  // Gold divider
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, y);
  ctx.lineTo(w - 60, y);
  ctx.stroke();
  y += 15;

  ctx.fillStyle = NAVY;
  ctx.font = `bold 28px ${FONT}`;
  ctx.fillText('推薦洗護方案', w / 2, y + 10);
  y += 15;

  ctx.fillStyle = GOLD;
  ctx.font = `22px ${FONT}`;
  ctx.fillText(data.combo.name, w / 2, y + 10);
  y += 30;

  ctx.textAlign = 'left';

  // Steps
  const stepPad = 50;
  const stepW = w - stepPad * 2;
  for (const step of data.combo.steps) {
    const stepH = 72;
    // Step background
    roundRect(ctx, stepPad, y, stepW, stepH, 12);
    ctx.fillStyle = LIGHT_BG;
    ctx.fill();

    // Step number circle
    const circleR = 18;
    const circleX = stepPad + 30;
    const circleY = y + stepH / 2;
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
    ctx.fillStyle = GOLD;
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.font = `bold 20px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(step.step), circleX, circleY + 7);

    // Role label
    ctx.textAlign = 'left';
    ctx.fillStyle = BLUE;
    ctx.font = `18px ${FONT}`;
    ctx.fillText(step.role, stepPad + 60, y + 28);

    // Product name
    const product = PRODUCTS[step.product_key];
    ctx.fillStyle = NAVY;
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillText(product?.name_zh ?? step.product_key, stepPad + 60, y + 56);

    y += stepH + 10;
  }

  // ── Tips ──
  if (data.combo.tips) {
    y += 5;
    const tipPad = 50;
    const tipW = w - tipPad * 2;
    const tipH = 56;
    roundRect(ctx, tipPad, y, tipW, tipH, 10);
    ctx.fillStyle = '#FFF9E6';
    ctx.fill();
    ctx.fillStyle = '#8B7000';
    ctx.font = `20px ${FONT}`;
    const tipText = `💡 ${data.combo.tips}`;
    const tipLines = wrapText(ctx, tipText, tipW - 30);
    ctx.fillText(tipLines[0], tipPad + 15, y + 34);
    y += tipH + 10;
  }

  // ── Bottom bar ──
  const bottomH = size === 'story' ? Math.max(h - y - 10, 200) : Math.max(h - y - 10, 160);
  const bottomY = h - bottomH;
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, bottomY, w, bottomH);

  let by = bottomY + 35;
  ctx.textAlign = 'center';

  ctx.fillStyle = WHITE;
  ctx.font = `22px ${FONT}`;
  ctx.fillText('🌐  davistaiwan.com', w / 2, by);
  by += 34;
  ctx.fillText('💬  LINE @davistaiwan', w / 2, by);
  by += 50;

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `20px ${FONT}`;
  ctx.fillText('自己也想試試？', w / 2, by);
  by += 32;

  ctx.fillStyle = GOLD;
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText('davistaiwan.netlify.app', w / 2, by);

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      0.92,
    );
  });
}

/**
 * Compress a photo data URL to a smaller base64 for sharing storage.
 * Target: <200KB base64 string.
 */
export function compressPhotoForShare(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 400;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('No canvas ctx')); return; }
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.7;
      let result = canvas.toDataURL('image/jpeg', quality);
      while (result.length > 270_000 && quality > 0.3) {
        quality -= 0.1;
        result = canvas.toDataURL('image/jpeg', quality);
      }
      resolve(result);
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = dataUrl;
  });
}

/**
 * Download a blob as a file.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Share a blob via navigator.share if supported, otherwise download.
 */
export async function shareOrDownload(blob: Blob, filename: string, title: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/jpeg' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title, files: [file] });
      return 'shared';
    } catch {
      // User cancelled or error — fall through to download
    }
  }

  downloadBlob(blob, filename);
  return 'downloaded';
}
