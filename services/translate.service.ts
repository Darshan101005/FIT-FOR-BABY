/**
 * Translation service (English -> Tamil) using Sarvam AI's playground endpoint.
 *
 * Best-effort helper for the admin questionnaire editor. If the request fails
 * (network / CORS / rate limit), callers should let the admin type Tamil
 * manually. Never throws to the UI without a clear message.
 */

import { Platform } from 'react-native';

const SARVAM_URL = 'https://www.sarvam.ai/api/playground/translation';
const isWeb = Platform.OS === 'web';

export interface TranslateResult {
  success: boolean;
  text?: string;
  error?: string;
}

// On web the browser enforces CORS (native/Python do not). We try:
//  1) our own same-origin serverless proxy (/api/translate on Vercel) - most reliable
//  2) public CORS proxies as fallback (e.g. Firebase Hosting has no /api)
//  3) a direct call last
const buildWebEndpoints = (): string[] => [
  '/api/translate',
  `https://corsproxy.io/?url=${encodeURIComponent(SARVAM_URL)}`,
  `https://proxy.cors.sh/${SARVAM_URL}`,
  `https://api.allorigins.win/raw?url=${encodeURIComponent(SARVAM_URL)}`,
  SARVAM_URL, // last resort (works if Sarvam ever allows CORS)
];

const extractText = (data: any): string | undefined => {
  if (!data) return undefined;
  return (
    data.translated_text ||
    data.output ||
    data.translation ||
    (Array.isArray(data.translations) ? data.translations[0] : undefined) ||
    data.result
  );
};

/**
 * Translate a single English string to Tamil.
 * On web, routes through a CORS proxy (with fallbacks); on native, calls directly.
 */
export async function translateToTamil(input: string, speakerGender: 'Male' | 'Female' = 'Female'): Promise<TranslateResult> {
  const clean = (input || '').trim();
  if (!clean) return { success: false, error: 'Nothing to translate.' };

  const body = JSON.stringify({
    input: clean,
    source_language_code: 'en-IN',
    target_language_code: 'ta-IN',
    model: 'mayura:v1',
    mode: 'formal',
    output_script: 'fully-native',
    numerals_format: 'international',
    speaker_gender: speakerGender,
  });

  const endpoints = isWeb ? buildWebEndpoints() : [SARVAM_URL];
  let lastError = 'Translation failed.';

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'accept': '*/*', 'content-type': 'application/json' },
        body,
      });
      if (!response.ok) { lastError = `Translation failed (${response.status}).`; continue; }

      // Some proxies wrap the JSON as a string; handle both.
      const raw = await response.text();
      let data: any = null;
      try { data = JSON.parse(raw); } catch { data = null; }
      // allorigins-style double-encoding fallback
      if (data && typeof data.contents === 'string') {
        try { data = JSON.parse(data.contents); } catch { /* ignore */ }
      }

      const text = extractText(data);
      if (typeof text === 'string' && text.trim()) {
        return { success: true, text: text.trim() };
      }
      lastError = 'Could not read translation from response.';
    } catch (e: any) {
      lastError = e?.message || 'Translation request failed (network/CORS).';
    }
  }

  return { success: false, error: lastError };
}

/**
 * Translate a list of English strings to Tamil (sequentially to be gentle on
 * the endpoint). Returns an array aligned with the input; failed items fall
 * back to the original English string.
 */
export async function translateListToTamil(inputs: string[], speakerGender: 'Male' | 'Female' = 'Female'): Promise<string[]> {
  const results: string[] = [];
  for (const item of inputs) {
    const r = await translateToTamil(item, speakerGender);
    results.push(r.success && r.text ? r.text : item);
  }
  return results;
}
