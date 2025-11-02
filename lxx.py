# lxx.py
import requests
import re
from html import unescape

# ===============================
# BOOK NORMALIZATION TABLE
# ===============================

BOOK_MAP = {
    "genesis": "genesis", "gen": "genesis",
    "exodus": "exodus", "exo": "exodus",
    "leviticus": "leviticus", "lev": "leviticus",
    "numbers": "numbers", "num": "numbers",
    "deuteronomy": "deuteronomy", "deut": "deuteronomy",

    "joshua": "joshua", "josh": "joshua",
    "judges": "judges", "judg": "judges",
    "ruth": "ruth",

    "1 samuel": "1_samuel", "1sam": "1_samuel", "1sa": "1_samuel",
    "2 samuel": "2_samuel", "2sam": "2_samuel", "2sa": "2_samuel",
    "1 kings": "1_kings", "1ki": "1_kings",
    "2 kings": "2_kings", "2ki": "2_kings",
    
    "1 chronicles": "1_chronicles", "1chron": "1_chronicles", "1ch": "1_chronicles",
    "2 chronicles": "2_chronicles", "2chron": "2_chronicles", "2ch": "2_chronicles",
    
    "ezra": "ezra",
    "nehemiah": "nehemiah", "neh": "nehemiah",
    "esther": "esther", "esth": "esther",
    "job": "job",
    "psalms": "psalms", "ps": "psalms",
    "proverbs": "proverbs", "prov": "proverbs", "pr": "proverbs",
    "ecclesiastes": "ecclesiastes", "eccl": "ecclesiastes",
    "song of songs": "song_of_songs", "song": "song_of_songs", "sos": "song_of_songs",
    
    "isaiah": "isaiah", "isa": "isaiah",
    "jeremiah": "jeremiah", "jer": "jeremiah",
    "lamentations": "lamentations", "lam": "lamentations",
    "ezekiel": "ezekiel", "ezek": "ezekiel",
    "daniel": "daniel", "dan": "daniel",
    
    "hosea": "hosea", "hos": "hosea",
    "joel": "joel",
    "amos": "amos",
    "obadiah": "obadiah", "obad": "obadiah",
    "jonah": "jonah", "jon": "jonah",
    "micah": "micah", "mic": "micah",
    "nahum": "nahum",
    "habakkuk": "habakkuk", "hab": "habakkuk",
    "zephaniah": "zephaniah", "zeph": "zephaniah",
    "haggai": "haggai", "hag": "haggai",
    "zechariah": "zechariah", "zech": "zechariah",
    "malachi": "malachi", "mal": "malachi",
}

# ===============================
# HELPERS
# ===============================

def normalize_reference(ref):
    """Convert user input like 'Gen 1:1' to ('genesis', '1', '1')."""
    ref = ref.strip().lower()
    parts = ref.split()
    if len(parts) < 2 or ":" not in parts[-1]:
        return None, None, None
    book_raw = " ".join(parts[:-1])
    book = BOOK_MAP.get(book_raw, None)
    if not book:
        return None, None, None
    chapter, verse = parts[-1].split(":")
    return book, chapter, verse


def clean_html(text):
    """Remove unwanted HTML entities and tags."""
    return unescape(text).replace("<br>", "").replace("</b>", "").replace("</span>", "").strip()


# ===============================
# SCRAPER
# ===============================

def fetch_biblehub_lxx(book, chapter, verse):
    """
    Fetches Greek and English (Brenton) text from BibleHub.
    Example URL:
    https://biblehub.com/sep/genesis/1.htm
    """
    url = f"https://biblehub.com/sep/{book}/{chapter}.htm"
    res = requests.get(url, timeout=10)
    res.raise_for_status()

    # Search for the specific verse block
    pattern = rf'<span class="verse" id="{verse}">\s*(.*?)\s*</span>'
    match = re.search(pattern, res.text, flags=re.S)
    if not match:
        return "[Greek not found]", "[English not found]"

    verse_html = match.group(1)

    # Split Greek (in <b>...</b>) and English text below
    greek = re.search(r"<b>(.*?)</b>", verse_html, flags=re.S)
    greek_text = clean_html(greek.group(1)) if greek else "[Greek missing]"

    # English text follows immediately after bold section
    english = re.sub(r"<b>.*?</b>", "", verse_html, flags=re.S)
    english_text = clean_html(english)

    return greek_text, english_text


# ===============================
# MAIN API
# ===============================

def get_lxx_text(reference: str):
    """Public function: get Greek + English for a given verse reference."""
    book, chapter, verse = normalize_reference(reference)
    if not book:
        return {
            "original": "[Invalid reference]",
            "english": "[Invalid reference]",
            "notes": "Use format like 'Genesis 1:1' or 'Isaiah 7:14'"
        }

    try:
        greek, english = fetch_biblehub_lxx(book, chapter, verse)
        return {
            "original": greek,
            "english": english,
            "notes": "Source: BibleHub (Rahlfs LXX + Brenton English)"
        }
    except Exception as e:
        return {
            "original": "[Error loading LXX Greek]",
            "english": "[Error loading LXX English]",
            "notes": f"Error: {e}"
        }
