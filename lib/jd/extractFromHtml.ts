import { load } from 'cheerio';

/** Selectors for likely page chrome we want to drop so we don't send nav/footer/ads to the LLM. */
const NOISE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'nav',
  'header',
  'footer',
  'aside',
  '[role="navigation"]',
  '[role="banner"]',
  '.nav',
  '.navbar',
  '.navigation',
  '.header',
  '.footer',
  '.sidebar',
  '.ads',
  '.advertisement',
  '.cookie',
  '.banner',
  '[aria-hidden="true"]',
];

/**
 * Extract main text from an HTML buffer. Prefers main/article content and strips
 * nav, footer, ads, etc., to avoid sending huge pages and blowing token limits.
 */
export async function extractFromHtmlBuffer(
  buffer: Buffer,
  _contentType?: string
): Promise<string> {
  const html = buffer.toString('utf-8');
  const $ = load(html);

  // Clone so we don't mutate the original
  const $body = $('body');
  if ($body.length === 0) return $.text().replace(/\s+/g, ' ').trim();

  // Prefer main content containers (job boards often use main/article)
  const $main =
    $('main').length > 0
      ? $('main').first()
      : $('article').length > 0
        ? $('article').first()
        : $('[role="main"]').length > 0
          ? $('[role="main"]').first()
          : $body;

  const $root = $main.length ? $main : $body;

  // Remove noise elements before taking text
  $root.find(NOISE_SELECTORS.join(',')).remove();

  let text = $root.text();
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}
