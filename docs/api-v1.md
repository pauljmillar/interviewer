# Candice AI — Internal API v1

Bearer token API for programmatic blog management. Currently superadmin-only. The same
endpoints will serve paying client orgs once org-level access is enabled (see roadmap below).

---

## Authentication

Every request must include an `Authorization` header:

```
Authorization: Bearer cai_<token>
```

Tokens are created and revoked in the admin UI at **Admin → API Keys**. The raw token is
shown once at creation and never stored in plain form.

| Status | Meaning |
|---|---|
| `401` | Missing, invalid, or revoked token |
| `503` | Database unavailable |

---

## Base URL

```
https://<your-domain>/api/v1
```

---

## Endpoints

### Topics

#### `GET /api/v1/topics`

Returns all published posts as `[{ slug, title }]`. Use this to check for duplicate titles
before creating a new post.

**Response `200`**
```json
[
  { "slug": "how-ai-interviews-work", "title": "How AI Interviews Work" },
  { "slug": "hiring-at-scale",        "title": "Hiring at Scale" }
]
```

---

### Posts

#### `GET /api/v1/posts`

List all posts with optional filters.

**Query parameters** (all optional)

| Param | Type | Description |
|---|---|---|
| `status` | string | `draft` \| `published` \| `scheduled` \| `archived` |
| `tag` | string | Return only posts whose `tags` array contains this value |
| `from` | ISO 8601 | Posts with `createdAt >= from` |
| `to` | ISO 8601 | Posts with `createdAt <= to` |

**Response `200`**
```json
{
  "data": [ /* Post objects */ ],
  "total": 3
}
```

---

#### `POST /api/v1/posts`

Create a new post.

