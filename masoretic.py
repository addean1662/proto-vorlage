# masoretic.py

import requests
from html import unescape
import re

# ===============================
# FETCH MASORETIC TEXT (Sefaria API)
# ===============================

def get_masoretic_text(reference):
    """
    Fetch full Hebrew text from Sefaria based on reference (e.g. "Genesis 1:1").
    Returns Hebrew and English string portions with notes.
    """
    try:
        url = f"https://www.sefaria.org/api/texts/{reference}?lang=he&with=hebrew"
        response = requests.get(url)
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


# ===============================
# CLEAN HTML HELPER
# ===============================

def clean_html(text):
    """Remove markup and HTML entities, preserve niqqud."""
    return (
        unescape(text)
        .replace("<br>", "")
        .replace("<i>", "")
        .replace("</i>", "")
        .strip()
    )


# ===============================
# STRIP MARKS (OPTIONAL)
# ===============================

def strip_cantillation(hebrew):
    """Remove cantillation marks but preserve vowels (niqqud)."""
    return re.sub(r"[\u0591-\u05AF]", "", hebrew)  # Hebrew accents range


# ===============================
# UTILITY FOR STREAMLIT VIEW
# ===============================

def format_gloss_vertical(tokens, glosses):
    """
    Format Hebrew + English gloss as stacked text:
    בְּרֵאשִׁית
    In-beginning

    בָּרָא
    He-created
    """
    out = []
    for heb, eng in zip(tokens, glosses):
        out.append(f"{heb}\n{eng}\n")
    return "\n".join(out)


# ===============================
# PUBLIC FOR APP — EXTRACT + GLOSS
# ===============================

def get_masoretic_with_gloss(reference, gloss_engine):
    """
    Combines clean Hebrew source (this file) with gloss lookup (from gloss_masoretic.py).
    gloss_engine: a glossing function that receives a Hebrew word and returns an English token.
    """
    data = get_masoretic_text(reference)
    hebrew_text = data.get("original", "")
    tokens = hebrew_text.split()  # naive tokenization (space-split)

    glosses = [gloss_engine(token) for token in tokens]
    glossed = format_gloss_vertical(tokens, glosses)

    return {
        "original": hebrew_text,
        "glossed": glossed,
        "notes": data.get("notes", "")
    }
