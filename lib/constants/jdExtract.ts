/** Max size for uploaded file (bytes). Reject with 413 if exceeded. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Max size for URL response body (bytes). Reject with 413 if exceeded. */
export const MAX_URL_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Fetch timeout for URL requests (ms). */
export const URL_FETCH_TIMEOUT_MS = 15_000;

/**
 * Max characters of JD text to send to the analyze step (avoids exceeding
 * model context when HTML extraction or pasted content is very large).
 * ~4 chars/token → ~4500 tokens for JD, leaving room for prompt + completion.
 */
export const MAX_JD_CHARS_FOR_ANALYSIS = 18_000;
