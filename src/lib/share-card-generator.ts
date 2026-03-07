import type { ProductCombo } from '@/lib/breed-combos';
import { PRODUCTS } from '@/data/products';

const FONT_ZH = "'PingFang TC', 'Microsoft JhengHei', 'Noto Sans TC', sans-serif";
const FONT_EN = "-apple-system, 'Helvetica Neue', Arial, sans-serif";
const NAVY = '#0B1E3D';
const BLUE = '#1A4A9E';
const GOLD = '#D4A843';
const WHITE = '#FFFFFF';
const LIGHT_BG = '#F8F9FA';
const TIP_BG = '#FDF8EF';
const TIP_COLOR = '#5D4E37';

type CardSize = 'post' | 'story';

interface CardData {
  breed: string;
  petType: string;
  color?: string;
  coatAnalysis: string;
  combo: ProductCombo;
  photoDataUrl?: string | null;
}

const SIZES: Record<CardSize, { w: number; h: number }> = {
  post: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 },
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}

function tryLoadImage(src: string): Promise<HTMLImageElement | null> {
  return loadImage(src).catch(() => null);
}

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

function drawCenterCrop(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number,
) {
  const srcAspect = img.width / img.height;
  const dstAspect = dw / dh;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (srcAspect > dstAspect) {
    sw = img.height * dstAspect;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / dstAspect;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

export async function generateShareCard(
  data: CardData,
  size: CardSize = 'post',
): Promise<Blob> {
  const { w, h } = SIZES[size];
  const isStory = size === 'story';
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Preload images in parallel
  const [logoImg, petPhoto, ...productImgs] = await Promise.all([
    tryLoadImage('/logo.png'),
    data.photoDataUrl ? tryLoadImage(data.photoDataUrl) : Promise.resolve(null),
    ...data.combo.steps.map((step) => {
      const p = PRODUCTS[step.product_key];
      return p?.image_url ? tryLoadImage(p.image_url) : Promise.resolve(null);
    }),
  ]);

  // ── White background ──
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, w, h);

  // ── Header (gradient bar, 100px) ──
  const headerH = 100;
  const headerGrad = ctx.createLinearGradient(0, 0, w, 0);
  headerGrad.addColorStop(0, NAVY);
  headerGrad.addColorStop(1, BLUE);
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, w, headerH);

  // Logo left
  if (logoImg) {
    const logoH = 40;
    const logoW = (logoImg.width / logoImg.height) * logoH;
    ctx.drawImage(logoImg, 40, (headerH - logoH) / 2, logoW, logoH);
  } else {
    ctx.fillStyle = WHITE;
    ctx.font = `bold 30px ${FONT_ZH}`;
    ctx.textAlign = 'left';
    ctx.fillText('DAVIS', 40, headerH / 2 + 10);
  }

  // Title right
  ctx.fillStyle = WHITE;
  ctx.font = `20px ${FONT_ZH}`;
  ctx.textAlign = 'right';
  ctx.fillText('AI 寵物洗護分析', w - 40, headerH / 2 + 7);
  ctx.textAlign = 'left';

  let y = headerH + 30;

  // ── Pet photo ──
  if (petPhoto) {
    const photoW = Math.round(w * 0.75);
    const photoH = isStory ? Math.round(h * 0.35) : photoW;
    const photoX = (w - photoW) / 2;

    // Gold border
    ctx.save();
    roundRect(ctx, photoX - 4, y - 4, photoW + 8, photoH + 8, 24);
    ctx.fillStyle = GOLD;
    ctx.fill();
    ctx.restore();

    // Photo clipped
    ctx.save();
    roundRect(ctx, photoX, y, photoW, photoH, 20);
    ctx.clip();
    drawCenterCrop(ctx, petPhoto, photoX, y, photoW, photoH);
    ctx.restore();

    // Bottom gradient shadow
    ctx.save();
    const shadowGrad = ctx.createLinearGradient(0, y + photoH - 40, 0, y + photoH);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = shadowGrad;
    roundRect(ctx, photoX, y + photoH - 40, photoW, 40, 0);
    ctx.fill();
    ctx.restore();

    y += photoH + 30;
  }

  // ── Breed info ──
  ctx.textAlign = 'center';
  ctx.fillStyle = NAVY;
  ctx.font = `bold 36px ${FONT_ZH}`;
  const breedParts = [data.breed, data.petType, data.color].filter(Boolean);
  ctx.fillText(breedParts.join(' · '), w / 2, y + 10);
  y += 20;

  // Coat analysis
  ctx.font = `18px ${FONT_ZH}`;
  ctx.fillStyle = '#666666';
  const analysisLines = wrapText(ctx, data.coatAnalysis, w - 160);
  for (const line of analysisLines.slice(0, 2)) {
    y += 28;
    ctx.fillText(line, w / 2, y);
  }
  y += 30;

  // ── Decorated divider ──
  const divY = y;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5;
  const divPad = 80;
  const divTextWidth = ctx.measureText('推薦洗護方案').width;

  ctx.fillStyle = GOLD;
  ctx.font = `bold 14px ${FONT_EN}`;
  ctx.fillText('◆', divPad + 10, divY + 5);
  ctx.fillText('◆', w - divPad - 10, divY + 5);

  ctx.beginPath();
  ctx.moveTo(divPad + 24, divY);
  ctx.lineTo(w / 2 - divTextWidth / 2 - 16, divY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w / 2 + divTextWidth / 2 + 16, divY);
  ctx.lineTo(w - divPad - 24, divY);
  ctx.stroke();

  ctx.fillStyle = NAVY;
  ctx.font = `bold 24px ${FONT_ZH}`;
  ctx.fillText('推薦洗護方案', w / 2, divY + 8);
  y = divY + 20;

  // Combo name
  ctx.fillStyle = GOLD;
  ctx.font = `bold 20px ${FONT_ZH}`;
  ctx.fillText(data.combo.name, w / 2, y + 10);
  y += 30;

  ctx.textAlign = 'left';

  // ── Steps ──
  const stepPadX = 60;
  const stepW = w - stepPadX * 2;
  const productImgSize = 64;

  for (let i = 0; i < data.combo.steps.length; i++) {
    const step = data.combo.steps[i];
    const product = PRODUCTS[step.product_key];
    const prodImg = productImgs[i];
    const hasImg = !!prodImg;

    // Step height calculation
    const stepH = 90;
    const bgColor = i % 2 === 0 ? LIGHT_BG : WHITE;

    // Step background
    ctx.save();
    roundRect(ctx, stepPadX, y, stepW, stepH, 12);
    ctx.fillStyle = bgColor;
    ctx.fill();
    // Subtle border
    ctx.strokeStyle = '#E8E8E8';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Step number circle (deep navy bg, gold text)
    const circleR = 18;
    const circleX = stepPadX + 28;
    const circleY = y + stepH / 2;
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
    ctx.fillStyle = NAVY;
    ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.font = `bold 20px ${FONT_EN}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(step.step), circleX, circleY + 7);
    ctx.textAlign = 'left';

    // Text area (after circle, before product image)
    const textX = stepPadX + 60;
    const textMaxW = stepW - 70 - (hasImg ? productImgSize + 20 : 0);

    // Product Chinese name
    ctx.fillStyle = NAVY;
    ctx.font = `bold 22px ${FONT_ZH}`;
    const nameZh = product?.name_zh ?? step.product_key;
    ctx.fillText(nameZh, textX, y + 30);

    // Product English name
    ctx.fillStyle = '#999999';
    ctx.font = `14px ${FONT_EN}`;
    const nameEn = product?.name_en ?? '';
    if (nameEn) {
      const truncEn = ctx.measureText(nameEn).width > textMaxW
        ? nameEn.substring(0, 30) + '...'
        : nameEn;
      ctx.fillText(truncEn, textX, y + 48);
    }

    // Dilution + dwell time
    ctx.fillStyle = GOLD;
    ctx.font = `bold 16px ${FONT_ZH}`;
    const dilution = product?.dilution ?? '';
    const dwell = product?.dwell_time ?? '';
    const infoLine = [
      dilution ? `稀釋 ${dilution}` : '',
      dwell ? `停留 ${dwell}` : '',
    ].filter(Boolean).join(' · ');
    if (infoLine) {
      ctx.fillText(infoLine, textX, y + 72);
    }

    // Product photo (right side)
    if (prodImg) {
      const imgX = stepPadX + stepW - productImgSize - 16;
      const imgY = y + (stepH - productImgSize) / 2;
      ctx.save();
      roundRect(ctx, imgX, imgY, productImgSize, productImgSize, 8);
      ctx.clip();
      drawCenterCrop(ctx, prodImg, imgX, imgY, productImgSize, productImgSize);
      ctx.restore();
    }

    y += stepH + 10;
  }

  // ── Tips ──
  if (data.combo.tips) {
    y += 4;
    const tipPad = 60;
    const tipW = w - tipPad * 2;

    ctx.font = `16px ${FONT_ZH}`;
    const tipTextContent = data.combo.tips;
    const tipLines = wrapText(ctx, tipTextContent, tipW - 50);
    const tipH = Math.max(50, tipLines.length * 24 + 26);

    ctx.save();
    roundRect(ctx, tipPad, y, tipW, tipH, 12);
    ctx.fillStyle = TIP_BG;
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = TIP_COLOR;
    ctx.font = `16px ${FONT_ZH}`;
    let tipTextY = y + 24;
    // Lightbulb icon
    ctx.fillText('💡', tipPad + 14, tipTextY);
    for (const tl of tipLines) {
      ctx.fillText(tl, tipPad + 40, tipTextY);
      tipTextY += 24;
    }
    y += tipH + 10;
  }

  // ── Footer ──
  const footerH = isStory ? Math.max(h - y - 10, 220) : Math.max(h - y - 10, 160);
  const footerY = h - footerH;

  // Fill any gap between content and footer with white
  if (footerY > y) {
    ctx.fillStyle = WHITE;
    ctx.fillRect(0, y, w, footerY - y);
  }

  ctx.fillStyle = NAVY;
  ctx.fillRect(0, footerY, w, footerH);

  ctx.textAlign = 'center';
  let fy = footerY + 36;

  ctx.fillStyle = WHITE;
  ctx.font = `22px ${FONT_ZH}`;
  ctx.fillText('🌐  davistaiwan.com', w / 2, fy);
  fy += 36;
  ctx.fillText('💬  LINE @davistaiwan', w / 2, fy);
  fy += 50;

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `16px ${FONT_ZH}`;
  ctx.fillText('自己也想試試？', w / 2, fy);
  fy += 32;

  ctx.fillStyle = GOLD;
  ctx.font = `bold 20px ${FONT_ZH}`;
  ctx.fillText('davistaiwan.netlify.app', w / 2, fy);

  ctx.textAlign = 'left';

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

export async function shareOrDownload(blob: Blob, filename: string, title: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/jpeg' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title, files: [file] });
      return 'shared';
    } catch {
      // User cancelled or error
    }
  }

  downloadBlob(blob, filename);
  return 'downloaded';
}
