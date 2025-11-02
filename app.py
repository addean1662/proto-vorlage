# Streamlit app entry point
# app.py
import streamlit as st
from masoretic import get_masoretic_text
from lxx import get_lxx_text
from vulgate import get_vulgate_text

st.set_page_config(page_title="Proto-Vorlage AI", layout="wide")

# ===== Page Header =====
st.title("Proto-Vorlage AI")
st.markdown(
    """
    Enter any verse from *Genesis 1:1* to *Malachi 4:6*.
    <br>This app displays:
    - **Masoretic**: Hebrew + English (via Sefaria API)
    - **LXX (Septuagint)**: Greek + English (Brenton)
    - **Vulgate**: Latin + English (Challoner)
    """,
    unsafe_allow_html=True
)

# ===== User Input =====
user_input = st.text_input("Enter a verse (e.g., 'Genesis 1:1')")

if user_input:
    # 4 columns for the 4 textual traditions
    col1, col2, col3, col4 = st.columns(4)

    # ===== Masoretic =====
    with col1:
        st.subheader("Masoretic")
        with st.spinner("Loading Masoretic text..."):
            masoretic = get_masoretic_text(user_input.strip())

        st.markdown(f"**Hebrew:**<br>{masoretic['original']}", unsafe_allow_html=True)
        st.markdown(f"**English:**<br>{masoretic['english']}", unsafe_allow_html=True)
        st.caption(masoretic.get("notes", ""))

    # ===== DSS (Placeholder) =====
    with col2:
        st.subheader("DSS (Coming Soon)")
        st.markdown("**Hebrew:**<br>*Coming Soon*", unsafe_allow_html=True)
        st.markdown("**English:**<br>*Coming Soon*", unsafe_allow_html=True)

    # ===== LXX =====
    with col3:
        st.subheader("LXX")
        with st.spinner("Loading Septuagint (LXX)..."):
            lxx = get_lxx_text(user_input.strip())

        st.markdown(f"**Greek:**<br>{lxx['original']}", unsafe_allow_html=True)
        st.markdown(f"**English:**<br>{lxx['english']}", unsafe_allow_html=True)
        st.caption(lxx.get("notes", ""))

    # ===== Vulgate =====
    with col4:
        st.subheader("Vulgate")
        with st.spinner("Loading Vulgate text..."):
            vulgate = get_vulgate_text(user_input.strip())

        st.markdown(f"**Latin:**<br>{vulgate['original']}", unsafe_allow_html=True)
        st.markdown(f"**English:**<br>{vulgate['english']}", unsafe_allow_html=True)
        st.caption(vulgate.get("notes", ""))
