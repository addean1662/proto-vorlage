# Dead Sea Scrolls agent logic
def get_dss_text(verse):
    data = {
        "Isaiah 7:14": "העלמה הרה וילדת בן",  # Fragmentary but nearly identical
        "Psalm 22:16": "כארו ידי ורגלי"       # Some DSS mss may read this
    }
    return data.get(verse, "[Verse not available]")
