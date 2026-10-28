export default {
  eleventyComputed: {
    permalink: (data) => (data.site.noindex ? false : "/sitemap.xml"),
  },
};
