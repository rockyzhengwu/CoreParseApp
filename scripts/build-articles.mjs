import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contentDir = path.join(root, "content", "articles");
const outputDir = path.join(root, "articles");
const siteUrl = "https://coreparse.app";
const defaultImage = "/assets/preview-document.jpg";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseFrontMatter(source, filePath) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(`Missing front matter: ${filePath}`);
  }

  const data = {};
  for (const line of match[1].split("\n")) {
    if (!line.trim()) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key === "tags") {
      data[key] = value.split(",").map((tag) => tag.trim()).filter(Boolean);
    } else {
      data[key] = value;
    }
  }

  for (const required of ["title", "description", "slug", "date", "category"]) {
    if (!data[required]) {
      throw new Error(`Missing ${required} in ${filePath}`);
    }
  }

  return { data, body: match[2].trim() };
}

function inlineMarkdown(value) {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
  return html;
}

function renderTable(lines) {
  const rows = lines.map((line) =>
    line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => inlineMarkdown(cell.trim()))
  );
  const head = rows[0] ?? [];
  const body = rows.slice(2);
  return `<div class="article-table-wrap"><table><thead><tr>${head.map((cell) => `<th>${cell}</th>`).join("")}</tr></thead><tbody>${body
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const fence = line.match(/^```(\w+)?\s*$/);
    if (fence) {
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      const lang = fence[1] ? ` class="language-${escapeAttribute(fence[1])}"` : "";
      blocks.push(`<pre><code${lang}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^#{2,3}\s+/.test(line)) {
      const level = line.startsWith("###") ? 3 : 2;
      const text = line.replace(/^#{2,3}\s+/, "").trim();
      const id = slugify(text);
      blocks.push(`<h${level} id="${id}">${inlineMarkdown(text)}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push(`<blockquote>${quote.map(inlineMarkdown).join("<br>")}</blockquote>`);
      continue;
    }

    if (/^-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^-\s+/, "").trim());
        i += 1;
      }
      blocks.push(`<ul>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (line.includes("|") && lines[i + 1] && /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(lines[i + 1])) {
      const tableLines = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        tableLines.push(lines[i]);
        i += 1;
      }
      blocks.push(renderTable(tableLines));
      continue;
    }

    const paragraph = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{2,3}\s+/.test(lines[i]) &&
      !/^-\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^```/.test(lines[i])
    ) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    blocks.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
  }

  return blocks.join("\n");
}

function readingTime(markdown) {
  const words = markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*_`[\]()|-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`)
  );
}

function absoluteUrl(url) {
  return url?.startsWith("http") ? url : `${siteUrl}${url || defaultImage}`;
}

function brandMark() {
  return `<span class="brand-mark" aria-hidden="true">
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
              <path d="M5 3.5h6.1L15 7.4v9.1H5v-13Z" stroke="currentColor" stroke-width="1.6" />
              <path d="M11 3.7v4h4" stroke="currentColor" stroke-width="1.6" />
              <path d="M7.4 11.1h5.2M7.4 14h5.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </span>`;
}

function googleAnalytics() {
  return `<!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-KEMFD8HF68"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-KEMFD8HF68');
    </script>`;
}

function header() {
  return `<header class="site-header nav-pill-shell">
      <nav class="nav nav-pill" aria-label="Main navigation">
        <a class="brand" href="/" aria-label="CoreParse home">
          ${brandMark()}
          CoreParse
        </a>
        <div class="nav-links">
          <a class="optional" href="/#features">Features</a>
          <a href="/articles/">Articles</a>
          <a href="/support/">Support</a>
          <a class="button primary nav-cta" href="https://apps.apple.com/app/id6786576853?mt=12">Download</a>
        </div>
      </nav>
    </header>`;
}

