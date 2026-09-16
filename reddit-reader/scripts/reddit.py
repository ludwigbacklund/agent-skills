#!/usr/bin/env python3
"""Read a Reddit thread from the rendered DOM using agent-browser."""

from __future__ import annotations

import argparse
import copy
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

SESSION = "reddit-reader"
PROFILE = Path("~/.agent-browser/reddit-reader-profile").expanduser()
ALLOWED_HOSTS = {"reddit.com", "www.reddit.com", "old.reddit.com"}
ALLOWED_SORTS = {"best", "confidence", "top", "new", "controversial", "old", "qa", "live"}
SEARCH_SORTS = {"relevance", "hot", "top", "new", "comments"}
SEARCH_TIMES = {"hour", "day", "week", "month", "year", "all"}
SUBREDDIT = re.compile(r"^[A-Za-z0-9_]{2,21}$")
THREAD_PATH = re.compile(
    r"^/(?:r/[A-Za-z0-9_]+/)?comments/[A-Za-z0-9]+(?:/[^/?#]+)?"
    r"(?:/(?:comment/)?[A-Za-z0-9]+)?/?$"
)


class ReaderError(RuntimeError):
    pass


def normalize_url(value: str) -> str:
    """Validate a Reddit thread URL and return its canonical www URL."""
    try:
        parsed = urlsplit(value.strip())
    except ValueError as exc:
        raise ValueError(f"invalid URL: {exc}") from exc
    host = (parsed.hostname or "").lower()
    if parsed.scheme not in {"http", "https"} or host not in ALLOWED_HOSTS:
        raise ValueError("URL must use http(s) on reddit.com, www.reddit.com, or old.reddit.com")
    if parsed.username or parsed.password or parsed.port is not None:
        raise ValueError("credentials and custom ports are not allowed")
    if not THREAD_PATH.fullmatch(parsed.path):
        raise ValueError("URL must be a Reddit comments thread or comment permalink")

    kept: list[tuple[str, str]] = []
    for key, item in parse_qsl(parsed.query, keep_blank_values=True):
        if key != "sort":
            continue
        item = item.lower()
        if item not in ALLOWED_SORTS:
            raise ValueError(f"unsupported Reddit sort: {item!r}")
        if not kept:
            kept.append(("sort", item))
    path = re.sub(r"/+", "/", parsed.path)
    if not path.endswith("/"):
        path += "/"
    return urlunsplit(("https", "www.reddit.com", path, urlencode(kept), ""))


def build_search_url(keywords: str, sub: str | None = None,
                     sort: str = "relevance", time_filter: str = "all") -> str:
    """Build a Reddit browser-UI search URL without making a request."""
    keywords = keywords.strip()
    if not keywords:
        raise ValueError("search keywords must not be empty")
    if len(keywords) > 500:
        raise ValueError("search keywords must be at most 500 characters")
    if sort not in SEARCH_SORTS:
        raise ValueError(f"unsupported search sort: {sort!r}")
    if time_filter not in SEARCH_TIMES:
        raise ValueError(f"unsupported search time: {time_filter!r}")
    if sub is not None:
        sub = sub.removeprefix("r/")
        if not SUBREDDIT.fullmatch(sub):
            raise ValueError("--sub must be a Reddit community name (2-21 letters, digits, or underscores)")
        path = f"/r/{sub}/search/"
        query = [("q", keywords), ("restrict_sr", "1"), ("sort", sort), ("t", time_filter)]
    else:
        path = "/search/"
        query = [("q", keywords), ("sort", sort), ("t", time_filter)]
    return urlunsplit(("https", "www.reddit.com", path, urlencode(query), ""))


def truncate_text(value: object, limit: int) -> tuple[str, bool]:
    text = str(value or "").strip()
    if len(text) <= limit:
        return text, False
    if limit <= 1:
        return "…"[:limit], True
    return text[: limit - 1].rstrip() + "…", True


def retain_parented(comments: list[dict], post_id: str | None) -> list[dict]:
    """Remove orphaned descendants while preserving input order."""
    candidates = {item.get("id") for item in comments if item.get("id")}
    by_id = {item.get("id"): item for item in comments if item.get("id")}

    def connected(item: dict) -> bool:
        seen = {item.get("id")}
        parent = item.get("parent")
        while parent and parent != post_id and not str(parent).startswith("t3_"):
            if parent not in candidates or parent in seen:
                return False
            seen.add(parent)
            parent = by_id[parent].get("parent")
        return True

    return [item for item in comments if connected(item)]


def _score(value: object) -> int | str | None:
    if value is None or value == "":
        return None
    try:
        return int(str(value))
    except ValueError:
        return str(value)


