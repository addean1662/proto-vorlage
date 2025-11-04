# masoretic.py

import requests
import re
from bs4 import BeautifulSoup
from html import unescape


def clean_html(text: str) -> str:
    """Remove HTML tags, footnotes, and extra whitespace from Sefaria text."""
    if not text:
        return text

    # Strip all HTML tags
    soup = BeautifulSoup(text, "html.parser")
    cleaned = soup.get_text(separator=" ")

    # Remove inline footnote markers like * or (a)
    cleaned = re.sub(r"\[\d+]", "", cleaned)          # [1], [2], etc.
    cleaned = re.sub(r"\(\d+\)", "", cleaned)         # (1), (2), etc.
    cleaned = re.sub(r"\s*\*\s*", " ", cleaned)       # stray asterisks
    cleaned = re.sub(r"\s+", " ", cleaned)            # collapse whitespace

    return unescape(cleaned).strip()


def get_masoretic_text(reference: str) -> dict:
    """Fetch Hebrew + English Masoretic text from Sefaria API and sanitize it."""
    try:
        api_url = f"https://www.sefaria.org/api/texts/{reference}?lang=he&with=hebrew"
        response = requests.get(api_url, timeout=10)
        data = response.json()

        hebrew_raw = data.get("he", ["[Hebrew not found]"])[0]
        english_raw = data.get("text", ["[English not found]"])[0]

        return {
            "original": clean_html(hebrew_raw),
            "english": clean_html(english_raw),
            "notes": "Source: Sefaria.org (Masoretic Text)"
        }

    except Exception as e:
        return {
            "original": "[Error retrieving Hebrew]",
            "english": "[Error retrieving English]",
            "notes": f"Error: {e}"
        }