function footer() {
  return `<footer class="site-footer">
      <div class="footer-inner">
        <p class="footer-statement">Documents stay local. Structure comes out.</p>
        <div class="footer-links">
          <span>&copy; 2026 CoreParse</span>
          <a href="/articles/">Articles</a>
          <a href="/support/">Support</a>
          <a href="/privacy/">Privacy</a>
          <a href="mailto:support@coreparse.app">Contact</a>
        </div>
      </div>
    </footer>`;
}

function pageShell({ title, description, canonical, image, imageAlt, type = "website", jsonLd, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeAttribute(description)}">
    <meta property="og:site_name" content="CoreParse">
    <meta property="og:title" content="${escapeAttribute(title.replace(" - CoreParse", ""))}">
    <meta property="og:description" content="${escapeAttribute(description)}">
    <meta property="og:type" content="${escapeAttribute(type)}">
    <meta property="og:url" content="${escapeAttribute(canonical)}">
    <meta property="og:image" content="${escapeAttribute(absoluteUrl(image))}">
    <meta property="og:image:alt" content="${escapeAttribute(imageAlt || "CoreParse local OCR document analysis interface")}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeAttribute(title.replace(" - CoreParse", ""))}">
    <meta name="twitter:description" content="${escapeAttribute(description)}">
    <meta name="twitter:image" content="${escapeAttribute(absoluteUrl(image))}">
    <meta name="theme-color" content="#0b1220">
    <link rel="canonical" href="${escapeAttribute(canonical)}">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/styles.css">
    <script type="application/ld+json">
      ${JSON.stringify(jsonLd, null, 6)}
    </script>
    ${googleAnalytics()}
  </head>
  <body>
    ${header()}
    ${body}
    ${footer()}
  </body>
</html>
`;
}

function loadArticles() {
  if (!fs.existsSync(contentDir)) return [];
  return fs
    .readdirSync(contentDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const filePath = path.join(contentDir, file);
      const source = fs.readFileSync(filePath, "utf8");
      const { data, body } = parseFrontMatter(source, filePath);
      return {
        ...data,
        body,
        html: renderMarkdown(body),
        readingMinutes: readingTime(body),
        url: `/articles/${data.slug}/`,
        image: data.heroImage || defaultImage,
        imageAlt: data.heroAlt || "CoreParse local OCR document analysis interface"
      };
    })
    .sort((a, b) => `${b.date}`.localeCompare(`${a.date}`));
}

function renderArticle(article, allArticles) {
  const related = allArticles.filter((item) => item.slug !== article.slug).slice(0, 3);
  const canonical = `${siteUrl}${article.url}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    dateModified: article.updated || article.date,
    image: absoluteUrl(article.image),
    mainEntityOfPage: canonical,
    author: {
      "@type": "Organization",
      name: "CoreParse",
      url: siteUrl
    },
    publisher: {
      "@type": "Organization",
      name: "CoreParse",
      url: siteUrl
    }
  };

  const body = `<main class="article-page">
      <article class="article-shell">
        <header class="article-header">
          <a class="article-back" href="/articles/">Articles</a>
          <p class="eyebrow">${escapeHtml(article.category)}</p>
          <h1>${escapeHtml(article.title)}</h1>
          <p class="article-deck">${escapeHtml(article.description)}</p>
          <div class="article-meta">
            <time datetime="${escapeAttribute(article.date)}">${formatDate(article.date)}</time>
            <span>${article.readingMinutes} min read</span>
            ${article.updated ? `<span>Updated ${formatDate(article.updated)}</span>` : ""}
          </div>
        </header>
        <figure class="article-hero-image">
          <img src="${escapeAttribute(article.image)}" width="2560" height="1600" alt="${escapeAttribute(article.imageAlt)}">
        </figure>
        <div class="article-content">
          ${article.html}
        </div>
      </article>
      <section class="article-after">
        <div class="article-related">
          <h2>Related guides</h2>
          <div class="article-related-list">
            ${related
              .map(
                (item) => `<a href="${item.url}">
              <span>${escapeHtml(item.category)}</span>
              <strong>${escapeHtml(item.title)}</strong>
            </a>`
              )
              .join("")}
          </div>
        </div>
        <div class="article-cta">
          <h2>Run OCR locally on your Mac.</h2>
          <p>Use CoreParse to analyze PDFs and images, review text and tables, and export Markdown without uploading documents.</p>
          <a class="button primary" href="https://apps.apple.com/app/id6786576853?mt=12">Download on the App Store</a>
        </div>
      </section>
    </main>`;

  return pageShell({
    title: `${article.title} - CoreParse`,
    description: article.description,
    canonical,
    image: article.image,
    imageAlt: article.imageAlt,
    type: "article",
    jsonLd,
    body
  });
}

