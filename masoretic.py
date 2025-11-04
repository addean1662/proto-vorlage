# masoretic.py — Part 2a: Add Hebrew Lemmatization

import requests
import re

# ===============================
# Helpers
# ===============================

def strip_cantillation(text):
    """Removes cantillation marks and vowels (niqqud) from Hebrew text."""
    return re.sub(r'[\u0591-\u05C7]', '', text)

def normalize_hebrew(token):
    """
    Normalize Hebrew final forms and strip vowels/cantillation:
    ך → כ, ם → מ, ן → נ, ף → פ, ץ → צ
    """
    final_map = str.maketrans("ךםןףץ", "כמנהפצ")
    token = strip_cantillation(token)
    return token.translate(final_map)

def tokenize_hebrew(text):
    """Splits Hebrew text into word tokens."""
    text = re.sub(r'[,:;־׃]', ' ', text)  # remove punctuation
    return [w for w in text.split() if w.strip()]

def lemmatize_tokens(tokens):
    """Return normalized lemma candidates for Hebrew tokens."""
    lemmas = [normalize_hebrew(token) for token in tokens]
    return lemmas

# ===============================
# Masoretic Functions
# ===============================

def get_masoretic_tokens_and_lemmas(reference):
    """
    Fetches Hebrew verse from Sefaria, tokenizes and lemmatizes.
    Returns tokens (original) and lemmas (normalized roots).
    """
    try:
        url = f"https://www.sefaria.org/api/texts/{reference}?lang=he&with=hebrew"
        res = requests.get(url)
        data = res.json()

        raw_hebrew = data.get("he", ["[Hebrew not found]"])[0]
        tokens = tokenize_hebrew(raw_hebrew)
        lemmas = lemmatize_tokens(tokens)

        return {
            "reference": reference,
            "tokens": tokens,
            "lemmas": lemmas,
            "notes": "Source: Sefaria API (Masoretic Text)"
        }

    except Exception as e:
        return {
            "reference": reference,
            "tokens": [],
            "lemmas": [],
            "notes": f"Error: {e}"
        }

# ===============================
# Backwards compatibility
# ===============================

def get_masoretic_text(reference):
    """
    Original function used in your app.py.
    Leaves English as a placeholder for now.
    """
    data = get_masoretic_tokens_and_lemmas(reference)
    return {
        "original": " ".join(data["tokens"]),
        "english": "[Word-for-word gloss coming soon]",
        "notes": data["notes"]
    }
