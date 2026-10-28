export default {
  eleventyComputed: {
    title: (d) => d.entry.title + (d.entry.pageNumber > 1 ? ` (${d.entry.pageNumber}페이지)` : ""),
    description: (d) => d.entry.description,
    parent: (d) => (d.entry.key === "all" ? undefined : { name: "글 목록", url: "/posts/" }),
  },
};