function renderIndex(articles) {
  const canonical = `${siteUrl}/articles/`;
  const description =
    "CoreParse guides for local OCR on Mac, PDF OCR, table extraction, formula recognition, Markdown export, and private document analysis workflows.";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "CoreParse Guides",
    description,
    url: canonical,
    mainEntity: articles.map((article) => ({
      "@type": "Article",
      headline: article.title,
      url: `${siteUrl}${article.url}`,
      datePublished: article.date,
      dateModified: article.updated || article.date
    }))
  };
  const body = `<main class="articles-page">
      <section class="articles-hero">
        <div class="articles-hero-inner">
          <p class="eyebrow reveal">CoreParse Guides</p>
          <h1 class="reveal delay-1">Practical notes for local OCR on Mac.</h1>
          <p class="article-deck reveal delay-2">${description}</p>
        </div>
      </section>
      <section class="articles-list-section">
        <div class="articles-list">
          ${articles
            .map(
              (article) => `<article class="article-list-item">
            <a href="${article.url}">
              <div class="article-list-meta">
                <span>${escapeHtml(article.category)}</span>
                <time datetime="${escapeAttribute(article.date)}">${formatDate(article.date)}</time>
                <span>${article.readingMinutes} min read</span>
              </div>
              <h2>${escapeHtml(article.title)}</h2>
              <p>${escapeHtml(article.description)}</p>
            </a>
          </article>`
            )
            .join("")}
        </div>
      </section>
      <section class="article-cta articles-cta">
        <h2>Analyze documents where they already are.</h2>
        <p>CoreParse runs OCR, table detection, and optional formula recognition locally on your Mac.</p>
        <a class="button primary" href="https://apps.apple.com/app/id6786576853?mt=12">Download on the App Store</a>
      </section>
    </main>`;

  return pageShell({
    title: "CoreParse Guides - Local OCR on Mac",
    description,
    canonical,
    image: defaultImage,
    imageAlt: "CoreParse local OCR document analysis interface",
    jsonLd,
    body
  });
}

function writeSitemap(articles) {
  const staticUrls = [
    { loc: "/", lastmod: "2026-07-30", changefreq: "monthly", priority: "1.0" },
    { loc: "/articles/", lastmod: "2026-07-30", changefreq: "weekly", priority: "0.8" },
    { loc: "/support/", lastmod: "2026-07-30", changefreq: "monthly", priority: "0.7" },
    { loc: "/privacy/", lastmod: "2026-07-30", changefreq: "yearly", priority: "0.5" }
  ];
  const articleUrls = articles.map((article) => ({
    loc: article.url,
    lastmod: article.updated || article.date,
    changefreq: "monthly",
    priority: "0.7"
  }));
  const urls = [...staticUrls, ...articleUrls];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${siteUrl}${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;
  fs.writeFileSync(path.join(root, "sitemap.xml"), xml);
}

function main() {
  const articles = loadArticles();
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(path.join(outputDir, "index.html"), renderIndex(articles));
  for (const article of articles) {
    const articleDir = path.join(outputDir, article.slug);
    fs.mkdirSync(articleDir, { recursive: true });
    fs.writeFileSync(path.join(articleDir, "index.html"), renderArticle(article, articles));
  }

  writeSitemap(articles);
  console.log(`Built ${articles.length} articles.`);
}

main();
