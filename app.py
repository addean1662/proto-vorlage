# app.py — Proto-Vorlage AI Streamlit app

import streamlit as st
from masoretic import get_masoretic_with_gloss   # ✔ updated import
from gloss_masoretic import gloss_word           # ✔ new gloss engine
from lxx import get_lxx_text
from vulgate import get_vulgate_text

st.set_page_config(page_title="Proto-Vorlage AI", layout="centered")

# ===============================
# UI — HEADER + DESCRIPTION
# ===============================

st.title("Proto-Vorlage AI")
st.markdown(
    """
    Compare Old Testament textual traditions with smart verse lookup.  
    Enter a full verse reference (e.g. `Genesis 1:1`), and this app displays:

    - ✅ Masoretic Hebrew + **word-for-word gloss** (via Sefaria.org)  
    - ✅ Septuagint Greek + English (via BibleHub)  
    - ✅ Latin Vulgate + English (placeholder for now)  
    - 🕒 Dead Sea Scrolls integration coming soon
    """
)

# ===============================
# USER INPUT
# ===============================

reference = st.text_input("Enter a verse reference (e.g. 'Genesis 1:1')")

if reference:
    # Create columns for each source
    col1, col2, col3, col4 = st.columns(4)

    # === MASORETIC ===
    with st.spinner("Loading Masoretic Text + Gloss..."):
        masoretic_full = get_masoretic_with_gloss(reference.strip().title(), gloss_word)

    with col1:
        st.subheader("Masoretic")
        st.markdown("**Hebrew:**")
        st.markdown(masoretic_full['original'], unsafe_allow_html=True)

        st.markdown("**Gloss (word-for-word):**")
        st.markdown(f"```\n{masoretic_full['glossed']}\n```")   # keeps vertical spacing

        st.caption(masoretic_full.get("notes", ""))

    # === DSS PLACEHOLDER ===
    with col2:
        st.subheader("DSS")
        st.markdown("**Hebrew:** *(Coming Soon)*")
        st.markdown("**English:** *(Coming Soon)*")
        st.caption("Dead Sea Scrolls integration planned.")

    # === SEPTUAGINT (LXX) ===
    with st.spinner("Loading LXX..."):
        lxx = get_lxx_text(reference.strip())

    with col3:
        st.subheader("LXX")
        st.markdown(f"**Greek:** {lxx['original']}")
        st.markdown(f"**English:** {lxx['english']}")
        st.caption(lxx.get("notes", ""))

    # === VULGATE ===
    with st.spinner("Loading Vulgate..."):
        vulgate = get_vulgate_text(reference.strip())

    with col4:
        st.subheader("Vulgate")
        st.markdown(f"**Latin:** {vulgate['original']}")
        st.markdown(f"**English:** {vulgate['english']}")
        st.caption(vulgate.get("notes", ""))
