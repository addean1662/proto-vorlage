# Septuagint agent logic with backtranslation
def get_lxx_text(verse):
    data = {
        "Isaiah 7:14": "הִנֵּה הַבְּתוּלָה תֵּהָר וְתֵלֵד בֵּן",  # Based on παρθένος
        "Psalm 22:16": "כָּרוּ ידי ורגלי"                        # Based on ὤρυξαν
    }
    return data.get(verse, "[Verse not available]")
