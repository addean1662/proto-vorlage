# Streamlit app entry point
import streamlit as st
from masoretic import get_masoretic_text
from lxx import get_lxx_text
from vulgate import get_vulgate_text

st.set_page_config(page_title="Proto-Vorlage AI", layout="centered")

st.title("Proto-Vorlage AI")
st.markdown(
    "Enter any verse from Genesis 1:1 to Malachi 4:6. This version displays Masoretic Hebrew and English from Sefaria, and shows Greek (LXX) and Latin (Vulgate) with English translations."
)

user_input = st.text_input("Enter a verse (e.g., 'Isaiah 7:14')")

if user_input:
    col1, col2, col3, col4 = st.columns(4)

    # === Masoretic ===
    with st.spinner("Loading Masoretic text..."):
        masoretic = get_masoretic_text(user_input.strip().title())

    with col1:
        st.subheader("Masoretic")
        st.markdown(f"**Hebrew:** {masoretic['original']}", unsafe_allow_html=True)
        st.markdown(f"**English:** {masoretic['english']}")

    # === DSS (Coming Soon) ===
    with col2:
        st.subheader("DSS")
        st.markdown("**Hebrew:** *(Coming Soon)*")
        st.markdown("**English:** *(Coming Soon)*")

    # === LXX ===
    with col3:
        st.subheader("LXX")
        lxx = get_lxx_text(user_input.strip().title())
        st.markdown(f"**Greek:** {lxx['original']}")
        st.markdown(f"**English:** {lxx['english']}")

    # === Vulgate ===
    with col4:
        st.subheader("Vulgate")
        vulgate = get_vulgate_text(user_input.strip().title())
        st.markdown(f"**Latin:** {vulgate['original']}")
        st.markdown(f"**English:** {vulgate['english']}")
