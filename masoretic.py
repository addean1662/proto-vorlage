# Masoretic Text agent logic
def get_mt_text(verse):
    data = {
        "Isaiah 7:14": "הִנֵּה הָעַלְמָה הָרָה וְיֹלֶדֶת בֵּן",
        "Psalm 22:16": "כָּאֲרִי יָדַי וְרַגְלָי"
    }
    return data.get(verse, "[Verse not available]")
