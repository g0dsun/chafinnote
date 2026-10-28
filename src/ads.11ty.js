export default class {
  data() {
    return {
      permalink: (data) => (data.site.adsenseId ? "/ads.txt" : false),
      eleventyExcludeFromCollections: true,
    };
  }
  render(data) {
    const pub = data.site.adsenseId.replace(/^ca-/, "");
    return `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`;
  }
}