**Request body** (`application/json`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | **yes** | Plain text, used as the page `<h1>` |
| `body_markdown` | string | **yes** | Full post content in Markdown |
| `slug` | string | no | URL path segment. Auto-generated from `title` + timestamp if omitted. Must be unique. |
| `status` | string | no | `draft` (default) \| `published` \| `scheduled` |
| `publish_at` | ISO 8601 | conditional | Required when `status` is `scheduled` |
| `excerpt` | string | no | Short summary shown in listings and meta description |
| `tags` | string[] | no | Array of tag slugs e.g. `["ai", "hiring"]` |
| `cover_image_url` | string | no | URL returned by `POST /api/v1/images` |
| `source_urls` | string[] | no | Research sources — stored but not displayed publicly |
| `images` | object[] | no | Inline images to upload (see below) |

**Inline images** — when `images` is provided, each image is uploaded to S3 and any
occurrence of `filename` in `body_markdown` is replaced with the stable storage URL.

```json
"images": [
  {
    "filename":    "hero.png",
    "mime_type":   "image/png",
    "data_base64": "<base64-encoded bytes>"
  }
]
```

Accepted mime types: `image/png`, `image/jpeg`, `image/gif`, `image/webp`

**Example request**
```json
{
  "title": "Five Ways AI Is Changing Hiring",
  "body_markdown": "## Introduction\n\nAI is transforming...",
  "status": "draft",
  "excerpt": "A look at how AI tools are reshaping recruiting.",
  "tags": ["ai", "hiring"],
  "source_urls": ["https://example.com/research"]
}
```

**Response `201`** — Post object (see [Post object](#post-object) below)

**Error responses**

| Status | Condition |
|---|---|
| `400` | Missing `title` or `body_markdown`; or `status: scheduled` without `publish_at` |
| `409` | Slug already exists — supply an explicit unique `slug` |
| `500` | Database error — message in `{ "error": "..." }` |

---

#### `GET /api/v1/posts/:slug`

Fetch a single post by its slug.

**Response `200`** — Post object
**Response `404`** — `{ "error": "Not found" }`

---

#### `PATCH /api/v1/posts/:slug`

Partially update a post. All fields are optional — only supplied fields are changed.

**Request body** (`application/json`)

| Field | Type | Notes |
|---|---|---|
| `title` | string | |
| `body_markdown` | string | Replaces the full post content |
| `slug` | string | Rename the slug (updates the URL) |
| `status` | string | `draft` \| `published` \| `scheduled` \| `archived` |
| `publish_at` | ISO 8601 | Required if changing status to `scheduled` |
| `excerpt` | string | |
| `tags` | string[] | Replaces the full tags array |
| `cover_image_url` | string | |
| `source_urls` | string[] | Replaces the full source_urls array |

Setting `status: "published"` automatically sets `published_at` to the current time if it
has not been set before.

**Response `200`** — Updated Post object

---

#### `DELETE /api/v1/posts/:slug`

Soft-deletes a post: sets `status` to `archived` and removes it from the public blog.
The record is retained in the database and can be restored via `PATCH`.

**Response `200`** — `{ "ok": true }`

---

### Art Generation

#### `POST /api/v1/generate-art`

Generate a geometric art image programmatically. Returns binary image data. Used to produce
blog post thumbnails — the returned binary can be passed directly to `POST /api/v1/images`.

**Request body** (`application/json`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | string | **yes** | `"png"` \| `"gif"` |
| `seed` | number | no | 32-bit unsigned integer. Same seed + bgIndex always produces identical output. Defaults to a random value. |
| `bgIndex` | number | no | Index into the `bgOrder` palette array. Defaults to `0` (indigo). |

**Response** — binary image with `Content-Type: image/png` or `image/gif`

- PNG: instant, single frame
- GIF: animated (140 frames at defaults, ~2–5s to generate); seamlessly looping

**Error responses**

| Status | Condition |
|---|---|
| `400` | `type` is missing or not `"png"` / `"gif"` |
| `401` | Missing, invalid, or revoked token |

**Example**
```json
{ "type": "gif", "seed": 123456789, "bgIndex": 0 }
```

---

### Images

#### `POST /api/v1/images`

Upload an image to S3. Returns a URL suitable for use as `cover_image_url` or for
embedding in markdown.

**Request** — `multipart/form-data` with a single field named `file`

Accepted types: `image/png`, `image/jpeg`, `image/gif`, `image/webp`

**Response `200`**
```json
{ "url": "/api/blog/image?key=blog%2Fimages%2F1748293847-abc.png" }
```

**Error responses**

| Status | Condition |
|---|---|
| `400` | No file provided |
| `503` | S3 not configured |

---

## Post object

Returned by `GET /posts`, `POST /posts`, `GET /posts/:slug`, and `PATCH /posts/:slug`.

```json
{
  "id":           "1748293847293-abc123def",
  "slug":         "five-ways-ai-is-changing-hiring",
  "title":        "Five Ways AI Is Changing Hiring",
  "content":      "## Introduction\n\nAI is transforming...",
  "summary":      null,
  "thumbnailKey": null,
  "published":    false,
  "publishedAt":  null,
  "createdAt":    "2026-03-22T10:00:00.000Z",
  "updatedAt":    "2026-03-22T10:00:00.000Z",
  "status":       "draft",
  "tags":         ["ai", "hiring"],
  "coverImageUrl": null,
  "excerpt":      "A look at how AI tools are reshaping recruiting.",
  "sourceUrls":   ["https://example.com/research"],
  "publishAt":    null
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | string | Internal ID |
| `slug` | string | URL path segment |
| `title` | string | |
| `content` | string | Full markdown (may contain resolved image URLs) |
| `summary` | string \| null | Legacy field — prefer `excerpt` |
| `thumbnailKey` | string \| null | S3 key for the thumbnail used by the admin editor |
| `published` | boolean | Derived from `status === "published"` |
| `publishedAt` | ISO 8601 \| null | Set automatically when first published |
| `createdAt` | ISO 8601 | |
| `updatedAt` | ISO 8601 | Updated on every write |
| `status` | string | `draft` \| `published` \| `scheduled` \| `archived` |
| `tags` | string[] | |
| `coverImageUrl` | string \| null | Full URL (use `/api/v1/images` to upload) |
| `excerpt` | string \| null | |
| `sourceUrls` | string[] | |
| `publishAt` | ISO 8601 \| null | Scheduled publish time |

---

## Typical workflow

```
# 1. Check existing topics to avoid duplicates
GET /api/v1/topics

# 2. Generate a thumbnail (optional)
POST /api/v1/generate-art  { "type": "gif", "seed": 123456789 }
→ binary GIF

# 3. Upload the thumbnail (or any other image)
POST /api/v1/images   (multipart, field: file — binary from step 2)
→ { "url": "/api/blog/image?key=..." }

# 4. Create the post as a draft
POST /api/v1/posts
  { "title": "...", "body_markdown": "...", "cover_image_url": "<from step 3>" }
→ { "slug": "auto-generated-slug", "status": "draft", ... }

# 5. Review in admin, then publish
PATCH /api/v1/posts/<slug>
  { "status": "published" }
```

---

## Roadmap

- **Org-scoped access** — when a client org is granted API access, their keys will be
  limited to reading/writing their own content. The `api_access` flag on `org_settings`
  is already in place for this.
- **Generated `/docs` page** — a public or org-authenticated docs UI will be added once
  external consumers exist.
- **Webhook events** — `post.published`, `post.archived` notifications.
