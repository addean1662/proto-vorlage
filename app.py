# Streamlit app entry point
import streamlit as st

from dss import get_dss_text
from lxx import get_lxx_text
from masoretic import get_mt_text
from vulgate import get_vulgate_text

st.set_page_config(page_title="Proto-Vorlage AI", layout="wide")

st.title("Proto-Vorlage AI")
st.markdown("""
Select a verse to compare how it's preserved in different textual traditions of the Hebrew Bible.
""")

# List of verses to compare
available_verses = ["Isaiah 7:14", "Psalm 22:16"]

selected_verse = st.selectbox("Choose a verse", available_verses)

# Layout with 4 columns
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.subheader("Masoretic")
    st.markdown(get_mt_text(selected_verse))

with col2:
    st.subheader("DSS")
    st.markdown(get_dss_text(selected_verse))

with col3:
    st.subheader("LXX (Hebrew)")
    st.markdown(get_lxx_text(selected_verse))

with col4:
    st.subheader("Vulgate (Hebrew)")
    st.markdown(get_vulgate_text(selected_verse))
