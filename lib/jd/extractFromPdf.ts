import { PDFParse } from 'pdf-parse';

/** Extract plain text from a PDF buffer. */
export async function extractFromPdfBuffer(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const text = result?.text ?? '';
    return text.trim();
  } finally {
    await parser.destroy();
  }
}
