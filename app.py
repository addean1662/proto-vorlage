# Streamlit app entry point
import streamlit as st

# Sample verse database
verse_data = {
    "Psalm 22:16": {
        "Masoretic": {
            "hebrew": "לַמְנַצֵּחַ עַל-אַיֶּלֶת הַשַּׁחַר לְדָוִד.",
            "english": "For the leader; on Ayeleth ha-shahar. A psalm of David."
        },
        "DSS": {
            "hebrew": "כארו ידי ורגלי",
            "english": "They have pierced my hands and my feet"
        },
        "LXX": {
            "hebrew": "כארו ידי ורגלי",
            "english": "They dug my hands and feet"
        },
        "Vulgate": {
            "hebrew": "כארו ידי ורגלי",
            "english": "They pierced my hands and my feet"
        }
    }
}

# Set Streamlit page config
st.set_page_config(page_title="Proto-Vorlage AI", layout="centered")
st.title("Proto-Vorlage AI")
st.markdown("Select a verse to compare how it's preserved in different textual traditions of the Hebrew Bible.")

# Dropdown for selecting a verse
reference = st.selectbox("Choose a verse", list(verse_data.keys()))

# Layout: one column per textual tradition
columns = st.columns(4)
sources = ["Masoretic", "DSS", "LXX", "Vulgate"]

# Display Hebrew and English side-by-side
for idx, source in enumerate(sources):
    with columns[idx]:
        st.subheader(source)
        st.markdown(f"**Hebrew:** {verse_data[reference][source]['hebrew']}")
        st.markdown(f"**English:** {verse_data[reference][source]['english']}")
