# Streamlit app entry point
import streamlit as st
import requests
import re

# === Masoretic API Lookup (Sefaria) ===

def clean_html(raw_html):
    cleanr = re.compile('<.*?>')
    return re.sub(cleanr, '', raw_html)

def get_masoretic_text(reference):
    try:
        ref = reference.strip().replace(" ", "_").replace(":", ".")
        url = f"https://www.sefaria.org/api/texts/{ref}?lang=he&with_heb=true"
        response = requests.get(url)
        data = response.json()

        hebrew_raw = data.get("he", ["[Hebrew not found]"])[0]
        hebrew = clean_html(hebrew_raw)
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

# === Streamlit UI ===

st.set_page_config(page_title="Proto-Vorlage AI", layout="centered")
st.title("Proto-Vorlage AI")
st.markdown("Enter any verse from Genesis 1:1 to Malachi 4:6. This version displays Masoretic Hebrew and English from Sefaria.")

# User Input
user_input = st.text_input("Enter a verse (e.g., 'Isaiah 7:14')")

# Normalize input
if user_input:
    with st.spinner("Retrieving Masoretic text..."):
        masoretic = get_masoretic_text(user_input.strip().title())

    st.subheader("Masoretic Text (Live from Sefaria)")
    st.markdown(f"**Hebrew:** {masoretic['original']}")
    st.markdown(f"**English:** {masoretic['english']}")
    st.caption(masoretic['notes'])

    # === Placeholders for Other Traditions ===
    st.divider()
    st.subheader("Coming Soon: AI Reconstructions")
    st.markdown("🔸 **DSS**: Reconstructed Hebrew fragment + English interpretation")
    st.markdown("🔸 **LXX**: Retroverted Hebrew from Greek + English gloss")
    st.markdown("🔸 **Vulgate**: Retroverted Hebrew from Latin + English gloss")
