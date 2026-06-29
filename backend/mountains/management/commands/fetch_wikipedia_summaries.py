"""
One-off enrichment: replaces the generic "<Name> is listed in the <Collection>
collection." summary (set during the DOBIH import) with a real, brief
description pulled from Wikipedia's summary API — the same source the
mountain detail page already uses for its fuller "About this mountain"
section, just trimmed to one sentence for the card grid.

Uses urllib (stdlib) rather than requests, so no new dependency is needed.
Runs sequentially with a small baseline delay and proper backoff-and-retry
on HTTP 429 (rate limited) — simpler and more correct than throwing
concurrency at an API that's explicitly telling us to slow down.

For names that don't resolve cleanly (404, disambiguation, or a real but
WRONG article — e.g. "Pillar" the Lake District fell vs "Pillar" the
architectural element), falls back to Wikipedia's full-text search API,
using the mountain's region as extra context, then validates the result
actually looks like a landform description before accepting it.

Safe to re-run: skips any mountain whose CURRENT summary is either still
the generic auto-generated text OR doesn't look like a landform
description at all (catches previously wrong matches like Pillar, not
just previously-failed ones).
"""

import json
import re
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request

import certifi
from django.core.management.base import BaseCommand

from mountains.models import Mountain

WIKI_SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/{}"
WIKI_SEARCH_URL = (
    "https://en.wikipedia.org/w/api.php"
    "?action=query&list=search&format=json&srlimit=3&srsearch={}"
)
USER_AGENT = "SummitLogUK/1.0 (https://github.com/TGOSS1984/summitlog-uk)"
GENERIC_SUMMARY_MARKER = "is listed in the"

BASE_DELAY_SECONDS = 0.3   # polite minimum gap between every request
MAX_RETRIES_ON_429 = 4
BACKOFF_SECONDS = 1.5      # doubles each retry: 1.5s, 3s, 6s, 12s

# Short, deliberately landform-specific terms — used to sanity-check that
# a Wikipedia match is actually describing a mountain/hill, not just any
# article that happens to share its exact name (e.g. "Pillar" the
# architectural element, rather than the Lake District fell).
MOUNTAIN_KEYWORDS = [
    "mountain", "hill", "peak", "summit", "fell", "munro", "ridge",
    "massif", "highland", "highest point", "metres above sea level",
    "feet above sea level", "corbett", "nuttall", "elevation of",
]

SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())


def strip_bracketed(name):
    return re.sub(r"\s*\[.*?\]\s*", "", name).strip()


def first_sentence(text):
    if not text:
        return None
    match = re.search(r"^(.*?[.!?])(\s|$)", text)
    return match.group(1).strip() if match else text.strip()


def looks_like_mountain(data):
    """Does this Wikipedia summary actually describe a landform? Checks
    Wikidata's short `description` field first (most reliable — e.g.
    "mountain in the Lake District" vs "architectural element"), falling
    back to the extract text if no description is present."""
    haystack = " ".join([
        (data.get("description") or ""),
        (data.get("extract") or "")[:300],
    ]).lower()
    return any(kw in haystack for kw in MOUNTAIN_KEYWORDS)


def looks_like_mountain_text(text):
    """Same check, but against an already-stored summary sentence —
    used to decide whether a previous run's match needs re-checking."""
    if not text:
        return False
    haystack = text.lower()
    return any(kw in haystack for kw in MOUNTAIN_KEYWORDS)


def fetch_json_with_retry(url):
    """GET any Wikipedia API URL, retrying on 429 with backoff (honouring
    Retry-After if sent). Returns (data, failure_reason)."""
    delay = BACKOFF_SECONDS
    reason = None
    for _ in range(MAX_RETRIES_ON_429 + 1):
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        retry_after = None
        try:
            with urllib.request.urlopen(request, timeout=15, context=SSL_CONTEXT) as response:
                return json.loads(response.read().decode("utf-8")), None
        except urllib.error.HTTPError as e:
            retry_after = e.headers.get("Retry-After") if e.headers else None
            reason = "HTTP 429" if e.code == 429 else f"HTTP {e.code}"
            if e.code != 429:
                return None, reason
        except urllib.error.URLError as e:
            return None, f"URLError: {e.reason}"
        except TimeoutError:
            return None, "timeout"
        except ValueError as e:
            return None, f"bad JSON: {e}"
        except Exception as e:  # noqa: BLE001 — deliberately broad, we log and move on
            return None, f"{type(e).__name__}: {e}"

        wait = float(retry_after) if retry_after and retry_after.replace(".", "", 1).isdigit() else delay
        time.sleep(min(wait, 15))
        delay *= 2
    return None, reason


