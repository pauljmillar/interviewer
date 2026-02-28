import { NextRequest, NextResponse } from 'next/server';
import {
  MAX_FILE_BYTES,
  MAX_URL_RESPONSE_BYTES,
  URL_FETCH_TIMEOUT_MS,
} from '@/lib/constants/jdExtract';
import { extractFromHtmlBuffer } from '@/lib/jd/extractFromHtml';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function getFileType(file: File): 'txt' | 'pdf' | 'docx' | null {
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  if (name.endsWith('.txt') || type === 'text/plain') return 'txt';
  if (name.endsWith('.pdf') || type === 'application/pdf') return 'pdf';
  if (name.endsWith('.docx') || type === DOCX_MIME) return 'docx';
  return null;
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const raw = formData.get('file');
      if (!raw || !(raw instanceof File)) {
        return NextResponse.json(
          { error: 'Missing file. Send a file in the "file" field.' },
          { status: 400 }
        );
      }
      const f = raw;
      if (f.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: 'File is too large. Maximum size is 10 MB.' },
          { status: 413 }
        );
      }
      const kind = getFileType(f);
      if (!kind) {
        return NextResponse.json(
          { error: 'Unsupported file type. Use .txt, .pdf, or .docx.' },
          { status: 415 }
        );
      }
      const buffer = Buffer.from(await f.arrayBuffer());
      let text: string;
      if (kind === 'txt') {
        text = buffer.toString('utf-8').trim();
      } else if (kind === 'pdf') {
        const { extractFromPdfBuffer } = await import('@/lib/jd/extractFromPdf');
        text = await extractFromPdfBuffer(buffer);
      } else {
        const { extractFromDocxBuffer } = await import('@/lib/jd/extractFromDocx');
        text = await extractFromDocxBuffer(buffer);
      }
      if (!text) {
        return NextResponse.json(
          { error: 'No text could be extracted from the file.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ text });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid JSON body.' },
        { status: 400 }
      );
    }

    const type = body.type;
    if (type === 'text') {
      const content = body.content;
      if (typeof content !== 'string') {
        return NextResponse.json(
          { error: 'For type "text", "content" must be a string.' },
          { status: 400 }
        );
      }
      const text = content.trim();
      if (!text) {
        return NextResponse.json(
          { error: 'Content is empty.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ text });
    }

    if (type === 'url') {
      const url = body.url;
      if (typeof url !== 'string' || !url.trim()) {
        return NextResponse.json(
          { error: 'For type "url", "url" must be a non-empty string.' },
          { status: 400 }
        );
      }
      const urlStr = url.trim();
      if (!isHttpUrl(urlStr)) {
        return NextResponse.json(
          { error: 'URL must be http or https.' },
          { status: 400 }
        );
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(urlStr, {
          signal: controller.signal,
          headers: { 'User-Agent': 'CandiceAI-JD-Extract/1.0' },
        });
      } catch (err) {
        clearTimeout(timeoutId);
        const msg = err instanceof Error ? err.message : 'Fetch failed';
        return NextResponse.json(
          { error: `Could not fetch URL: ${msg}` },
          { status: 502 }
        );
      }
      clearTimeout(timeoutId);

      if (!res.ok) {
        return NextResponse.json(
          { error: `URL returned ${res.status}.` },
          { status: 502 }
        );
      }

      const contentLength = res.headers.get('content-length');
      if (contentLength !== null) {
        const len = parseInt(contentLength, 10);
        if (!Number.isNaN(len) && len > MAX_URL_RESPONSE_BYTES) {
          return NextResponse.json(
            { error: 'URL response is too large. Maximum is 5 MB.' },
            { status: 413 }
          );
        }
      }

      const arrayBuffer = await res.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_URL_RESPONSE_BYTES) {
        return NextResponse.json(
          { error: 'URL response is too large. Maximum is 5 MB.' },
          { status: 413 }
        );
      }
      const buffer = Buffer.from(arrayBuffer);
      const ct = (res.headers.get('content-type') ?? '').toLowerCase();

      let text: string;
      if (ct.includes('text/html')) {
        text = await extractFromHtmlBuffer(buffer, ct);
      } else if (ct.includes('application/pdf') || (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44)) {
        const { extractFromPdfBuffer } = await import('@/lib/jd/extractFromPdf');
        text = await extractFromPdfBuffer(buffer);
      } else if (ct.includes(DOCX_MIME) || (buffer[0] === 0x50 && buffer[1] === 0x4b)) {
        const { extractFromDocxBuffer } = await import('@/lib/jd/extractFromDocx');
        text = await extractFromDocxBuffer(buffer);
      } else if (ct.includes('text/plain')) {
        text = buffer.toString('utf-8').trim();
      } else {
        text = await extractFromHtmlBuffer(buffer, ct);
      }
      if (!text) {
        return NextResponse.json(
          { error: 'No text could be extracted from the URL.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ text });
    }

    return NextResponse.json(
      { error: 'Body must have type "text", "url", or send multipart/form-data with a file.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('POST /api/jd/extract error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
