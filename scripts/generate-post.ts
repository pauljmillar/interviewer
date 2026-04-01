#!/usr/bin/env npx tsx
/**
 * generate-post.ts
 *
 * Claude-orchestrated content pipeline for Screen AI — powered by OpenAI.
 *
 * Steps (all automated):
 *   1. Research a trending AI-hiring topic via live web search
 *   2. Check existing posts to avoid duplicates
 *   3. Write a full article in Markdown
 *   4. Generate & upload a geometric art thumbnail
 *   5. Create the draft blog post via the API
 *
 * Usage:
 *   npm run generate-post
 *   (OPENAI_API_KEY is read automatically from .env.local)
 *
 * Optional env overrides:
 *   BLOG_BASE_URL  — defaults to http://localhost:3000
 *   BLOG_API_KEY   — defaults to the dev test token
 */

import OpenAI from "openai";
import { readFileSync } from "fs";
import { join } from "path";

// ── Load .env.local automatically ────────────────────────────────────────────
try {
  const lines = readFileSync(join(process.cwd(), ".env.local"), "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env.local not found — rely on shell environment
}

// ── Config ────────────────────────────────────────────────────────────────────

if (!process.env.OPENAI_API_KEY) {
  console.error("Error: OPENAI_API_KEY not found in environment or .env.local");
  process.exit(1);
}

const BLOG_BASE = process.env.BLOG_BASE_URL ?? "http://localhost:3000";
const BLOG_API = `${BLOG_BASE}/api/v1`;
const BLOG_TOKEN =
  process.env.BLOG_API_KEY ??
  "cai_jNPx5vg3dZdeGSOG4Ba0-ITUGpZFxmlf625xrYU62yw";

const ai = new OpenAI();

// ── Blog API helpers ──────────────────────────────────────────────────────────

async function blogFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { headers: extra, ...rest } = init;
  return fetch(`${BLOG_API}${path}`, {
    ...rest,
    headers: { Authorization: `Bearer ${BLOG_TOKEN}`, ...(extra ?? {}) },
  });
}

// ── Tool implementations ──────────────────────────────────────────────────────

/** Fetches published post count + titles. Returns a string for the model AND
 *  exposes postCount as a module-level variable for use inside generateAndUploadThumbnail. */
let _postCount = 0;

async function listTopics(): Promise<string> {
  const res = await blogFetch("/topics");
  if (!res.ok) return `Error: ${res.status} ${await res.text()}`;
  const data = (await res.json()) as { total: number; posts: { slug: string; title: string }[] };
  _postCount = data.total;
  if (data.posts.length === 0) return "No existing posts yet — all topics are open. total=0";
  return (
    `Total published posts so far: ${data.total}\n` +
    "Existing post titles (do not duplicate):\n" +
    data.posts.map((t) => `- ${t.title}`).join("\n")
  );
}

async function generateAndUploadThumbnail(input: { seed?: number }): Promise<string> {
  // ── Auto-determine type and palette from post count ────────────────────────
  // GIF every 4th post (post #0, 4, 8 …); PNG for the other three
  const type: "gif" | "png" = _postCount % 4 === 0 ? "gif" : "png";
  // Cycle through all 6 palette colours: 0=indigo 1=ocean 2=teal 3=red 4=amber 5=cream
  const bgIndex = _postCount % 6;

  console.log(
    `    Generating ${type.toUpperCase()} (seed=${input.seed ?? "random"}, bgIndex=${bgIndex}, post #${_postCount + 1})…`
  );

  const artRes = await blogFetch("/generate-art", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, seed: input.seed, bgIndex }),
  });
  if (!artRes.ok) {
    return `Art generation failed (${artRes.status}): ${await artRes.text()}`;
  }

  const mimeType = type === "gif" ? "image/gif" : "image/png";
  const fileName = type === "gif" ? "thumbnail.gif" : "thumbnail.png";
  console.log(`    ${type.toUpperCase()} generated — uploading…`);
  const artBuffer = await artRes.arrayBuffer();

  const form = new FormData();
  form.append("file", new Blob([artBuffer], { type: mimeType }), fileName);

  const uploadRes = await blogFetch("/images", {
    method: "POST",
    body: form as unknown as BodyInit,
  });
  if (!uploadRes.ok) {
    return `Upload failed (${uploadRes.status}): ${await uploadRes.text()}`;
  }

  const { url } = (await uploadRes.json()) as { url: string };
  console.log(`    Uploaded → ${url}`);
  return url;
}

