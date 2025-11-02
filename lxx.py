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
    "1 samuel": "1_samuel", "1sam": "1_samuel",
    "2 samuel": "2_samuel", "2sam": "2_samuel",
    "1 kings": "1_kings", "1kings": "1_kings",
    "2 kings": "2_kings", "2kings": "2_kings",
    "1 chronicles": "1_chronicles", "1chron": "1_chronicles",
    "2 chronicles": "2_chronicles", "2chron": "2_chronicles",
    "ezra": "ezra",
    "nehemiah": "nehemiah", "neh": "nehemiah",
    "tobit": "tobit", "tob": "tobit",
    "judith": "judith", "jud": "judith",
    "esther": "esther", "esth": "esther",
    "job": "job",
    "psalms": "psalms", "ps": "psalms",
    "proverbs": "proverbs", "prov": "proverbs", "pr": "proverbs",
    "ecclesiastes": "ecclesiastes", "eccl": "ecclesiastes",
    "song of songs": "song_of_songs", "song": "song_of_songs",
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
    chapter, verse = parts[-1].split(":")
    return book, chapter, verse


def clean_html(text):
    return unescape(text).replace("<br>", "").replace('</span>', '').strip()


def fetch_elpenor_greek(book, chapter, verse):
    """Scrapes Elpenor.net for the Greek LXX text."""
    url = f"https://www.ellopos.net/elpenor/greek-texts/septuagint/{book}/{chapter}.htm"
    res = requests.get(url, timeout=10)
    res.raise_for_status()
    match = re.search(rf"<b>{verse}\.</b>(.*?)<br>", res.text, flags=re.S)
    return clean_html(match.group(1)) if match else "[Greek not found]"


def fetch_brenton_english(book, chapter, verse):
    """Scrapes BibleHub.com for Brenton English translation."""
    url = f"https://biblehub.com/sep/{book}/{chapter}.htm"
    res = requests.get(url, timeout=10)
    res.raise_for_status()
    match = re.search(rf"<span class=\"verse\" id=\"{verse}\">(.*?)</span>", res.text, flags=re.S)
    return clean_html(match.group(1)) if match else "[English not found]"


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
        greek = fetch_elpenor_greek(book, chapter, verse)
        english = fetch_brenton_english(book, chapter, verse)
        return {
            "original": greek,
            "english": english,
            "notes": "Sources: Elpenor (Greek), Brenton (public domain)"
        }
    except Exception as e:
        return {
            "original": "[Error loading LXX Greek]",
            "english": "[Error loading LXX English]",
            "notes": f"Error: {e}"
        }
