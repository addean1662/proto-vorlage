# Masoretic Text agent logic
import re
import streamlit as st
from masoretic import get_masoretic_text

# Helper to sanitize and validate a verse reference
def normalize_reference(ref):
    # Convert to title case and strip extra whitespace
    normalized = ref.strip().title()
    # Basic validation for format like "Genesis 1:1"
    pattern = r'^[1-3]?\s?[A-Za-z]+\s\d+:\d+$'
    if not re.match(pattern, normalized):
        return None
    return normalized

# === Streamlit App Config ===
st.set_page_config(page_title="Proto-Vorlage AI", layout="wide")
st.title("Proto-Vorlage AI")
st.markdown("""
Enter a Hebrew Bible verse from **Genesis 1:1** to **Malachi 4:6** and Proto-Vorlage AI will load the Masoretic text in **Hebrew and English**, and also show versions from the **Septuagint** and **Vulgate**.
""")

# === User Input ===
user_input = st.text_input("Enter a Bible verse (e.g. `Genesis 1:1`)", placeholder="e.g. Isaiah 7:14")

if user_input:
    verse_ref = normalize_reference(user_input)
    if not verse_ref:
        st.error("⚠️ Invalid reference format. Please use 'Book Chapter:Verse', e.g. `Exodus 20:13`.")
        st.stop()

    # Fetch Masoretic text
    with st.spinner(f"Loading Masoretic text for {verse_ref}..."):
        masoretic = get_masoretic_text(verse_ref)

    st.subheader("Masoretic Text")
    st.markdown(f"**Hebrew:**<br>{masoretic.get('original', '[Not found]')}", unsafe_allow_html=True)
    st.markdown(f"**English:**<br>{masoretic.get('english', '[Not found]')}", unsafe_allow_html=True)
    st.caption(masoretic.get("notes"))
