import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';

export interface DomToPngOptions {
  backgroundColor?: string | null;
  pixelRatio?: number;
  scale?: number;
}

/**
 * Robust DOM-to-PNG image generator that handles cross-origin Google Fonts and CSS rules safely.
 * Uses html2canvas as primary engine to avoid "Not allowed to access cross-origin stylesheet" and font errors,
 * with html-to-image (with skipFonts & disabled font inlining) as fallback.
 */
export async function captureElementToPng(
  element: HTMLElement,
  options: DomToPngOptions = {}
): Promise<string> {
  const scale = options.scale || options.pixelRatio || 2;
  const bgColor = options.backgroundColor === null ? null : (options.backgroundColor || '#ffffff');

  try {
    // Primary engine: html2canvas with CORS and accurate scaling
    const canvas = await html2canvas(element, {
      scale: scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: bgColor,
      logging: false,
      ignoreElements: (element) => element.classList.contains('no-export'),
      onclone: (clonedDoc) => {
        // Ensure clean layout in cloned tree if necessary
        const clonedEl = clonedDoc.getElementById(element.id);
        if (clonedEl) {
          clonedEl.style.transform = 'none';
        }
      },
    });

    return canvas.toDataURL('image/png', 1.0);
  } catch (canvasErr) {
    console.warn('html2canvas failed, attempting fallback to html-to-image:', canvasErr);
    
    // Fallback: html-to-image with skipFonts and empty fontEmbedCSS to avoid stylesheet inspection errors
    const dataUrl = await toPng(element, {
      cacheBust: false,
      backgroundColor: bgColor || undefined,
      pixelRatio: scale,
      skipFonts: true,
      fontEmbedCSS: '',
      filter: (node) => {
        if (node instanceof HTMLElement && node.classList.contains('no-export')) {
          return false;
        }
        return true;
      },
    });

    return dataUrl;
  }
}
