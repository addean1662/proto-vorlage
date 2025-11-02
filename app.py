# Streamlit app entry point
import streamlit as st

# Sample verse data (expand this dictionary later!)
verse_data = {
    "Psalm 22:16": {
        "Masoretic": {
            "he": "כִּי סְבָבוּנִי כְּלָבִים עֲדַת מְרֵעִים הִקִּיפוּנִי כָּאֲרִי יָדַי וְרַגְלָי׃",
            "en": "For dogs surround me; a pack of evildoers closes in on me. Like a lion, they are at my hands and feet."
        },
        "DSS": {
            "he": "כארו ידי ורגלי",
            "en": "They pierced my hands and my feet"
        },
        "LXX": {
            "he": "ὤρυξαν χεῖράς μου καὶ πόδας",
            "en": "They dug my hands and feet"
        },
        "Vulgate": {
            "he": "foderunt manus meas et pedes meos",
            "en": "They pierced my hands and my feet"
        }
    }
}

# App interface
st.set_page_config(page_title="Proto-Vorlage AI", layout="centered")
st.title("Proto-Vorlage AI")
st.markdown("Select a verse to compare how it's preserved in different textual traditions of the Hebrew Bible.")

# Input box for Book + Chapter:Verse
verse_input = st.text_input("Enter a verse (e.g., 'Psalm 22:16')")

# Normalize input
normalized_input = verse_input.strip().title()

# Display results if verse found
if normalized_input in verse_data:
    verse = verse_data[normalized_input]
    
    cols = st.columns(4)
    for idx, (tradition, texts) in enumerate(verse.items()):
        with cols[idx]:
            st.subheader(tradition)
            st.markdown(f"**Hebrew:** {texts['he']}")
            st.markdown(f"**English:** {texts['en']}")
else:
    if verse_input:
        st.warning("Verse not found. Try another.")

