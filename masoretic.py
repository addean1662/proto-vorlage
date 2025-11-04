# masoretic.py

import requests
import re
from html import unescape


def clean_html(text: str) -> str:
    """Remove most HTML tags and footnote clutter using regex only."""
    if not text:
        return text

    # Remove all HTML tags
    text = re.sub(r"<.*?>", " ", text)

    # Remove bracket-style notes like [1], (2), etc
    text = re.sub(r"\[[^\]]*\]|\([^\)]*\)", " ", text)

    # Remove stray asterisks / footnote markers
    text = re.sub(r"\*", " ", text)

    # Collapse extra whitespace
    text = re.sub(r"\s+", " ", text)

    return unescape(text).strip()


def get_masoretic_text(reference: str) -> dict:
    """Fetch Masoretic text from Sefaria API and return cleaned Hebrew + English."""
    try:
        url = f"https://www.sefaria.org/api/texts/{reference}?lang=he&with=hebrew"
        response = requests.get(url, timeout=10)
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
