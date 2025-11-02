# masoretic.py

import requests
from html import unescape

def clean_html(text):
    return (
        unescape(text)
        .replace("<br>", "")
        .replace("<i>", "")
        .replace("</i>", "")
        .strip()
    )

def get_masoretic_text(reference):
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

