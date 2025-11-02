# Vulgate agent logic with backtranslation
def get_vulgate_text(verse):
    data = {
        "Isaiah 7:14": "הִנֵּה הַבְּתוּלָה הָרָה וְיֹלֶדֶת בֵּן",  # Based on “virgo”
        "Psalm 22:16": "כָּרוּ ידי ורגלי"                          # “foderunt” = “they have pierced”
    }
    return data.get(verse, "[Verse not available]")