def prepare_payload(raw: dict, max_comments: int, max_body_chars: int) -> dict:
    if raw.get("error"):
        raise ReaderError(str(raw["error"]))
    post_raw = raw.get("post")
    if not isinstance(post_raw, dict) or not post_raw.get("title"):
        raise ReaderError("Reddit thread is missing the expected post title selector")

    body, post_cut = truncate_text(post_raw.get("body"), max_body_chars)
    title = str(post_raw.get("title") or "")
    post = {
        "id": post_raw.get("id"),
        "body": body,
        "author": post_raw.get("author"),
        "score": _score(post_raw.get("score")),
        "permalink": post_raw.get("permalink") or raw.get("url"),
    }
    source = raw.get("comments") if isinstance(raw.get("comments"), list) else []
    comments: list[dict] = []
    body_cuts = int(post_cut)
    for item in source[:max_comments]:
        if not isinstance(item, dict) or not item.get("id"):
            continue
        text, cut = truncate_text(item.get("body"), max_body_chars)
        body_cuts += int(cut)
        comments.append({
            "id": item["id"], "parent": item.get("parent"),
            "author": item.get("author"), "score": _score(item.get("score")),
            "body": text, "permalink": item.get("permalink"),
        })
    comments = retain_parented(comments, post_raw.get("id"))
    more = [str(link) for link in raw.get("more_links", []) if link][:10]
    extracted = len(source)
    payload = {
        "title": title, "post": post, "comments": comments,
        "coverage": {
            "status": "partial", "guaranteed_complete": False,
            "reported_comment_count": raw.get("reported_comment_count"),
            "extracted_count": extracted, "returned_count": len(comments),
            "truncated": bool(post_cut or body_cuts or len(source) > len(comments)),
            "truncated_bodies": body_cuts,
            "remaining_more_links": len(raw.get("more_links", [])),
            "remaining_more_link_samples": more,
            "note": "Rendered DOM coverage only; completeness is not guaranteed."
        }
    }
    return payload


def render(payload: dict, output_format: str) -> str:
    if output_format == "json":
        return json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n"
    post = payload["post"]
    if output_format == "compact":
        # Quote each body on one line so embedded newlines/bullets cannot be
        # mistaken for structural reply indentation.
        quote = lambda value: json.dumps(value or "", ensure_ascii=False)
        lines = ["T " + quote(payload["title"]), "P " + quote(post.get("author") or "[unknown]") + ": " + quote(post.get("body"))]
        comments = payload["comments"]
        ids = {item["id"] for item in comments}
        children: dict[str | None, list[dict]] = {}
        for item in comments:
            parent = item.get("parent")
            children.setdefault(parent if parent in ids else None, []).append(item)
        stack = [(item, 0) for item in reversed(children.get(None, []))]
        visited = set()
        while stack:
            item, depth = stack.pop()
            if item["id"] in visited:
                continue
            visited.add(item["id"])
            lines.append("  " * depth + "- " + quote(item.get("author") or "[unknown]") + ": " + quote(item.get("body")))
            stack.extend((child, depth + 1) for child in reversed(children.get(item["id"], [])))
        coverage = payload["coverage"]
        lines.append(f"[partial; {coverage['returned_count']} comments" + ("; truncated" if coverage["truncated"] else "") + "]")
        return "\n".join(lines) + "\n"
    lines = [payload["title"], f"by {post.get('author') or '[unknown]'} | score {post.get('score')}", post.get("permalink") or ""]
    if post.get("body"):
        lines += ["", post["body"]]
    lines += ["", "COMMENTS"]
    for item in payload["comments"]:
        lines += ["", f"[{item['id']} parent={item.get('parent')}] {item.get('author') or '[unknown]'} | score {item.get('score')}", item.get("body") or "", item.get("permalink") or ""]
    c = payload["coverage"]
    lines += ["", f"COVERAGE: partial; reported={c.get('reported_comment_count')} extracted={c['extracted_count']} returned={c['returned_count']} remaining_more_links={c['remaining_more_links']} truncated={c['truncated']} truncated_bodies={c['truncated_bodies']}", c["note"]]
    return "\n".join(lines).rstrip() + "\n"


