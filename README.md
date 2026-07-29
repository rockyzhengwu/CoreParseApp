# CoreParse Website

Static marketing and App Store support pages for `coreparse.app`.

## Cloudflare Pages

- Framework preset: None
- Build command: `npm run build`
- Output directory: `/`

## Articles

- Write articles in `content/articles/*.md`.
- Run `npm run build` before deploying or previewing article pages.
- Generated article pages are written to `/articles/`, and `sitemap.xml` is updated automatically.
- Every Markdown file in `content/articles/` needs front matter:

```md
---
title: Article title
description: Search result description under 160 characters.
slug: article-url-slug
date: 2026-07-30
updated: 2026-07-30
category: OCR Guides
tags: OCR, Mac OCR, PDF OCR
heroImage: /assets/preview-document.jpg
heroAlt: CoreParse analyzing a scanned document locally on Mac
---
```

URLs for App Store Connect:

- Marketing URL: `https://coreparse.app/`
- Support URL: `https://coreparse.app/support/`
- Privacy Policy URL: `https://coreparse.app/privacy/`

App Store:

- Product URL: `https://apps.apple.com/app/id6786576853?mt=12`
- Smart App Banner app id: `6786576853`
