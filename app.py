# Streamlit app entry point
import streamlit as st

st.set_page_config(page_title="Proto-Vorlage AI", layout="centered")

st.title("Proto-Vorlage AI")
st.markdown("""
This app compares different textual traditions of the Hebrew Bible to help reconstruct the proto-Vorlage —
the hypothetical Hebrew source text behind the Dead Sea Scrolls, the Septuagint, the Vulgate, and the Masoretic Text.
""")

st.info("🚧 This is an early MVP. Verse selection and comparison features are coming soon.")