def fit_budget(payload: dict, max_chars: int, output_format: str) -> dict:
    """Fit output by dropping leaves first, retaining valid parent chains."""
    result = copy.deepcopy(payload)
    while len(render(result, output_format)) > max_chars and result["comments"]:
        result["comments"].pop()
        # If unusual DOM order put a parent after a child, remove resulting orphans.
        result["comments"] = retain_parented(result["comments"], None)
        result["coverage"]["truncated"] = True
        result["coverage"]["returned_count"] = len(result["comments"])
    while len(render(result, output_format)) > max_chars and result["coverage"]["remaining_more_link_samples"]:
        result["coverage"]["remaining_more_link_samples"].pop()
        result["coverage"]["truncated"] = True
    for field in ("body",):
        text = result["post"].get(field) or ""
        excess = len(render(result, output_format)) - max_chars
        if excess > 0 and text:
            result["post"][field], _ = truncate_text(text, max(0, len(text) - excess - 1))
            result["coverage"]["truncated"] = True
            result["coverage"]["truncated_bodies"] += 1
    if len(render(result, output_format)) > max_chars:
        raise ReaderError(f"--max-chars {max_chars} is too small for structured metadata")
    return result


def prepare_search_payload(raw: dict, keywords: str, sub: str | None,
                           sort: str, time_filter: str, limit: int) -> dict:
    if raw.get("error"):
        raise ReaderError(str(raw["error"]))
    source = raw.get("results") if isinstance(raw.get("results"), list) else []
    results = []
    for item in source[:limit]:
        if not isinstance(item, dict) or not item.get("title") or not item.get("permalink"):
            continue
        preview, cut = truncate_text(item.get("preview"), 500)
        results.append({
            "rank": len(results) + 1,
            "title": str(item["title"]),
            "subreddit": item.get("subreddit"),
            "preview": preview,
            "permalink": item["permalink"],
            "preview_truncated": cut,
        })
    rendered_count = raw.get("rendered_result_count", len(source))
    return {
        "query": keywords, "subreddit": sub, "sort": sort, "time": time_filter,
        "results": results,
        "coverage": {
            "status": "partial", "guaranteed_complete": False,
            "rendered_result_count": rendered_count, "returned_count": len(results),
            "truncated": len(source) > len(results),
            "note": "Rendered search DOM only; ranking and completeness are Reddit's current UI view. Threads were not opened.",
        },
    }


def render_search(payload: dict, output_format: str) -> str:
    if output_format == "json":
        return json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n"
    lines = []
    for item in payload["results"]:
        if output_format == "compact":
            lines.append(f"{item['rank']}. {item['title']} — {item.get('subreddit') or 'r/[unknown]'}")
            lines.append(item.get("preview") or "[no post preview in rendered search result]")
            lines.append(item["permalink"])
        else:
            lines += [f"RESULT {item['rank']}", f"TITLE: {item['title']}",
                      f"SUBREDDIT: {item.get('subreddit') or '[unknown]'}",
                      f"PREVIEW: {item.get('preview') or '[not present in rendered search result]'}",
                      f"PERMALINK: {item['permalink']}", ""]
    coverage = payload["coverage"]
    lines.append(f"[partial search DOM; {coverage['returned_count']} results" +
                 ("; truncated" if coverage["truncated"] else "") + "]")
    if output_format == "text":
        lines.append(coverage["note"])
    return "\n".join(lines).rstrip() + "\n"


def fit_search_budget(payload: dict, max_chars: int, output_format: str) -> dict:
    result = copy.deepcopy(payload)
    while len(render_search(result, output_format)) > max_chars and result["results"]:
        result["results"].pop()
        result["coverage"]["returned_count"] = len(result["results"])
        result["coverage"]["truncated"] = True
    if len(render_search(result, output_format)) > max_chars:
        raise ReaderError(f"--max-chars {max_chars} is too small for search metadata")
    return result


def browser_command(*args: str, timeout: float = 25) -> str:
    command = ["agent-browser", "--session", SESSION, "--profile", str(PROFILE), "--headed", *args]
    try:
        proc = subprocess.run(command, text=True, input=None, capture_output=True, timeout=timeout)
    except FileNotFoundError as exc:
        raise ReaderError("agent-browser is not installed or not on PATH") from exc
    except subprocess.TimeoutExpired as exc:
        raise ReaderError(f"agent-browser timed out after {timeout:g}s") from exc
    if proc.returncode:
        detail = (proc.stderr or proc.stdout).strip()
        raise ReaderError(f"agent-browser failed: {detail or 'unknown error'}")
    return proc.stdout.strip()


