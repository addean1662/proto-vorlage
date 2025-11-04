# masoretic.py  – Masoretic Hebrew fetcher for Proto-Vorlage AI

import requests
from html import unescape
import re


# ===============================
#  BASIC HTML / TEXT CLEANERS
# ===============================

def strip_html(text: str) -> str:
    """Remove HTML tags and decode entities."""
    if not text:
        return ""
    text = re.sub(r"<.*?>", "", text)   # remove tags
    return unescape(text).strip()


def strip_cantillation(text: str) -> str:
    """Remove vowels + cantillation marks from Hebrew."""
    return re.sub(r"[\u0591-\u05C7]", "", text)


def normalize_hebrew(token: str) -> str:
    """
    Normalize Hebrew final forms and strip vowels/cantillation:
    ך → כ, ם → מ, ן → נ, ף → פ, ץ → צ
    """
    final_map = str.maketrans("ךםןףץ", "כמנהפצ")  # must be 5→5
    token = strip_cantillation(token)
    return token.translate(final_map)


# ===============================
#  SEFARIA REQUEST
# ===============================

def fetch_sefaria(reference: str):
    """Returns raw Hebrew & English from the Sefaria API."""
    url = f"https://www.sefaria.org/api/texts/{reference}?lang=he&with=hebrew"
    res = requests.get(url, timeout=10)

    if res.status_code != 200:
        raise ValueError(f"Sefaria API error {res.status_code}")

    data = res.json()
    heb = strip_html(data.get("he", ["[Hebrew not found]"])[0])
    eng = strip_html(data.get("text", ["[English not found]"])[0])
    return heb, eng


# ===============================
#  PUBLIC API
# ===============================

def get_masoretic_text(reference: str):
    """
    Main public function used by Streamlit app.
    Returns Hebrew + placeholder "gloss" English for now.
    """

    try:
        hebrew_raw, english_raw = fetch_sefaria(reference)

        # Tokenize Hebrew into words (basic split – later improved)
        tokens = hebrew_raw.split()
        normalized = [normalize_hebrew(t) for t in tokens]

        return {
            "original": hebrew_raw,
            "normalized": " ".join(normalized),
            "english": "[Gloss coming soon]",
            "notes": "Source: Sefaria API (Masoretic Text)"
        }

    except Exception as e:
        return {
            "original": "[Error retrieving Hebrew]",
            "normalized": "",
            "english": "[Error retrieving English]",
            "notes": f"Error: {e}"
        }
