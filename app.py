# Streamlit app entry point
import streamlit as st
from masoretic import get_masoretic_text
from lxx import get_lxx_text
from vulgate import get_vulgate_text

# === Streamlit App Config ===
st.set_page_config(page_title="Proto-Vorlage AI", layout="wide")
st.title("Proto-Vorlage AI")
st.markdown(
    """
This app allows you to enter a verse from the Hebrew Bible (Gen 1:1 – Mal 4:6), and displays:
- **Masoretic Text** (Hebrew + English translation via Sefaria)
- **Septuagint (LXX)** (Greek + English Brenton)
- **Vulgate** (Latin + English Challoner)
- **Dead Sea Scrolls** *(coming soon)*

Example input: `Isaiah 7:14`
"""
)

# === User Input ===
user_input = st.text_input("Enter a verse reference (e.g., 'Genesis 1:1')")

def render_text_block(title, original, english, notes=None):
    st.subheader(title)
    st.markdown(f"**Original:**<br>{original}", unsafe_allow_html=True)
    st.markdown(f"**English:**<br>{english}", unsafe_allow_html=True)
    if notes:
        st.caption(notes)

if user_input:
    verse_ref = user_input.strip().title()

    # === 4 content columns ===
    col1, col2, col3, col4 = st.columns(4)

    # === Masoretic Text ===
    with col1:
        with st.spinner("Loading Masoretic Text..."):
            masoretic = get_masoretic_text(verse_ref)
        render_text_block(
            "Masoretic",
            masoretic.get("original", "[Error]"),
            masoretic.get("english", "[Error]"),
            masoretic.get("notes"),
        )

    # === Dead Sea Scrolls Placeholder ===
    with col2:
        render_text_block(
            "Dead Sea Scrolls",
            "*Coming soon (AI-driven fragment finder)*",
            "*Coming soon (AI-driven fragment finder)*",
        )

    # === Septuagint (LXX) ===
    with col3:
        with st.spinner("Loading Septuagint (LXX)..."):
            lxx = get_lxx_text(verse_ref)
        render_text_block(
            "Septuagint (LXX)",
            lxx.get("original", "[Error]"),
            lxx.get("english", "[Error]"),
            lxx.get("notes"),
        )

    # === Vulgate ===
    with col4:
        with st.spinner("Loading Vulgate..."):
            vulgate = get_vulgate_text(verse_ref)
        render_text_block(
            "Vulgate",
            vulgate.get("original", "[Error]"),
            vulgate.get("english", "[Error]"),
            vulgate.get("notes"),
        )
else:
    st.info("👆 Enter a verse reference to get started.")
