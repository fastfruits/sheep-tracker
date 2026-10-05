/**
 * Color-blind friendly mode. Independent of light/dark, so it lives outside
 * next-themes: a `data-vision="cvd"` attribute on <html>, persisted to
 * localStorage and applied before first paint by `VisionScript`.
 */
export const VISION_STORAGE_KEY = 'sf-vision';
export const VISION_CVD = 'cvd';

/** Runs inline in <head>, so it must stay self-contained (no imports). */
export const visionScript = `try{if(localStorage.getItem(${JSON.stringify(VISION_STORAGE_KEY)})===${JSON.stringify(VISION_CVD)})document.documentElement.dataset.vision=${JSON.stringify(VISION_CVD)}}catch(e){}`;
