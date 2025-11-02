# Masoretic Text agent logic
import requests
import re

def clean_html(raw_html):
    cleanr = re.compile('<.*?>')
    return re.sub(cleanr, '', raw_html)

def get_mt_text(reference):
    try:
        ref = reference.replace(" ", ".").replace(":", ".")
        url = f"https://www.sefaria.org/api/texts/{ref}?lang=he"
        response = requests.get(url)
        data = response.json()
        hebrew = data.get("he", ["[Hebrew not found]"])[0]
        english_raw = data.get("text", ["[English not found]"])[0]
        english = clean_html(english_raw)
        return f"**Hebrew**: {hebrew}\n\n**English**: {english}"
    except Exception as e:
        return f"[Error: {str(e)}]"
