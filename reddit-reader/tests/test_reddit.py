import importlib.util
import json
from pathlib import Path
import unittest

MODULE_PATH = Path(__file__).parents[1] / "scripts" / "reddit.py"
spec = importlib.util.spec_from_file_location("reddit_reader", MODULE_PATH)
reddit = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(reddit)


class FormatTests(unittest.TestCase):
    def test_compact_default_and_verbose_opt_in(self):
        url = 'https://www.reddit.com/comments/abc123/title/'
        self.assertEqual(reddit.parse_args([url]).format, 'compact')
        self.assertEqual(reddit.parse_args([url, '--format', 'json']).format, 'json')
        self.assertEqual(reddit.parse_args([url, '--format', 'text']).format, 'text')


class SearchTests(unittest.TestCase):
    def test_url_generation_encodes_query_and_subreddit(self):
        self.assertEqual(
            reddit.build_search_url("atlas unlock & maps", "PathOfExile2", "top", "week"),
            "https://www.reddit.com/r/PathOfExile2/search/?q=atlas+unlock+%26+maps&restrict_sr=1&sort=top&t=week",
        )
        self.assertEqual(
            reddit.build_search_url("python tips"),
            "https://www.reddit.com/search/?q=python+tips&sort=relevance&t=all",
        )

    def test_rejects_invalid_search_inputs(self):
        for kwargs in ({"keywords": "   "}, {"keywords": "x", "sub": "bad/name"},
                       {"keywords": "x", "sort": "best"}, {"keywords": "x", "time_filter": "forever"}):
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                reddit.build_search_url(**kwargs)

    def test_cli_parsing_preserves_url_first_and_search_formats(self):
        url = "https://reddit.com/comments/abc123/title/"
        self.assertFalse(reddit.parse_args([url]).search)
        args = reddit.parse_args(["search", "atlas unlock", "--sub", "r/PathOfExile2",
                                  "--sort", "new", "--time", "month", "--limit", "7",
                                  "--format", "json", "--max-chars", "9000"])
        self.assertTrue(args.search)
        self.assertEqual((args.keywords, args.sub, args.search_sort, args.search_time, args.limit),
                         ("atlas unlock", "PathOfExile2", "new", "month", 7))
        self.assertEqual((args.format, args.max_chars), ("json", 9000))

    def test_search_budget_is_valid_and_ranked(self):
        raw = {"rendered_result_count": 3, "results": [
            {"title": f"Result {i} " + "x" * 100, "subreddit": "r/test",
             "preview": "body " * 100, "permalink": f"https://www.reddit.com/r/test/comments/{i}/x/"}
            for i in range(3)
        ]}
        payload = reddit.prepare_search_payload(raw, "query", None, "relevance", "all", 3)
        fitted = reddit.fit_search_budget(payload, 700, "json")
        output = reddit.render_search(fitted, "json")
        self.assertLessEqual(len(output), 700)
        decoded = json.loads(output)
        self.assertEqual([x["rank"] for x in decoded["results"]],
                         list(range(1, len(decoded["results"]) + 1)))
        self.assertTrue(decoded["coverage"]["truncated"])

    def test_search_compact_has_requested_fields(self):
        raw = {"results": [{"title": "Atlas help", "subreddit": "r/PathOfExile2",
                            "preview": "A short preview", "permalink": "https://reddit.example/thread"}]}
        output = reddit.render_search(
            reddit.prepare_search_payload(raw, "atlas", "PathOfExile2", "hot", "day", 10), "compact")
        self.assertIn("1. Atlas help — r/PathOfExile2", output)
        self.assertIn("A short preview", output)
        self.assertIn("https://reddit.example/thread", output)
        self.assertIn("partial search DOM", output)


class NormalizeUrlTests(unittest.TestCase):
    def test_normalizes_host_and_retains_comment_permalink_and_sort(self):
        value = reddit.normalize_url(
            "http://old.reddit.com/r/python/comments/abc123/a_post/comment/def456?utm_source=x&sort=TOP#x"
        )
        self.assertEqual(
            value,
            "https://www.reddit.com/r/python/comments/abc123/a_post/comment/def456/?sort=top",
        )

    def test_strips_unapproved_query_parameters(self):
        self.assertEqual(
            reddit.normalize_url("https://reddit.com/comments/abc123/title/?context=9"),
            "https://www.reddit.com/comments/abc123/title/",
        )

    def test_rejects_lookalike_host_bad_path_and_bad_sort(self):
        bad = [
            "https://reddit.com.example/r/x/comments/abc/title",
            "https://www.reddit.com/r/python/",
            "https://www.reddit.com/r/x/comments/abc/title?sort=random",
        ]
        for value in bad:
            with self.subTest(value=value), self.assertRaises(ValueError):
                reddit.normalize_url(value)