def fetch_summary_data(title):
    """Exact-title lookup. Returns (data, reason) — data is the raw parsed
    JSON on success (not yet validated as mountain-shaped), so callers can
    inspect it before deciding whether to accept it."""
    url = WIKI_SUMMARY_URL.format(urllib.parse.quote(title))
    data, reason = fetch_json_with_retry(url)
    if data is None:
        return None, reason
    if data.get("type") == "disambiguation" or not data.get("extract"):
        return None, f"no usable extract (type={data.get('type')})"
    return data, None


def search_best_title(query):
    """Top full-text search result's page title, or None."""
    url = WIKI_SEARCH_URL.format(urllib.parse.quote(query))
    data, _reason = fetch_json_with_retry(url)
    if not data:
        return None
    results = data.get("query", {}).get("search", [])
    return results[0]["title"] if results else None


def fetch_wiki_first_sentence(mountain_name, region_name=None):
    """Tries, in order: exact title -> (if "Massif - Top" style) parent
    name -> full-text search (seeded with region for context, to help
    disambiguate generic Gaelic names and avoid wrong-topic matches).
    Each candidate is validated with looks_like_mountain before being
    accepted. Returns (sentence, final_reason)."""
    wiki_name = strip_bracketed(mountain_name)
    candidates = [wiki_name]
    if " - " in wiki_name:
        candidates.append(wiki_name.split(" - ")[0].strip())

    last_reason = None
    for candidate in candidates:
        data, reason = fetch_summary_data(candidate)
        time.sleep(BASE_DELAY_SECONDS)
        if data and looks_like_mountain(data):
            return first_sentence(data["extract"]), None
        last_reason = reason or "matched article is not a landform"

    search_query = f"{wiki_name} mountain" + (f" {region_name}" if region_name else "")
    best_title = search_best_title(search_query)
    time.sleep(BASE_DELAY_SECONDS)
    if best_title:
        data, reason = fetch_summary_data(best_title)
        time.sleep(BASE_DELAY_SECONDS)
        if data and looks_like_mountain(data):
            return first_sentence(data["extract"]), None
        last_reason = f"{last_reason}; search fallback also failed ({reason or 'not a landform'})"

    return None, last_reason


class Command(BaseCommand):
    help = "Enrich generic or wrong-topic mountain summaries with a real Wikipedia-sourced sentence."

    def handle(self, *args, **options):
        mountains = [
            m for m in Mountain.objects.select_related("region").all()
            if not m.summary
            or GENERIC_SUMMARY_MARKER in m.summary
            or not looks_like_mountain_text(m.summary)
        ]
        total = len(mountains)
        self.stdout.write(f"Enriching {total} mountain summaries from Wikipedia...")

        updated, unchanged = 0, 0
        reason_counts = {}
        sample_failures = []

        for i, mountain in enumerate(mountains, start=1):
            sentence, reason = fetch_wiki_first_sentence(
                mountain.name, mountain.region.name if mountain.region else None
            )
            if sentence:
                mountain.summary = sentence
                mountain.save(update_fields=["summary"])
                updated += 1
            else:
                unchanged += 1
                reason_counts[reason] = reason_counts.get(reason, 0) + 1
                if len(sample_failures) < 20:
                    sample_failures.append(f"{mountain.name}: {reason}")

            if i % 50 == 0 or i == total:
                self.stdout.write(f"  ...{i}/{total} processed")

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Updated {updated} summaries from Wikipedia, "
                f"{unchanged} kept their existing/fallback text."
            )
        )

        if reason_counts:
            self.stdout.write("Failure reasons:")
            for reason, count in sorted(reason_counts.items(), key=lambda x: -x[1]):
                self.stdout.write(f"  {count:>4}  {reason}")
            self.stdout.write("Sample failures (first 20):")
            for line in sample_failures:
                self.stdout.write(f"  {line}")