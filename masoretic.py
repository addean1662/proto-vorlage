# masoretic.py — Part 1: Raw Hebrew Token Extraction

import requests
import re

def strip_cantillation(text):
    """
    Removes cantillation marks and vowels (niqqud) from Hebrew text.
    Use if you want just the consonantal text.
    """
    # Unicode range for Hebrew vowels + trope + points
    return re.sub(r'[\u0591-\u05C7]', '', text)

def tokenize_hebrew(text):
    """
    Splits Hebrew text into word tokens.
    Removes punctuation such as sof pasuq, comma, etc.
    Keeps final forms intact: ך ם ן ף ץ
    """
    # Remove punctuation like maqaf, comma, sof pasuq, etc.
    text = re.sub(r'[,:;־׃]', ' ', text)
    # Split on whitespace
    return [w for w in text.split() if w.strip()]

def get_masoretic_tokens(reference, strip_vowels=False):
    """
    Fetches Hebrew verse text from Sefaria and returns a list of tokens.
    Example: get_masoretic_tokens("Genesis 1:1")
    """
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
        }

    except Exception as e:
        return {
            "reference": reference,
            "raw_text": "[Error]",
            "tokens": [],
            "error": str(e),
        }
