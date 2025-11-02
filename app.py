# Streamlit app entry point
import streamlit as st
import requests
import re

# === Helper Function to Get Masoretic Text from Sefaria ===
def get_masoretic_text(reference):
    def clean_html(text):
        return re.sub(r"<[^>]+>", "", text).strip()

    url = f"https://www.sefaria.org/api/texts/{reference}?lang=he&with=hebrew"
    try:
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

# === Streamlit App UI ===

st.set_page_config(page_title="Proto-Vorlage AI", layout="centered")
st.title("Proto-Vorlage AI")
st.markdown(
    "Enter any verse from Genesis 1:1 to Malachi 4:6. This version displays Masoretic Hebrew and English from Sefaria, "
    "and shows Greek (LXX) and Latin (Vulgate) with English translations."
)

# User input
user_input = st.text_input("Enter a verse (e.g., 'Isaiah 7:14')")

# Process input
if user_input:
    with st.spinner("Retrieving Masoretic text..."):
        masoretic = get_masoretic_text(user_input.strip().title())
        hebrew_text = masoretic["original"]
        english_text = masoretic["english"]

    # === Static demo content for LXX and Vulgate ===
    reference = user_input.strip().title()

    # Placeholder Septuagint Greek and English
    lxx_greek = "ἐν ἀρχῇ ἐποίησεν ὁ θεὸς τὸν οὐρανὸν καὶ τὴν γῆν" if reference == "Genesis 1:1" else "[Greek coming soon]"
    lxx_english = "In the beginning God made the heaven and the earth" if reference == "Genesis 1:1" else "[English coming soon]"

    # Placeholder Latin Vulgate and English
    vulgate_latin = "In principio creavit Deus caelum et terram" if reference == "Genesis 1:1" else "[Latin coming soon]"
    vulgate_english = "In the beginning God created the heaven and the earth" if reference == "Genesis 1:1" else "[English coming soon]"

    # === Display in columns ===
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.subheader("Masoretic")
        st.markdown(f"**Hebrew:** {hebrew_text}", unsafe_allow_html=True)
        st.markdown(f"**English:** {english_text}")

    with col2:
        st.subheader("DSS")
        st.markdown("**Hebrew:** *(Coming Soon)*")
        st.markdown("**English:** *(Coming Soon)*")

    with col3:
        st.subheader("LXX")
        st.markdown(f"**Greek:** {lxx_greek}")
        st.markdown(f"**English:** {lxx_english}")

    with col4:
        st.subheader("Vulgate")
        st.markdown(f"**Latin:** {vulgate_latin}")
        st.markdown(f"**English:** {vulgate_english}")
