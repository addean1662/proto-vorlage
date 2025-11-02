# Septuagint agent logic with backtranslation
# lxx.py

import requests

# URLs to Septuagint text data (Greek and English Brenton)
LXX_GREEK_URL = "https://raw.githubusercontent.com/charlesmerritt/LXX-Interlinear-Data/main/lxx_greek.json"
LXX_ENGLISH_URL = "https://raw.githubusercontent.com/charlesmerritt/LXX-Interlinear-Data/main/lxx_english_brenton.json"

def load_lxx_data(url):
    """Generic loader for JSON data from remote sources."""
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()  # parsed JSON as dict
    except Exception as e:
        return {"error": str(e)}

def get_lxx_text(reference):
    """Get Greek and English text for a verse from the Septuagint."""
    greek_data = load_lxx_data(LXX_GREEK_URL)
    english_data = load_lxx_data(LXX_ENGLISH_URL)

    # Handle loading errors
    if "error" in greek_data or "error" in english_data:
        return {
            "original": "[Error loading LXX Greek text]",
            "english": "[Error loading Brenton English translation]",
            "notes": f"Greek error: {greek_data.get('error')} | English error: {english_data.get('error')}"
        }

    greek = greek_data.get(reference, "[Greek not found]")
    english = english_data.get(reference, "[English not found]")

    return {
        "original": greek,
        "english": english,
        "notes": "Source: Brenton translation (public domain)"
    }
