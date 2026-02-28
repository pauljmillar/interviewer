import mammoth from 'mammoth';

/** Extract plain text from a .docx buffer. */
export async function extractFromDocxBuffer(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value ?? '';
  return text.trim();
}