class OutputLimitTests(unittest.TestCase):
    def raw(self):
        return {
            "url": "https://www.reddit.com/r/x/comments/post/title/",
            "post": {"id": "t3_post", "title": "Title", "body": "p" * 30,
                     "author": "op", "score": "12", "permalink": "https://reddit/post"},
            "reported_comment_count": 50,
            "comments": [
                {"id": "t1_a", "parent": "t3_post", "author": "a", "score": "4", "body": "a" * 30, "permalink": "a"},
                {"id": "t1_b", "parent": "t1_a", "author": "b", "score": "3", "body": "b" * 30, "permalink": "b"},
                {"id": "t1_c", "parent": "t1_b", "author": "c", "score": "2", "body": "c" * 30, "permalink": "c"},
            ],
            "more_links": ["m1", "m2"],
        }

    def test_body_and_comment_limits(self):
        payload = reddit.prepare_payload(self.raw(), max_comments=2, max_body_chars=10)
        self.assertEqual(len(payload["comments"]), 2)
        self.assertEqual(len(payload["post"]["body"]), 10)
        self.assertTrue(payload["post"]["body"].endswith("…"))
        self.assertEqual(payload["coverage"]["extracted_count"], 3)
        self.assertEqual(payload["coverage"]["returned_count"], 2)
        self.assertTrue(payload["coverage"]["truncated"])

    def test_orphans_are_removed(self):
        comments = [
            {"id": "t1_child", "parent": "t1_missing"},
            {"id": "t1_root", "parent": "t3_post"},
        ]
        self.assertEqual([x["id"] for x in reddit.retain_parented(comments, "t3_post")], ["t1_root"])

    def test_global_budget_keeps_json_valid_and_parent_chains(self):
        payload = reddit.prepare_payload(self.raw(), max_comments=3, max_body_chars=30)
        full_size = len(reddit.render(payload, "json"))
        fitted = reddit.fit_budget(payload, full_size - 100, "json")
        rendered = reddit.render(fitted, "json")
        self.assertLessEqual(len(rendered), full_size - 100)
        decoded = json.loads(rendered)
        ids = {item["id"] for item in decoded["comments"]}
        for item in decoded["comments"]:
            if item["parent"].startswith("t1_"):
                self.assertIn(item["parent"], ids)
        self.assertEqual(decoded["coverage"]["returned_count"], len(decoded["comments"]))
        self.assertTrue(decoded["coverage"]["truncated"])

    def test_compact_content_and_reply_tree(self):
        raw = self.raw()
        raw['comments'][1]['body'] = 'reply\n- not a new comment'
        payload = reddit.prepare_payload(raw, 3, 100)
        rendered = reddit.render(payload, 'compact')
        lines = rendered.splitlines()
        self.assertTrue(lines[0].startswith('T "Title"'))
        self.assertTrue(lines[2].startswith('- '))
        self.assertTrue(lines[3].startswith('  - '))
        self.assertTrue(lines[4].startswith('    - '))
        self.assertTrue(lines[1].startswith('P "op": '))
        self.assertTrue(lines[3].startswith('  - "b": '))
        self.assertEqual(json.loads(lines[3].split(': ', 1)[1]), raw['comments'][1]['body'])
        self.assertNotIn('t1_', rendered)
        self.assertNotIn('permalink', rendered)
        self.assertNotIn('score', rendered)
        self.assertEqual(lines[-1], '[partial; 3 comments]')

    def test_compact_budget(self):
        payload = reddit.prepare_payload(self.raw(), 3, 30)
        size = len(reddit.render(payload, 'compact')) - 25
        fitted = reddit.fit_budget(payload, size, 'compact')
        output = reddit.render(fitted, 'compact')
        self.assertLessEqual(len(output), size)
        self.assertIn('; truncated]', output)

    def test_text_budget(self):
        payload = reddit.prepare_payload(self.raw(), max_comments=3, max_body_chars=30)
        fitted = reddit.fit_budget(payload, 550, "text")
        self.assertLessEqual(len(reddit.render(fitted, "text")), 550)


if __name__ == "__main__":
    unittest.main()