def extract_dom(script: str) -> dict:
    command = ["agent-browser", "--session", SESSION, "--profile", str(PROFILE), "--headed", "eval", "--stdin"]
    try:
        proc = subprocess.run(command, input=script, text=True, capture_output=True, timeout=20)
    except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
        raise ReaderError("agent-browser eval failed or timed out") from exc
    if proc.returncode:
        raise ReaderError(f"agent-browser eval failed: {(proc.stderr or proc.stdout).strip()}")
    try:
        value = json.loads(proc.stdout)
        # Older builds can print a JSON string containing the object.
        if isinstance(value, str):
            value = json.loads(value)
    except json.JSONDecodeError as exc:
        raise ReaderError("agent-browser eval returned invalid JSON") from exc
    if not isinstance(value, dict):
        raise ReaderError("agent-browser eval returned an unexpected value")
    return value


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target", help="Reddit thread URL, or 'search'")
    parser.add_argument("keywords", nargs="?", help="keywords when target is 'search'")
    parser.add_argument("--sub", help="limit search to this subreddit")
    parser.add_argument("--sort", dest="search_sort", choices=tuple(sorted(SEARCH_SORTS)), default="relevance")
    parser.add_argument("--time", dest="search_time", choices=("hour", "day", "week", "month", "year", "all"), default="all")
    parser.add_argument("--limit", type=int, default=10, help="search results to return (1-100)")
    parser.add_argument("--max-comments", type=int, default=80)
    parser.add_argument("--max-body-chars", type=int, default=2500)
    parser.add_argument("--max-chars", type=int, default=24000)
    parser.add_argument("--expand", type=int, default=8, help="bounded page-loading scroll rounds (0-20)")
    parser.add_argument("--format", choices=("json", "text", "compact"), default="compact")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--close", action="store_true")
    args = parser.parse_args(argv)
    args.search = args.target == "search"
    if args.search and args.keywords is None:
        parser.error("search requires keywords")
    if not args.search and args.keywords is not None:
        parser.error("unexpected second positional argument (thread invocation is URL-first)")
    if not 1 <= args.limit <= 100:
        parser.error("--limit must be between 1 and 100")
    if args.sub is not None:
        candidate = args.sub.removeprefix("r/")
        if not SUBREDDIT.fullmatch(candidate):
            parser.error("--sub must be a Reddit community name (2-21 letters, digits, or underscores)")
        args.sub = candidate
    if not 1 <= args.max_comments <= 1000:
        parser.error("--max-comments must be between 1 and 1000")
    if not 1 <= args.max_body_chars <= 100000:
        parser.error("--max-body-chars must be between 1 and 100000")
    if not 500 <= args.max_chars <= 1000000:
        parser.error("--max-chars must be between 500 and 1000000")
    if not 0 <= args.expand <= 20:
        parser.error("--expand must be between 0 and 20")
    return args


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        PROFILE.mkdir(parents=True, exist_ok=True)
        if args.search:
            url = build_search_url(args.keywords, args.sub, args.search_sort, args.search_time)
            browser_command("open", url, timeout=30)
            # Search is read-only: bounded waits/scrolls, with no result clicks or thread loads.
            browser_command("wait", "1000", timeout=8)
            for _ in range(min(5, max(1, (args.limit + 9) // 10))):
                browser_command("scroll", "down", "1800", timeout=12)
                time.sleep(0.3)
            script = Path(__file__).with_name("extract_search.js").read_text(encoding="utf-8")
            payload = prepare_search_payload(extract_dom(script), args.keywords, args.sub,
                                             args.search_sort, args.search_time, args.limit)
            payload = fit_search_budget(payload, args.max_chars, args.format)
            rendered = render_search(payload, args.format)
        else:
            url = normalize_url(args.target)
            browser_command("open", url, timeout=30)
            # Wait for client-rendered content, not an arbitrary network-idle period.
            browser_command("wait", "shreddit-post", timeout=20)
            # Conservative loading only: bounded scrolling, never click links/buttons
            # (especially reply, vote, login, or navigational "More replies" links).
            for _ in range(args.expand):
                browser_command("scroll", "down", "1600", timeout=12)
                time.sleep(0.25)
            script = Path(__file__).with_name("extract.js").read_text(encoding="utf-8")
            payload = prepare_payload(extract_dom(script), args.max_comments, args.max_body_chars)
            payload = fit_budget(payload, args.max_chars, args.format)
            rendered = render(payload, args.format)
        if args.output:
            args.output.expanduser().parent.mkdir(parents=True, exist_ok=True)
            args.output.expanduser().write_text(rendered, encoding="utf-8")
        else:
            sys.stdout.write(rendered)
        return 0
    except (ValueError, ReaderError, OSError) as exc:
        print(f"reddit-reader: {exc}", file=sys.stderr)
        return 2
    finally:
        if args.close:
            try:
                browser_command("close", timeout=10)
            except ReaderError as exc:
                print(f"reddit-reader: warning: could not close browser: {exc}", file=sys.stderr)


if __name__ == "__main__":
    raise SystemExit(main())