async function createPost(input: {
  title: string;
  body_markdown: string;
  excerpt?: string;
  tags?: string[];
  cover_image_url?: string;
  source_urls?: string[];
  status?: "draft" | "published";
}): Promise<string> {
  const res = await blogFetch("/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok) return `Failed (${res.status}): ${JSON.stringify(body)}`;
  // Return id so publish_post can reference the post by slug
  return JSON.stringify({
    ok: true,
    slug: body.slug,
    status: body.status,
    title: body.title,
    cover_image_url: body.coverImageUrl ?? null,
  });
}

async function publishPost(input: {
  post_slug: string;
  qa_summary: string;
}): Promise<string> {
  console.log(`    Publishing "${input.post_slug}"…`);
  const res = await blogFetch(`/posts/${input.post_slug}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "published" }),
  });
  const body = await res.json();
  if (!res.ok) return `Failed to publish (${res.status}): ${JSON.stringify(body)}`;
  return JSON.stringify({ ok: true, slug: body.slug, status: body.status });
}

async function fetchPageImages(input: { url: string }): Promise<string> {
  try {
    const res = await fetch(input.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ScreenAIBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return `Failed to fetch (${res.status}): ${input.url}`;
    const html = await res.text();

    const images: string[] = [];

    // og:image — usually the article's primary illustration
    for (const m of [
      ...html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi),
      ...html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi),
    ]) {
      const u = m[1];
      if (u && !images.includes(u)) images.push(u);
    }

    // <img src> with image file extensions
    for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
      if (images.length >= 5) break;
      const src = m[1];
      if (!src || src.startsWith("data:")) continue;
      if (!/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(src)) continue;
      try {
        const abs = new URL(src, input.url).href;
        if (!images.includes(abs)) images.push(abs);
      } catch { /* skip malformed */ }
    }

    if (images.length === 0) return `No images found on ${input.url}`;
    return (
      `Found ${images.length} image URL(s) on ${input.url}:\n` +
      images.slice(0, 5).map((u, i) => `${i + 1}. ${u}`).join("\n")
    );
  } catch (err) {
    return `Error fetching ${input.url}: ${err instanceof Error ? err.message : "unknown error"}`;
  }
}

// ── Tool dispatch ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  switch (name) {
    case "list_topics":                       return listTopics();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    case "generate_and_upload_thumbnail":     return generateAndUploadThumbnail(args as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    case "create_post":                       return createPost(args as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    case "publish_post":                      return publishPost(args as any);
    case "fetch_page_images":                 return fetchPageImages(args as { url: string });
    default:                                  return `Unknown tool: ${name}`;
  }
}

// ── Tool definitions ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TOOLS: any[] = [
  // Built-in: OpenAI handles search server-side, no client execution needed
  { type: "web_search_preview" },

  {
    type: "function",
    name: "list_topics",
    description:
      "Returns all existing published blog post titles. " +
      "Call this after researching so you can avoid duplicating a topic that already exists.",
    parameters: { type: "object", properties: {}, required: [] },
  },

  {
    type: "function",
    name: "generate_and_upload_thumbnail",
    description:
      "Generates an art thumbnail (PNG or GIF — chosen automatically based on post count) " +
      "and uploads it to the blog CDN. Background colour is also chosen automatically. " +
      "Returns the cover_image_url string to pass to create_post. " +
      "Call this BEFORE create_post.",
    parameters: {
      type: "object",
      properties: {
        seed: {
          type: "number",
          description:
            "32-bit unsigned integer seed for the art generator. " +
            "Pick any meaningful number — same seed always produces the same image.",
        },
      },
      required: [],
    },
  },

  {
    type: "function",
    name: "create_post",
    description:
      "Creates the blog post as a draft. Call AFTER generate_and_upload_thumbnail. " +
      "The returned slug is needed for publish_post.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Article headline, plain text, 55–70 chars, specific and benefit-driven.",
        },
        body_markdown: {
          type: "string",
          description:
            "Full article body in GitHub-flavoured Markdown, 750–1000 words. " +
            "HEADING SYNTAX: use '## Section Title' (two hashes + space) for every major section — " +
            "do NOT use bold (**text**) as a substitute for headings. " +
            "PARAGRAPH SPACING: separate every paragraph with a blank line (two consecutive newlines). " +
            "Structure: opening hook paragraph → 3–4 ## sections → actionable conclusion paragraph. " +
            "Use **bold** only for key terms within body text. " +
            "Cite at least two real statistics from research as inline hyperlinks [anchor](url).",
        },
        excerpt: {
          type: "string",
          description: "One-sentence summary ≤160 chars for listing pages and meta description.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: 'Lowercase kebab-case tag slugs, e.g. ["ai", "hiring", "automation"].',
        },
        cover_image_url: {
          type: "string",
          description: "The URL returned by generate_and_upload_thumbnail.",
        },
        source_urls: {
          type: "array",
          items: { type: "string" },
          description: "Source URLs from research. Stored internally, not shown to readers.",
        },
        status: {
          type: "string",
          enum: ["draft", "published"],
          description: 'Always "draft" — QA step decides whether to publish.',
        },
      },
      required: ["title", "body_markdown"],
    },
  },

  {
    type: "function",
    name: "fetch_page_images",
    description:
      "Fetches a web page and returns direct image URLs found on it " +
      "(og:image meta tag and <img src> attributes with image file extensions). " +
      "Call this on each source article URL to find images to embed in the blog post.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Full URL of the page to extract images from.",
        },
      },
      required: ["url"],
    },
  },

  {
    type: "function",
    name: "publish_post",
    description:
      "Publishes a draft post after QA passes. " +
      "Do NOT call this if any QA check failed — leave it as draft for human review.",
    parameters: {
      type: "object",
      properties: {
        post_slug: {
          type: "string",
          description: "The slug value from the create_post result.",
        },
        qa_summary: {
          type: "string",
          description:
            "One-line summary of QA results, e.g. " +
            "'All checks passed: coherent, useful, 820 words, 2 sources, no typos, image set.'",
        },
      },
      required: ["post_slug", "qa_summary"],
    },
  },
];

// ── Main agentic loop ─────────────────────────────────────────────────────────

async function main() {
  // ── Load content config ───────────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let SYSTEM = '';

  if (supabaseUrl && supabaseKey) {
    try {
      const cfgRes = await fetch(
        `${supabaseUrl}/rest/v1/content_config?id=eq.1&select=content`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      if (cfgRes.ok) {
        const rows = await cfgRes.json() as { content?: string }[];
        if (rows[0]?.content) SYSTEM = rows[0].content;
      }
    } catch { /* fall through to file fallback */ }
  }

  if (!SYSTEM) {
    try {
      SYSTEM = readFileSync(join(process.cwd(), 'scripts/content-config.md'), 'utf8');
      console.log('   Config   : loaded from scripts/content-config.md (fallback)\n');
    } catch { /* fall through */ }
  }

  if (!SYSTEM) {
    console.error('Error: content config not found in Supabase or scripts/content-config.md');
    process.exit(1);
  }

  console.log("🚀 Screen AI content pipeline starting…\n");
  console.log(`   Blog API : ${BLOG_API}`);
  console.log(`   Model    : gpt-4o (with live web search)\n`);

  // The Responses API is stateful: each turn passes previous_response_id
  // so we don't have to rebuild the full message history manually.
  let previousResponseId: string | undefined;

  // First turn: kick off the pipeline
  let currentInput: OpenAI.Responses.ResponseInput = [
    {
      role: "user",
      content:
        "Please research and create a new blog post for Screen AI. Follow your workflow exactly.",
    },
  ];

  const MAX_TURNS = 20;

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    console.log(`\n─── Turn ${turn} ${"─".repeat(50 - String(turn).length)}`);

    const response = await ai.responses.create({
      model: "gpt-4o",
      instructions: SYSTEM,
      tools: TOOLS,
      ...(previousResponseId
        ? { previous_response_id: previousResponseId, input: currentInput }
        : { input: currentInput }),
    });

    previousResponseId = response.id;
    console.log(`   status: ${response.status}`);

    // Log output items
    for (const item of response.output) {
      if (item.type === "message") {
        const text = item.content
          .filter((c) => c.type === "output_text")
          .map((c) => (c as { type: "output_text"; text: string }).text)
          .join("");
        if (text.trim()) {
          const preview = text.slice(0, 400);
          console.log(`\n   GPT-4o: ${preview}${text.length > 400 ? " […]" : ""}`);
        }
      }
      if (item.type === "web_search_call") {
        console.log(`\n   🔍 Web search executed (server-side)`);
      }
      if (item.type === "function_call") {
        console.log(`\n   Tool call: ${item.name}`);
        try {
          const argPreview = JSON.stringify(JSON.parse(item.arguments), null, 2)
            .split("\n")
            .slice(0, 6)
            .join("\n");
          console.log(`   Args: ${argPreview}`);
        } catch {
          console.log(`   Args: ${item.arguments.slice(0, 200)}`);
        }
      }
    }

    // ── Done ────────────────────────────────────────────────────────────────
    if (response.status === "completed") {
      const hasPendingCalls = response.output.some((i) => i.type === "function_call");
      if (!hasPendingCalls) {
        console.log("\n✅ Pipeline complete!\n");
        break;
      }
    }

    // ── Execute custom function calls ────────────────────────────────────────
    const functionCalls = response.output.filter(
      (i): i is OpenAI.Responses.ResponseFunctionToolCall => i.type === "function_call"
    );

    if (functionCalls.length === 0) {
      // No tool calls and not "completed" — shouldn't happen, but guard
      if (response.status === "completed") {
        console.log("\n✅ Done.\n");
        break;
      }
      console.warn(`   Unexpected state: status=${response.status}, no tool calls. Stopping.`);
      break;
    }

    // Build function_call_output items for the next turn
    const toolOutputs: OpenAI.Responses.ResponseInput = [];

    for (const fc of functionCalls) {
      console.log(`\n   → Executing: ${fc.name}`);
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(fc.arguments);
      } catch {
        // empty args
      }
      const result = await executeTool(fc.name, args);
      const preview = result.slice(0, 300);
      console.log(`   ← Result: ${preview}${result.length > 300 ? " […]" : ""}`);

      toolOutputs.push({
        type: "function_call_output",
        call_id: fc.call_id,
        output: result,
      });
    }

    currentInput = toolOutputs;
  }
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});
