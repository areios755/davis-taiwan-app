import type { ProductCombo } from '@/lib/breed-combos';
import { PRODUCTS } from '@/data/products';
import { getProductImageSrc } from '@/lib/product-image';

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
      const src = p ? getProductImageSrc(p) : null;
      return src ? tryLoadImage(src) : Promise.resolve(null);
    }),
  ]);

  // ── Adaptive sizing ──
  // Scale fonts and spacing based on card size
  const s = isStory ? 1.0 : 0.85; // scale factor for post (smaller to fit)
  const headerH = 100;
  const footerH = 160;
  const stepH = Math.round(80 * s);
  const stepGap = Math.round(8 * s);
  const prodImgSize = Math.round(56 * s);

  // Calculate non-photo content height
  const breedInfoH = 80; // breed + coat analysis
  const dividerH = 50;   // divider + combo name
  const stepsH = data.combo.steps.length * (stepH + stepGap);
  const tipsH = data.combo.tips ? 60 : 0;
  const contentH = headerH + 20 + breedInfoH + dividerH + stepsH + tipsH + 20 + footerH;

  // Photo gets remaining space (adaptive)
  const availableForPhoto = h - contentH;
  const hasPhoto = !!petPhoto;
  const photoH = hasPhoto ? Math.max(200, Math.min(availableForPhoto, isStory ? h * 0.4 : h * 0.35)) : 0;

  // ── White background ──
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, w, h);

  // ── Header (gradient bar) ──
  const headerGrad = ctx.createLinearGradient(0, 0, w, 0);
  headerGrad.addColorStop(0, NAVY);
  headerGrad.addColorStop(1, BLUE);
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, w, headerH);

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

  ctx.fillStyle = WHITE;
  ctx.font = `20px ${FONT_ZH}`;
  ctx.textAlign = 'right';
  ctx.fillText('AI 寵物洗護分析', w - 40, headerH / 2 + 7);
  ctx.textAlign = 'left';

  let y = headerH + 20;

  // ── Pet photo ──
  if (petPhoto && photoH > 0) {
    const photoW = Math.round(w * (isStory ? 0.80 : 0.65));
    const photoX = (w - photoW) / 2;

    // Gold border
    ctx.save();
    roundRect(ctx, photoX - 3, y - 3, photoW + 6, photoH + 6, 20);
    ctx.fillStyle = GOLD;
    ctx.fill();
    ctx.restore();

    // Photo clipped
    ctx.save();
    roundRect(ctx, photoX, y, photoW, photoH, 16);
    ctx.clip();
    drawCenterCrop(ctx, petPhoto, photoX, y, photoW, photoH);
    ctx.restore();

    y += photoH + 20;
  }

  // ── Breed info ──
  ctx.textAlign = 'center';
  ctx.fillStyle = NAVY;
  ctx.font = `bold ${Math.round(32 * s)}px ${FONT_ZH}`;
  const breedParts = [data.breed, data.petType, data.color].filter(Boolean);
  ctx.fillText(breedParts.join(' · '), w / 2, y + 10);
  y += 16;

  ctx.font = `${Math.round(16 * s)}px ${FONT_ZH}`;
  ctx.fillStyle = '#666666';
  const analysisLines = wrapText(ctx, data.coatAnalysis, w - 160);
  for (const line of analysisLines.slice(0, 2)) {
    y += Math.round(24 * s);
    ctx.fillText(line, w / 2, y);
  }
  y += Math.round(24 * s);

  // ── Decorated divider ──
  const divY = y;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5;
  const divPad = 80;

  ctx.font = `bold ${Math.round(22 * s)}px ${FONT_ZH}`;
  const divTextW = ctx.measureText('推薦洗護方案').width;

  ctx.fillStyle = GOLD;
  ctx.font = `bold 12px ${FONT_EN}`;
  ctx.fillText('◆', divPad + 10, divY + 4);
  ctx.fillText('◆', w - divPad - 10, divY + 4);

  ctx.beginPath();
  ctx.moveTo(divPad + 24, divY);
  ctx.lineTo(w / 2 - divTextW / 2 - 14, divY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w / 2 + divTextW / 2 + 14, divY);
  ctx.lineTo(w - divPad - 24, divY);
  ctx.stroke();

  ctx.fillStyle = NAVY;
  ctx.font = `bold ${Math.round(22 * s)}px ${FONT_ZH}`;
  ctx.fillText('推薦洗護方案', w / 2, divY + 7);
  y = divY + 18;

  ctx.fillStyle = GOLD;
  ctx.font = `bold ${Math.round(18 * s)}px ${FONT_ZH}`;
  ctx.fillText(data.combo.name, w / 2, y + 8);
  y += 24;

  ctx.textAlign = 'left';

  // ── Steps ──
  const stepPadX = 50;
  const stepW = w - stepPadX * 2;
  const zhSize = Math.round(20 * s);
  const enSize = Math.round(13 * s);
  const infoSize = Math.round(14 * s);

  for (let i = 0; i < data.combo.steps.length; i++) {
    const step = data.combo.steps[i];
    const product = PRODUCTS[step.product_key];
    const prodImg = productImgs[i];
    const hasImg = !!prodImg;
    const bgColor = i % 2 === 0 ? LIGHT_BG : WHITE;

    ctx.save();
    roundRect(ctx, stepPadX, y, stepW, stepH, 10);
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.strokeStyle = '#E8E8E8';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Step number circle
    const circleR = Math.round(16 * s);
    const circleX = stepPadX + 24;
    const circleY = y + stepH / 2;
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
    ctx.fillStyle = NAVY;
    ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.font = `bold ${Math.round(18 * s)}px ${FONT_EN}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(step.step), circleX, circleY + 6);
    ctx.textAlign = 'left';

    const textX = stepPadX + 52;

    // Product Chinese name
    ctx.fillStyle = NAVY;
    ctx.font = `bold ${zhSize}px ${FONT_ZH}`;
    ctx.fillText(product?.name_zh ?? step.product_key, textX, y + Math.round(24 * s));

    // Product English name
    const nameEn = product?.name_en ?? '';
    if (nameEn) {
      ctx.fillStyle = '#999999';
      ctx.font = `${enSize}px ${FONT_EN}`;
      ctx.fillText(nameEn, textX, y + Math.round(42 * s));
    }

    // Dilution + dwell time
    const dilution = product?.dilution ?? '';
    const dwell = product?.dwell_time ?? '';
    const infoLine = [
      dilution ? `稀釋 ${dilution}` : '',
      dwell ? `停留 ${dwell}` : '',
    ].filter(Boolean).join(' · ');
    if (infoLine) {
      ctx.fillStyle = GOLD;
      ctx.font = `bold ${infoSize}px ${FONT_ZH}`;
      ctx.fillText(infoLine, textX, y + Math.round(62 * s));
    }

    // Product photo (right side)
    if (hasImg && prodImg) {
      const imgX = stepPadX + stepW - prodImgSize - 12;
      const imgY = y + (stepH - prodImgSize) / 2;
      ctx.save();
      roundRect(ctx, imgX, imgY, prodImgSize, prodImgSize, 6);
      ctx.clip();
      drawCenterCrop(ctx, prodImg, imgX, imgY, prodImgSize, prodImgSize);
      ctx.restore();
    }

    y += stepH + stepGap;
  }

  // ── Tips ──
  if (data.combo.tips) {
    y += 4;
    const tipPad = 50;
    const tipW = w - tipPad * 2;
    const tipFontSize = Math.round(14 * s);

    ctx.font = `${tipFontSize}px ${FONT_ZH}`;
    const tipLines = wrapText(ctx, data.combo.tips, tipW - 44);
    const tipBoxH = Math.max(40, tipLines.length * (tipFontSize + 6) + 20);

    ctx.save();
    roundRect(ctx, tipPad, y, tipW, tipBoxH, 10);
    ctx.fillStyle = TIP_BG;
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = TIP_COLOR;
    ctx.font = `${tipFontSize}px ${FONT_ZH}`;
    let tipTextY = y + tipFontSize + 8;
    ctx.fillText('💡', tipPad + 12, tipTextY);
    for (const tl of tipLines) {
      ctx.fillText(tl, tipPad + 36, tipTextY);
      tipTextY += tipFontSize + 6;
    }
    y += tipBoxH + 8;
  }

  // ── Fill gap + Footer ──
  // Footer is always at the bottom, fixed height
  const footerY = h - footerH;

  // Fill gap between content and footer
  if (y < footerY) {
    // Add brand slogan in the gap area
    const gapH = footerY - y;
    ctx.fillStyle = WHITE;
    ctx.fillRect(0, y, w, gapH);

    if (gapH > 60) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#CCCCCC';
      ctx.font = `italic 16px ${FONT_EN}`;
      ctx.fillText('Helping pets stay clean since 1982', w / 2, y + gapH / 2 + 6);
      ctx.textAlign = 'left';
    }
  }

  // Footer background
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, footerY, w, footerH);

  ctx.textAlign = 'center';
  let fy = footerY + 30;

  ctx.fillStyle = WHITE;
  ctx.font = `20px ${FONT_ZH}`;
  ctx.fillText('🌐  davistaiwan.com', w / 2, fy);
  fy += 32;
  ctx.fillText('💬  LINE @davistaiwan', w / 2, fy);
  fy += 42;

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `16px ${FONT_ZH}`;
  ctx.fillText('自己也想試試？', w / 2, fy);
  fy += 28;

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
