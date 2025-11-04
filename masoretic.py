# masoretic.py — Part 1: Raw Hebrew Token Extraction (with backward compatibility)

import requests
import re

def strip_cantillation(text):
    """Removes cantillation marks and vowels (niqqud) from Hebrew text."""
    return re.sub(r'[\u0591-\u05C7]', '', text)

def tokenize_hebrew(text):
    """Splits Hebrew text into word tokens."""
    text = re.sub(r'[,:;־׃]', ' ', text)  # remove punctuation
    return [w for w in text.split() if w.strip()]

def get_masoretic_tokens(reference, strip_vowels=False):
    """Fetches raw Hebrew text from Sefaria and returns tokenized output."""
    try:
        url = f"https://www.sefaria.org/api/texts/{reference}?lang=he&with=hebrew"
        res = requests.get(url)
        data = res.json()

        raw_hebrew = data.get("he", ["[Hebrew not found]"])[0]

        if strip_vowels:
            raw_hebrew = strip_cantillation(raw_hebrew)

        tokens = tokenize_hebrew(raw_hebrew)

        return {
            "reference": reference,
            "raw_text": raw_hebrew,
            "tokens": tokens,
            "notes": "Source: Sefaria API (Masoretic Text)"
        }

    except Exception as e:
        return {
            "reference": reference,
            "raw_text": "[Error]",
            "tokens": [],
            "notes": f"Error: {e}"
        }

# ✅ Backwards compatibility for existing Streamlit app
def get_masoretic_text(reference):
    """
    Original function name expected by app.py.
    Returns only the raw Hebrew and placeholder English until gloss is added.
    """
    data = get_masoretic_tokens(reference)
    return {
        "original": data["raw_text"],
        "english": "[Glossed English coming soon]",
        "notes": data["notes"]
    }
