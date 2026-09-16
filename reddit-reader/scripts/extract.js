(() => {
  const clean = value => (value || "").replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const absolute = value => {
    if (!value) return null;
    try { return new URL(value, location.origin).href; } catch (_) { return value; }
  };
  const post = document.querySelector("shreddit-post");
  const pageText = clean((document.body && document.body.innerText || "").slice(0, 5000)).toLowerCase();
  const blocked = /you've been blocked|whoa there|access denied|verify you are human|captcha|security check/.test(pageText);
  const authRequired = /\/login\/?$/.test(location.pathname) || (!post && /log in to continue|sign in to continue/.test(pageText));
  if (!post) {
    return {error: blocked ? "Reddit blocked or challenged the browser" : authRequired ? "Reddit requires authentication" : "Missing shreddit-post selector; this may not be a thread page", url: location.href};
  }

  // Choose one body node owned by this component. Querying the whole comment's
  // innerText would duplicate all nested replies.
  const ownedBody = (owner, selectors, commentOwner) => {
    for (const selector of selectors) {
      for (const node of owner.querySelectorAll(selector)) {
        if (commentOwner && node.closest("shreddit-comment") !== owner) continue;
        const text = clean(node.innerText || node.textContent);
        if (text) return text;
      }
    }
    return "";
  };

  const comments = Array.from(document.querySelectorAll("shreddit-comment")).map(node => ({
    id: node.getAttribute("thingid") || node.id || null,
    parent: node.getAttribute("parentid") || node.parentElement?.closest("shreddit-comment")?.getAttribute("thingid") || node.getAttribute("postid") || post.getAttribute("id") || null,
    author: node.getAttribute("author") || null,
    score: node.hasAttribute("score") ? node.getAttribute("score") : null,
    body: ownedBody(node, ['[slot="comment"]', '[id$="-comment-rtjson-content"]'], true),
    permalink: absolute(node.getAttribute("permalink"))
  })).filter(item => item.id);

  const moreLinks = Array.from(document.querySelectorAll('a.more-comments-link, a[slot="more-comments-permalink"]'))
    .filter(node => node.closest("shreddit-comment") || /more (replies|comments)/i.test(node.innerText || ""))
    .map(node => absolute(node.getAttribute("href")))
    .filter(Boolean);

  return {
    url: location.href,
    post: {
      id: post.getAttribute("id") || null,
      title: post.getAttribute("post-title") || clean(document.querySelector("h1")?.innerText),
      body: ownedBody(post, ['shreddit-post-text-body[slot="text-body"]', '[slot="text-body"]'], false),
      author: post.getAttribute("author") || null,
      score: post.hasAttribute("score") ? post.getAttribute("score") : null,
      permalink: absolute(post.getAttribute("permalink") || location.pathname)
    },
    reported_comment_count: post.hasAttribute("comment-count") ? Number.parseInt(post.getAttribute("comment-count"), 10) : null,
    comments,
    more_links: Array.from(new Set(moreLinks))
  };
})()
