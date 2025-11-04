# gloss_masoretic.py

from masoretic import get_masoretic_text
import re

# ===============================
# BASIC HEBREW LEXICON (seed)
# Expand over time as needed
# ===============================
LEXICON = {
    "בראשית": "beginning",
    "ברא": "created",
    "אלהים": "God",
    "את": "[obj]",
    "השמים": "the-heavens",
    "הארץ": "the-earth",
    "ו": "and",  # used for combining prefix glosses
    "ה": "the",  # prefix
}


# ===============================
# NORMALIZATION HELPERS
# ===============================

def strip_vowels_and_dagesh(word):
    """Remove Hebrew vowels, cantillation, and diacritics."""
    return re.sub(r"[\u0591-\u05C7]", "", word)


def normalize_final_letters(word):
    """Convert final letters ךםןףץ → כמןפצ."""
    final_map = str.maketrans("ךםןףץ", "כמןפצ")
    return word.translate(final_map)


def normalize_hebrew(word):
    """Apply full Hebrew normalization pipeline."""
    word = strip_vowels_and_dagesh(word)
    word = normalize_final_letters(word)
    return word


# ===============================
# TOKENIZATION
# ===============================

def tokenize_hebrew(text):
    """
    Split a verse into individual Hebrew words.
    Assumes words already have spaces between them.
    """
    tokens = text.split()
    return tokens


# ===============================
# GLOSS LOOKUP
# ===============================

def gloss_word(word):
    """
    Look up a Hebrew word in the lexicon.
    If the word has a prefix (e.g. וְהַ), keep it attached
    but break the gloss into combined parts (e.g. "and-the-earth").
    """
    norm = normalize_hebrew(word)

    # Handle common prefixes
    prefixes = {"ו": "and", "ה": "the", "ב": "in", "ל": "to", "כ": "as"}
    for p in prefixes.keys():
        if norm.startswith(p) and len(norm) > 1:
            stem = norm[len(p):]
            if stem in LEXICON:
                return f"{prefixes[p]}-{LEXICON[stem]}"

    # Direct lookup
    if norm in LEXICON:
        return LEXICON[norm]

    return "[unmapped]"  # should not be needed for Masoretic text


# ===============================
# PUBLIC API: RETURN INTERLINEAR TABLE
# ===============================

def get_masoretic_gloss(reference):
    """
    Takes a verse reference (e.g. 'Genesis 1:1'),
    runs glossing pipeline, and returns aligned Hebrew/English rows
    for vertical display in st.table().
    """
    data = get_masoretic_text(reference)
    hebrew_text = data["original"]

    tokens = tokenize_hebrew(hebrew_text)
    table = [(token, gloss_word(token)) for token in tokens]

    return {
        "table": table,
        "notes": "Masoretic lexical gloss (no grammar, no syntax)"
    }
