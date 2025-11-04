# lxx.py  – Septuagint fetcher for Proto-Vorlage AI (BibleHub scraper, regex-only)

import requests
import re
from html import unescape

# ===============================
# BOOK NAME MAP (BibleHub format)
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
    """Turns 'Genesis 1:1' into ('genesis', '1', '1')"""
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


def clean_html(text: str) -> str:
    """Strip HTML tags and collapse whitespace."""
    if not text:
        return text
    text = re.sub(r"<.*?>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return unescape(text).strip()


# ===============================
# SCRAPER (BibleHub – Rahlfs Greek & Brenton English)
# ===============================

def fetch_biblehub_lxx(book, chapter, verse):
    url = f"https://biblehub.com/sep/{book}/{chapter}.htm"
    headers = {"User-Agent": "Mozilla/5.0"}
    res = requests.get(url, headers=headers, timeout=10)

    if res.status_code != 200:
        raise ValueError(f"HTTP {res.status_code} retrieving {url}")

    html = res.text

    # Match Greek (LXX) – uses <span class="text lxx">
    greek_match = re.search(
        rf'<span class="num">{verse}</span>\s*<span class="text lxx">(.*?)</span>',
        html,
        flags=re.S
    )

    # Match Brenton English – appears in separate <div class="p eng">
    eng_match = re.search(
        rf'<div class="p eng">.*?<span class="num">{verse}</span>\s*<span class="text">(.*?)</span>',
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
    book, chapter, verse = normalize_reference(reference)

    if not book:
        return {
            "original": "[Invalid reference]",
            "english": "[Invalid reference]",
            "notes": "Full book name required (e.g. 'Genesis 1:1')"
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
