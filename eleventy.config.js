import categories from "./src/_data/categories.js";

const PAGE_SIZE = Number(process.env.PAGE_SIZE) || 10;

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => {
  const t = new Date(d);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};
const slugify = (html) =>
  html.replace(/<[^>]+>/g, "").trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
const chunk = (arr, size) =>
  arr.length ? Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size)) : [[]];

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/favicon.svg");

  eleventyConfig.addCollection("postsByDate", (api) =>
    api.getFilteredByTag("posts").sort((a, b) => b.date - a.date)
  );

  // 글이 1개 이상인 카테고리만 (칩, 카테고리 페이지, 사이트맵이 이 기준을 따름)
  eleventyConfig.addCollection("activeCategories", (api) => {
    const posts = api.getFilteredByTag("posts");
    return categories.filter((c) => posts.some((p) => p.data.category === c.slug));
  });

  // 전체 목록 + 카테고리별 목록을 페이지 단위로 펼친 컬렉션 (list.njk가 페이지네이션)
  eleventyConfig.addCollection("listPages", (api) => {
    const posts = api.getFilteredByTag("posts").sort((a, b) => b.date - a.date);
    const groups = [
      { key: "all", title: "글 목록", description: "자동차 할부, 리스, 장기렌트의 차이와 중고차 대출 주의점까지, 차핀노트가 정리한 자동차 금융 글을 한곳에서 확인하세요.", base: "/posts/", pageBase: "/posts/page/", posts },
      ...categories
        .filter((c) => posts.some((p) => p.data.category === c.slug))
        .map((c) => ({
          key: c.slug,
          title: `${c.name} 글 모음`,
          description: c.description,
          base: `/category/${c.slug}/`,
          pageBase: `/category/${c.slug}/page/`,
          posts: posts.filter((p) => p.data.category === c.slug),
        })),
    ];
    return groups.flatMap(({ posts: list, base, pageBase, ...meta }) => {
      const pages = chunk(list, PAGE_SIZE);
      const urlOf = (i) => (i === 0 ? base : `${pageBase}${i + 1}/`);
      return pages.map((items, i) => ({
        ...meta,
        items,
        pageNumber: i + 1,
        totalPages: pages.length,
        url: urlOf(i),
        prevUrl: i > 0 ? urlOf(i - 1) : null,
        nextUrl: i < pages.length - 1 ? urlOf(i + 1) : null,
      }));
    });
  });

  eleventyConfig.addFilter("dateYmd", ymd);
  eleventyConfig.addFilter("head", (arr, n) => arr.slice(0, n));
  eleventyConfig.addFilter("absUrl", (path, site) => new URL(path, site.url).href);
  eleventyConfig.addFilter("jsonld", (obj) => JSON.stringify(obj).replace(/</g, "\\u003c"));
  eleventyConfig.addFilter("categoryInfo", (slug) => categories.find((c) => c.slug === slug));

  // 같은 카테고리 글 우선, 모자라면 최신 글로 채움
  eleventyConfig.addFilter("related", (all, url, category, n = 3) => {
    const others = all.filter((p) => p.url !== url);
    const same = others.filter((p) => p.data.category === category);
    const rest = others.filter((p) => p.data.category !== category);
    return [...same, ...rest].slice(0, n);
  });

  // h2/h3에 id를 달고, h2가 3개 이상이면 첫 h2 앞에 목차 삽입
  eleventyConfig.addFilter("withToc", (html) => {
    const used = new Map();
    const toc = [];
    const out = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (m, lvl, inner) => {
      let id = slugify(inner) || "section";
      const n = used.get(id) || 0;
      used.set(id, n + 1);
      if (n) id += `-${n + 1}`;
      if (lvl === "2") toc.push({ id, text: inner.replace(/<[^>]+>/g, "") });
      return `<h${lvl} id="${id}">${inner}</h${lvl}>`;
    });
    if (toc.length < 3) return out;
    const nav =
      `<nav class="toc" aria-label="목차"><strong>목차</strong><ol>` +
      toc.map((t) => `<li><a href="#${t.id}">${t.text}</a></li>`).join("") +
      `</ol></nav>`;
    const i = out.indexOf("<h2");
    return out.slice(0, i) + nav + out.slice(i);
  });

  eleventyConfig.addFilter("breadcrumbLd", (page, title, parent, site) => {
    const items = [{ name: "홈", url: "/" }];
    if (parent) items.push(parent);
    items.push({ name: title, url: page.url });
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: it.name,
        item: new URL(it.url, site.url).href,
      })),
    };
  });

  eleventyConfig.addFilter("articleLd", (page, title, description, date, updated, image, section, site) => ({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    inLanguage: "ko-KR",
    image: [new URL(image, site.url).href],
    datePublished: ymd(date),
    dateModified: ymd(updated || date),
    mainEntityOfPage: new URL(page.url, site.url).href,
    ...(section ? { articleSection: section } : {}),
    author: { "@type": "Person", name: site.author, url: new URL("/about/", site.url).href },
    publisher: { "@type": "Organization", name: site.name, url: site.url },
  }));

  eleventyConfig.addFilter("siteLd", (site) => ({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${site.url}/#website`, name: site.name, url: site.url, inLanguage: "ko-KR", description: site.description },
      { "@type": "Organization", "@id": `${site.url}/#org`, name: site.name, url: site.url, founder: { "@type": "Person", name: site.author, url: new URL("/about/", site.url).href } },
    ],
  }));

  return {
    dir: { input: "src", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
