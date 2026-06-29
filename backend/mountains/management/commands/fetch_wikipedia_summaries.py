"""
One-off enrichment: replaces the generic "<Name> is listed in the <Collection>
collection." summary (set during the DOBIH import) with a real, brief
description pulled from Wikipedia's summary API — the same source the
mountain detail page already uses for its fuller "About this mountain"
section, just trimmed to one sentence for the card grid.

Uses urllib (stdlib) rather than requests, so no new dependency is needed.
Runs with a small thread pool so ~800 mountains complete in well under a
minute rather than several, given each is an independent network call.

Safe to re-run: skips any mountain whose summary is already something other
than the generic auto-generated text, so a partial run can be resumed.
"""

import json
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

import certifi
from django.core.management.base import BaseCommand

from mountains.models import Mountain

WIKI_SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/{}"
USER_AGENT = "SummitLogUK/1.0 (https://github.com/TGOSS1984/summitlog-uk)"
GENERIC_SUMMARY_MARKER = "is listed in the"
MAX_WORKERS = 8

# Use certifi's independently-maintained certificate bundle rather than
# whatever the OS trust store happens to have — avoids platform-specific
# SSL issues (e.g. a stale/intercepted store on some Windows machines)
# that have nothing to do with Wikipedia's actual certificate.
SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())


def strip_bracketed(name):
    """Matches the same normalisation WikiSummary uses on the frontend —
    "Ben Nevis [Beinn Nibheis]" -> "Ben Nevis" — since Wikipedia article
    titles don't include the bracketed translation."""
    return re.sub(r"\s*\[.*?\]\s*", "", name).strip()


def first_sentence(text):
    if not text:
        return None
    match = re.search(r"^(.*?[.!?])(\s|$)", text)
    return match.group(1).strip() if match else text.strip()


def fetch_wiki_first_sentence(mountain_name):
    wiki_name = strip_bracketed(mountain_name)
    url = WIKI_SUMMARY_URL.format(urllib.parse.quote(wiki_name))
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=10, context=SSL_CONTEXT) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError):
        return None

    if data.get("type") == "disambiguation" or not data.get("extract"):
        return None

    return first_sentence(data["extract"])


class Command(BaseCommand):
    help = "Enrich generic mountain summaries with a brief Wikipedia-sourced sentence."

    def handle(self, *args, **options):
        mountains = [
            m for m in Mountain.objects.all()
            if not m.summary or GENERIC_SUMMARY_MARKER in m.summary
        ]
        total = len(mountains)
        self.stdout.write(f"Enriching {total} mountain summaries from Wikipedia...")

        updated, unchanged = 0, 0

        def process(mountain):
            sentence = fetch_wiki_first_sentence(mountain.name)
            return mountain, sentence

        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
            futures = [pool.submit(process, m) for m in mountains]
            for i, future in enumerate(as_completed(futures), start=1):
                mountain, sentence = future.result()
                if sentence:
                    mountain.summary = sentence
                    mountain.save(update_fields=["summary"])
                    updated += 1
                else:
                    unchanged += 1
                if i % 50 == 0 or i == total:
                    self.stdout.write(f"  ...{i}/{total} processed")

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Updated {updated} summaries from Wikipedia, "
                f"{unchanged} kept their existing/fallback text."
            )
        )