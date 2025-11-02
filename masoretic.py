# Masoretic Text agent logic
import requests

def get_mt_text(reference):
    try:
        ref = reference.replace(" ", ".").replace(":", ".")
        url = f"https://www.sefaria.org/api/texts/{ref}?lang=he"
        response = requests.get(url)
        data = response.json()
        hebrew = data.get("he", ["[Hebrew not found]"])[0]
        english = data.get("text", ["[English not found]"])[0]
        return f"**Hebrew**: {hebrew}\n\n**English**: {english}"
    except Exception as e:
        return f"[Error: {str(e)}]"
