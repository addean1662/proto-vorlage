# masoretic.py – Full Hebrew Token + Gloss A Loader for Proto-Vorlage AI

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
    return [normalize_hebrew(token) for token in tokens]


# ===============================
# Gloss A Dictionary
# ===============================

# A small sample; full version would include all biblical lemmas
GLOSS_DICT = {
    "בראשית": "in-beginning",
    "ברא": "he-created",
    "אלהים": "God",
    "את": "[obj]",
    "השמים": "the-heavens",
    "ואת": "and-[obj]",
    "הארץ": "the-earth",
    # Add more lemma: gloss mappings here...
}

def gloss_tokens(lemmas):
    """Maps Hebrew lemmas to English glosses using GLOSS_DICT."""
    return [GLOSS_DICT.get(lemma, f"[{lemma}]") for lemma in lemmas]


# ===============================
# Masoretic Functions
# ===============================

def get_masoretic_glossed_text(reference):
    """
    Fetches Hebrew verse from Sefaria, tokenizes, lemmatizes, and glosses.
    Returns tokens (original), lemmas (normalized), and glosses.
    """
    try:
        url = f"https://www.sefaria.org/api/texts/{reference}?lang=he&with=hebrew"
        res = requests.get(url)
        data = res.json()

        raw_hebrew = data.get("he", ["[Hebrew not found]"])[0]
        tokens = tokenize_hebrew(raw_hebrew)
        lemmas = lemmatize_tokens(tokens)
        glosses = gloss_tokens(lemmas)

        return {
            "reference": reference,
            "tokens": tokens,
            "lemmas": lemmas,
            "glosses": glosses,
            "notes": "Source: Sefaria (Masoretic) + Proto-Vorlage Gloss Dict"
        }

    except Exception as e:
        return {
            "reference": reference,
            "tokens": [],
            "lemmas": [],
            "glosses": [],
            "notes": f"Error: {e}"
        }


# ===============================
# Backwards compatibility
# ===============================

def get_masoretic_text(reference):
    """
    Original function used in your app.py.
    Returns Hebrew + placeholder English until gloss is fully integrated.
    """
    data = get_masoretic_glossed_text(reference)
    return {
        "original": " ".join(data["tokens"]),
        "english": " ".join(data["glosses"]) or "[Gloss coming soon]",
        "notes": data["notes"]
    }
