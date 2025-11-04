# masoretic.py — Clean Masoretic fetcher (no maketrans), safe for Streamlit Cloud

import requests
from html import unescape
import re

# -----------------------------
# Helpers
# -----------------------------

def strip_html(text: str) -> str:
    """Remove HTML tags and decode entities."""
    if not text:
        return ""
    text = re.sub(r"<.*?>", "", text)       # strip tags
    return unescape(text).strip()

def strip_cantillation(text: str) -> str:
    """Remove vowels and cantillation from Hebrew (niqqud + trope)."""
    return re.sub(r"[\u0591-\u05C7]", "", text)

def normalize_hebrew(token: str) -> str:
    """
    Normalize Hebrew final forms WITHOUT maketrans to avoid platform issues.
    ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ
    """
    if not token:
        return token
    token = strip_cantillation(token)
    repl = {"ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ"}
    return "".join(repl.get(ch, ch) for ch in token)

def tokenize_hebrew(text: str) -> list:
    """Basic tokenization: remove punctuation marks and split on whitespace."""
    if not text:
        return []
    # remove maqaf and common punctuators
    text = re.sub(r"[,:;־׃]", " ", text)
    tokens = [w for w in text.split() if w.strip()]
    return tokens

# -----------------------------
# Sefaria fetch
# -----------------------------

def fetch_sefaria(reference: str):
    """
    Returns (hebrew, english) raw strings from Sefaria or raises ValueError
    if the reference is invalid or the API returns non-200.
    """
    url = f"https://www.sefaria.org/api/texts/{reference}?lang=he&with=hebrew"
    res = requests.get(url, timeout=10)

    if res.status_code != 200:
        raise ValueError(f"Sefaria API error {res.status_code}")

    data = res.json()
    # Sefaria returns arrays; empty or missing means invalid verse
    heb_list = data.get("he") or []
    eng_list = data.get("text") or []

    heb = strip_html(heb_list[0]) if heb_list else ""
    eng = strip_html(eng_list[0]) if eng_list else ""

    if not heb and not eng:
        raise ValueError("Verse not found in Sefaria for given reference")

    return heb, eng

# -----------------------------
# Public API
# -----------------------------

def get_masoretic_text(reference: str):
    """
    Main function used by app.py.
    - Returns original Hebrew (with niqqud),
    - A normalized Hebrew (no niqqud, final forms normalized),
    - Placeholder English until glossing is implemented,
    - Notes for the UI.
    """
    try:
        hebrew_raw, english_raw = fetch_sefaria(reference)

        tokens = tokenize_hebrew(hebrew_raw)
        normalized_tokens = [normalize_hebrew(t) for t in tokens]
        normalized_str = " ".join(normalized_tokens)

        return {
            "original": hebrew_raw or "[Hebrew not found]",
            "normalized": normalized_str,               # useful for debugging/glossing
            "english": "[Gloss coming soon]",           # will be replaced by Gloss A
            "notes": "Source: Sefaria API (Masoretic Text)"
        }

    except Exception as e:
        # Never crash the app; return a clean error payload
        return {
            "original": "[Error retrieving Hebrew]",
            "normalized": "",
            "english": "[Error retrieving English]",
            "notes": f"Error: {e}"
        }
