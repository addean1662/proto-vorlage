# lxx.py  – Septuagint fetcher for Proto-Vorlage AI

import requests
import re
from html import unescape


# ===============================
# VALID BOOK NAMES (full names only)
# ===============================

BOOK_MAP = {
    "genesis": "genesis",
    "exodus": "exodus",
    "leviticus": "leviticus",
    "numbers": "numbers",
    "deuteronomy": "deuteronomy",
    "joshua": "joshua",
    "judges": "judges",
    "ruth": "ruth",
    "1 samuel": "1_samuel",
    "2 samuel": "2_samuel",
    "1 kings": "1_kings",
    "2 kings": "2_kings",
    "1 chronicles": "1_chronicles",
    "2 chronicles": "2_chronicles",
    "ezra": "ezra",
    "nehemiah": "nehemiah",
    "esther": "esther",
    "job": "job",
    "psalms": "psalms",
    "proverbs": "proverbs",
    "ecclesiastes": "ecclesiastes",
    "song of songs": "song_of_songs",
    "isaiah": "isaiah",
    "jeremiah": "jeremiah",
    "lamentations": "lamentations",
    "ezekiel": "ezekiel",
    "daniel": "daniel",
    "hosea": "hosea",
    "joel": "joel",
    "amos": "amos",
    "obadiah": "obadiah",
    "jonah": "jonah",
    "micah": "micah",
    "nahum": "nahum",
    "habakkuk": "habakkuk",
    "zephaniah": "zephaniah",
    "haggai": "haggai",
    "zechariah": "zechariah",
    "malachi": "malachi"
}


# ===============================
# HELPERS
# ===============================

def normalize_reference(ref: str):
    """
    Turns 'Genesis 1:1' into ('genesis', '1', '1').
    Requires the user to type full book name.
    Lower/upper case does not matter.
    """

    ref = ref.strip().lower()

    if ":" not in ref:
        return None, None, None

    try:
        *book_parts, cv = ref.split()
        book_raw = " ".join(book_parts)
        book = BOOK_MAP.get(book_raw)

        if not book:
            return None, None, None

        chapter, verse = cv.split(":")
        return book, chapter, verse

    except Exception:
        return None, None, None


def clean_html(t):
    """Remove HTML tags and entities."""
    return unescape(re.sub(r"<.*?>", "", t)).strip()


# ===============================
# SCRAPER (BibleHub – Greek + Brenton)
# ===============================

def fetch_biblehub_lxx(book, chapter, verse):
    """
    Fetches LXX Greek and Brenton English from BibleHub.
    Example URL: https://biblehub.com/sep/genesis/1.htm
    """

    url = f"https://biblehub.com/sep/{book}/{chapter}.htm"
    headers = {"User-Agent": "Mozilla/5.0"}  # prevents 403 block

    res = requests.get(url, headers=headers, timeout=10)
    if res.status_code != 200:
        raise ValueError(f"HTTP {res.status_code} retrieving {url}")

    html = res.text

    # BibleHub structure:
    # <span class="num">1</span><b>ἐν ἀρχῇ ...</b>     (Greek)
    # <span class="num">1</span><span class="eng">In the beginning...</span>

    greek_match = re.search(
        rf'<span class="num">{verse}</span>\s*<b>(.*?)</b>',
        html,
        flags=re.S
    )

    eng_match = re.search(
        rf'<span class="num">{verse}</span>.*?<span class="eng">(.*?)</span>',
        html,
        flags=re.S
    )

    greek = clean_html(greek_match.group(1)) if greek_match else "[Greek not found]"
    english = clean_html(eng_match.group(1)) if eng_match else "[English not found]"

    return greek, english


# ===============================
# PUBLIC API ENTRY POINT
# ===============================

def get_lxx_text(reference: str):
    """External function called by app.py"""

    book, chapter, verse = normalize_reference(reference)

    if not book:
        return {
            "original": "[Invalid reference]",
            "english": "[Invalid reference]",
            "notes": "Full book name required, e.g. 'Genesis 1:1' (no abbreviations)"
        }

    try:
        greek, english = fetch_biblehub_lxx(book, chapter, verse)
        return {
            "original": greek,
            "english": english,
            "notes": "Source: BibleHub (Rahlfs Greek + Brenton English)"
        }

    except Exception as e:
        return {
            "original": "[Error loading LXX]",
            "english": "[Error loading LXX]",
            "notes": f"Error: {e}"
        }
