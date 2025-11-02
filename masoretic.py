# Masoretic Text agent logic
import requests
import re

def clean_html(raw_html):
    cleanr = re.compile('<.*?>')
    return re.sub(cleanr, '', raw_html)

def get_masoretic_text(reference):
    try:
        ref = reference.strip().replace(" ", "_").replace(":", ".")
        url = f"https://www.sefaria.org/api/texts/{ref}?lang=he&with_heb=true"
        response = requests.get(url)
        data = response.json()

        hebrew = data.get("he", ["[Hebrew not found]"])[0]
        english_raw = data.get("text", ["[English not found]"])[0]
        english = clean_html(english_raw)

        return {
            "original": hebrew,
            "english": english,
            "notes": "Source: Sefaria.org (Masoretic Text)"
        }
    except Exception as e:
        return {
            "original": "[Error retrieving Hebrew]",
            "english": "[Error retrieving English]",
            "notes": str(e)
        }
