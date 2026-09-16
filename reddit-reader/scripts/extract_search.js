(() => {
  const clean = value => (value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  const absolute = value => {
    if (!value) return null;
    try { return new URL(value, location.origin).href; } catch (_) { return value; }
  };
  const pageText = clean((document.body && document.body.innerText || "").slice(0, 5000)).toLowerCase();
  const blocked = /you've been blocked|whoa there|access denied|verify you are human|captcha|security check/.test(pageText);
  const authRequired = /\/login\/?$/.test(location.pathname) || /log in to continue|sign in to continue/.test(pageText);
  if (blocked || authRequired) {
    return {error: blocked ? "Reddit blocked or challenged the browser" : "Reddit requires authentication", url: location.href};
  }

  const units = Array.from(document.querySelectorAll('[data-testid="search-post-unit"]'));
  const results = units.map(unit => {
    const titleLink = unit.querySelector('[data-testid="post-title-text"]') || unit.querySelector('h2 a[href*="/comments/"]');
    const communityLink = Array.from(unit.querySelectorAll('a[href]')).find(a => /^\/r\/[^/]+\/?(?:\?.*)?$/.test(a.getAttribute('href') || ""));
    const previewNode = unit.querySelector('[data-testid="search-post-excerpt"], [data-testid="post-content"], [data-testid*="excerpt"]');
    let subreddit = clean(communityLink && communityLink.textContent);
    if (!subreddit) {
      try {
        const context = JSON.parse(unit.closest('search-telemetry-tracker[data-testid="search-sdui-post"]')?.getAttribute('data-faceplate-tracking-context') || "{}");
        subreddit = context.subreddit?.name ? `r/${context.subreddit.name}` : "";
      } catch (_) {}
    }
    return {
      title: clean(titleLink && (titleLink.textContent || titleLink.getAttribute('aria-label'))),
      subreddit: subreddit || null,
      preview: clean(previewNode && previewNode.textContent),
      permalink: absolute(titleLink && titleLink.getAttribute('href'))
    };
  }).filter(item => item.title && item.permalink && /\/comments\//.test(item.permalink));

  return {url: location.href, rendered_result_count: results.length, results};
})()
