/**
 * normalizeGloss — strip dictionary noise and enforce a 3-word max.
 * Glosses follow root/stem convention: "create" not "to create".
 *
 * Args:
 *   gloss  — raw English gloss from lexicon
 *   orig   — original-language word form (for particle/form lookup)
 *   lemma  — Strong's number e.g. "H430" / "G2316" (for lemma overrides)
 */

// Function-word overrides keyed by exact orig form (Hebrew/Greek/Latin).
const PARTICLES: Record<string, string> = {
  // Hebrew particles
  'את':   'ʾet',  'אֶת':  'ʾet',  'אֵת':  'ʾet',
  'ו':    'and',  'וְ':   'and',  'וּ':   'and',
  'עַל':  'upon', 'עָל':  'upon', 'עַל־': 'upon',
  'כִּי': 'for',
  // Greek articles / particles
  'ὁ':   'the',     'ἡ':   'the',     'τό':   'the',  'τὸ':  'the',
  'τόν': 'the',     'τὸν': 'the',     'τήν':  'the',  'τὴν': 'the',
  'τοῦ': 'of the',  'τῆς': 'of the',  'τοῖς':'the',   'τῇ':  'the',
  'τῶν': 'of the',
  'καί': 'and',     'καὶ': 'and',
  'δέ':  'but',     'δὲ':  'but',
  'ἐν':  'in',      'ἐπ':  'upon',    'ἐπί': 'upon',  'ἐπάνω': 'above',
  // Latin
  'et':    'and',
  'autem': 'but',
  'in':    'in',
  'super': 'over',
  'de':    'of',
  'ad':    'to',
};

// Canonical glosses keyed by Strong's lemma number (root/stem convention).
const LEMMA_OVERRIDES: Record<string, string> = {
  // ── Hebrew — prepositions / conjunctions / particles ─────────────────────────
  'H853':  'ʾet',       // את    — direct object marker
  'H854':  'with',      // את    — preposition "with"
  'H834':  'which',     // אשר   — relative pronoun
  'H413':  'to',        // אל    — toward/to
  'H3808': 'not',       // לא    — negation
  'H3588': 'for',       // כי    — for/because/that
  'H5921': 'upon',      // על    — upon/over
  'H4480': 'from',      // מן    — from/out of
  'H5704': 'until',     // עד    — until/as far as
  'H518':  'if',        // אם    — if/whether
  'H176':  'or',        // או    — or
  'H310':  'after',     // אחר   — after/behind
  'H5973': 'with',      // עם    — with (together with)
  'H8478': 'under',     // תחת   — under/instead of
  'H996':  'between',   // בין   — between
  'H369':  'not',       // אין   — there is not
  'H3651': 'so',        // כן    — so/thus
  'H2009': 'behold',    // הנה   — behold/look
  'H8033': 'there',     // שם    — there
  'H4100': 'what',      // מה    — what/how
  'H1571': 'also',      // גם    — also/even
  'H3966': 'very',      // מאד   — very/exceedingly
  // ── Hebrew — pronouns ────────────────────────────────────────────────────────
  'H1931': 'he',        // הוא   — he/she/it
  'H2063': 'this',      // זאת   — this (fem.)
  'H2088': 'this',      // זה    — this (masc.)
  'H428':  'these',     // אלה   — these
  'H859':  'you',       // אתה   — you (sg.)
  'H589':  'I',         // אני   — I
  'H595':  'I',         // אנכי  — I (emphatic)
  'H1992': 'they',      // הם    — they
  // ── Hebrew — divine names ─────────────────────────────────────────────────────
  'H3068': 'LORD',      // יהוה  — Tetragrammaton
  'H430':  'God',       // אלהים — Elohim
  // ── Hebrew — verbs (root/stem) ───────────────────────────────────────────────
  'H559':  'say',       // אמר   — amar
  'H1961': 'be',        // היה   — hayah
  'H1254': 'create',    // ברא   — bara
  'H1288': 'bless',     // ברך   — barakh
  'H1696': 'speak',     // דבר   — davar
  'H1980': 'walk',      // הלך   — halak
  'H3045': 'know',      // ידע   — yada
  'H3205': 'bear',      // ילד   — yalad (give birth/beget)
  'H3212': 'walk',      // הלך   — (variant stem)
  'H3318': 'go out',    // יצא   — yatsa
  'H3381': 'go down',   // ירד   — yarad
  'H3427': 'dwell',     // ישב   — yashav
  'H3947': 'take',      // לקח   — laqach
  'H4191': 'die',       // מות   — mut
  'H4672': 'find',      // מצא   — matsa
  'H5265': 'journey',   // נסע   — nasa
  'H5375': 'lift',      // נשא   — nasa (lift/carry)
  'H5414': 'give',      // נתן   — natan
  'H5674': 'cross',     // עבר   — avar
  'H5927': 'go up',     // עלה   — alah
  'H5975': 'stand',     // עמד   — amad
  'H6213': 'make',      // עשה   — asah
  'H6485': 'appoint',   // פקד   — paqad
  'H6680': 'command',   // צוה   — tsavah
  'H6942': 'sanctify',  // קדש   — qadash
  'H6965': 'arise',     // קום   — qum
  'H7121': 'call',      // קרא   — qara
  'H7126': 'approach',  // קרב   — qarav
  'H7200': 'see',       // ראה   — ra'ah
  'H7363': 'hover',     // רחף   — rachaph
  'H7725': 'return',    // שוב   — shuv
  'H7760': 'set',       // שים   — sim (put/set/place)
  'H7971': 'send',      // שלח   — shalach
  'H8085': 'hear',      // שמע   — shama
  'H8104': 'keep',      // שמר   — shamar
  'H935':  'come',      // בוא   — bo
  'H398':  'eat',       // אכל   — akal
  // ── Hebrew — nouns ───────────────────────────────────────────────────────────
  'H1':    'father',    // אב    — av
  'H120':  'man',       // אדם   — adam (humankind)
  'H127':  'ground',    // אדמה  — adamah
  'H168':  'tent',      // אהל   — ohel
  'H251':  'brother',   // אח    — ach
  'H259':  'one',       // אחד   — echad
  'H352':  'ram',       // איל   — ayil
  'H376':  'man',       // איש   — ish
  'H505':  'thousand',  // אלף   — elef
  'H776':  'earth',     // ארץ   — eretz
  'H802':  'woman',     // אשה   — ishah
  'H922':  'void',      // בהו   — bohu
  'H1004': 'house',     // בית   — bayit
  'H1121': 'son',       // בן    — ben
  'H1320': 'flesh',     // בשר   — basar
  'H1323': 'daughter',  // בת    — bat
  'H1697': 'word',      // דבר   — davar (noun)
  'H1818': 'blood',     // דם    — dam
  'H2022': 'mountain',  // הר    — har
  'H2091': 'gold',      // זהב   — zahav
  'H2233': 'seed',      // זרע   — zera
  'H2403': 'sin offering', // חטאת — chata'at
  'H2416': 'living',    // חי    — chai
  'H2568': 'five',      // חמש   — chamesh
  'H2822': 'darkness',  // חשך   — choshek
  'H2896': 'good',      // טוב   — tov
  'H3027': 'hand',      // יד    — yad
  'H3117': 'day',       // יום   — yom
  'H3605': 'all',       // כל    — kol
  'H3701': 'silver',    // כסף   — kesef
  'H3820': 'heart',     // לב    — lev
  'H4150': 'meeting',   // מועד  — moed
  'H4196': 'altar',     // מזבח  — mizbeach
  'H4294': 'tribe',     // מטה   — mateh
  'H4325': 'waters',    // מים   — mayim
  'H4725': 'place',     // מקום  — maqom
  'H4940': 'clan',      // משפחה — mishpachah
  'H5315': 'soul',      // נפש   — nephesh
  'H5650': 'servant',   // עבד   — eved
  'H5869': 'eye',       // עין   — ayin
  'H5892': 'city',      // עיר   — ir
  'H5930': 'offering',  // עולה  — olah (burnt offering)
  'H5971': 'people',    // עם    — am
  'H6086': 'tree',      // עץ    — ets
  'H6256': 'time',      // עת    — et (time/season)
  'H6310': 'mouth',     // פה    — peh
  'H6440': 'face',      // פנים  — panim
  'H6944': 'holy',      // קדש   — qodesh
  'H7218': 'head',      // ראש   — rosh
  'H7225': 'beginning', // ראשית — reshit
  'H7227': 'many',      // רב    — rav
  'H7307': 'spirit',    // רוח   — ruach
  'H7651': 'seven',     // שבע   — sheva
  'H7704': 'field',     // שדה   — sadeh
  'H8034': 'name',      // שם    — shem
  'H8064': 'heavens',   // שמים  — shamayim
  'H8141': 'year',      // שנה   — shanah
  'H8147': 'two',       // שנים  — shnayim
  'H8415': 'deep',      // תהום  — tehom
  'H8414': 'formless',  // תהו   — tohu
  'H8432': 'midst',     // תוך   — tavek
  'H3967': 'hundred',   // מאה   — meah
  'H3548': 'priest',    // כהן   — kohen
  'H6547': 'Pharaoh',   // פרעה  — Par'oh
  // ── Hebrew — proper names ────────────────────────────────────────────────────
  'H85':   'Abraham',   // אברהם
  'H175':  'Aaron',     // אהרן
  'H1732': 'David',     // דוד
  'H3063': 'Judah',     // יהודה
  'H3130': 'Joseph',    // יוסף
  'H3290': 'Jacob',     // יעקב
  'H3327': 'Isaac',     // יצחק
  'H3478': 'Israel',    // ישראל
  'H4714': 'Egypt',     // מצרים
  'H4872': 'Moses',     // משה
  // ── Greek (Strong's) — root/stem ─────────────────────────────────────────────
  'G0012': 'abyss',     // ἄβυσσος
  'G0444': 'man',       // ἄνθρωπος
  'G0746': 'beginning', // ἀρχή
  'G1065': 'indeed',    // γε
  'G1093': 'earth',     // γῆ
  'G1096': 'become',    // γίνομαι
  'G1325': 'give',      // δίδωμι
  'G1510': 'be',        // εἰμί
  'G1722': 'in',        // ἐν
  'G1909': 'upon',      // ἐπί
  'G2064': 'come',      // ἔρχομαι
  'G2250': 'day',       // ἡμέρα
  'G2316': 'God',       // θεός
  'G2532': 'and',       // καί
  'G2962': 'LORD',      // κύριος
  'G2983': 'take',      // λαμβάνω
  'G3004': 'say',       // λέγω
  'G3588': 'the',       // ὁ/ἡ/τό — article
  'G3708': 'see',       // ὁράω
  'G3739': 'which',     // ὅς
  'G3772': 'heaven',    // οὐρανός
  'G3778': 'this',      // οὗτος
  'G3956': 'all',       // πᾶς
  'G4151': 'spirit',    // πνεῦμα
  'G4160': 'make',      // ποιέω
  'G4314': 'toward',    // πρός
  'G4655': 'darkness',  // σκότος
  'G5204': 'water',     // ὕδωρ
  'G5207': 'son',       // υἱός
};

// Greek word-form overrides for LXX entries that lack a Strong's number.
// Covers proper nouns, cultic vocabulary, and specialized Torah terminology.
const GREEK_FORMS: Record<string, string> = {
  // ── Proper nouns — people ─────────────────────────────────────────────────
  'Αβραμ': 'Abram',        'Σαρα': 'Sarah',         'Σαρας': 'Sarah',
  'Λαβαν': 'Laban',        'Λεια': 'Leah',           'Λειας': 'Leah',
  'Λειαν': 'Leah',         'Βαλλα': 'Bilhah',        'Βαλλας': 'Bilhah',
  'Ζελφας': 'Zilpah',      'Αυναν': 'Onan',          'Δινας': 'Dinah',
  'Ισμαηλ': 'Ishmael',     'Ναβαιωθ': 'Nebaioth',   'Αιλων': 'Elon',
  'Ιωβαβ': 'Jobab',        'Μελχα': 'Milcah',        'Σερουχ': 'Serug',
  'Ελιβεμα': 'Oholibamah', 'Ελιβεμας': 'Oholibamah','Λωταν': 'Lotan',
  'Δησων': 'Dishan',       'Σωβαλ': 'Shobal',        'Κενεζ': 'Kenaz',
  'Χορρι': 'Horite',       'Αδα': 'Adah',            'Αδας': 'Adah',
  'Σελλα': 'Zillah',       'Θοβελ': 'Tubal-cain',   'Βεωρ': 'Beor',
  'Ασενεθ': 'Asenath',     'Πετεφρη': 'Potiphera',  'Ιεμουηλ': 'Jemuel',
  'Ιαχιν': 'Jachin',       'Νοεμαν': 'Naaman',       'Φουα': 'Puah',
  'Βαρια': 'Beriah',       'Σηγωρ': 'Zoar',          'Σωγαρ': 'Zuar',
  'Φικολ': 'Phicol',       'Οχοζαθ': 'Ahuzzath',    'Αβιμελεχ': 'Abimelech',
  'Ιοθορ': 'Jethro',       'Ραγουηλ': 'Reuel',       'Ναδαβ': 'Nadab',
  'Ιθαμαρ': 'Ithamar',     'Βεσελεηλ': 'Bezalel',   'Ελισαφαν': 'Elizaphan',
  'Φινεες': 'Phinehas',    'Δαθαν': 'Dathan',        'Αβιρων': 'Abiram',
  'Ελδαδ': 'Eldad',        'Ιεφοννη': 'Jephunneh',  'Χαλεβ': 'Caleb',
  'Σαλπααδ': 'Zelophehad', 'Νουα': 'Noa',            'Εγλα': 'Hoglah',
  'Θερσα': 'Tirzah',       'Μαχιρ': 'Machir',        'Ελιαβ': 'Eliab',
  'Ναυη': 'Nun',            'Σαλαμιηλ': 'Shelumiel', 'Ελισουρ': 'Elizur',
  'Σεδιουρ': 'Shedeur',    'Σουρισαδαι': 'Zurishaddai','Χαιλων': 'Helon',
  'Ελισαμα': 'Elishama',   'Φαδασσουρ': 'Pedahzur', 'Αβιδαν': 'Abidan',
  'Γαδεωνι': 'Gideoni',    'Αμισαδαι': 'Ammishaddai','Φαγαιηλ': 'Pagiel',
  'Εχραν': 'Ocran',        'Αχιρε': 'Ahira',         'Αχιεζερ': 'Ahiezer',
  'Ελισαφ': 'Eliasaph',    'Εμιουδ': 'Eliud',        'Αμβραμ': 'Amram',
  'Αμραμ': 'Amram',        'Μοολι': 'Mahli',          'Μουσι': 'Mushi',
  'Κααθ': 'Kohath',        'Γεδσων': 'Gershon',      'Μεραρι': 'Merari',
  'Ισσααρ': 'Izhar',       'Χαρμι': 'Carmi',          'Αιναν': 'Enan',
  'Βαθουηλ': 'Bethuel',    'Εφρων': 'Ephron',        'Εμμωρ': 'Hamor',
  'Λοβενι': 'Libni',       'Ιαϊρ': 'Jair',            'Ιαβοκ': 'Jabbok',
  'Ισσαχαρ': 'Issachar',
  // ── Proper nouns — places ─────────────────────────────────────────────────
  'Μωαβ': 'Moab',          'Εδωμ': 'Edom',           'Γαλααδ': 'Gilead',
  'Δαν': 'Dan',            'Χεβρων': 'Hebron',        'Μαμβρη': 'Mamre',
  'Βαιθηλ': 'Bethel',      'Φαραν': 'Paran',          'Χωρηβ': 'Horeb',
  'Σιν': 'Sin',            'Σηων': 'Sihon',            'Σηιρ': 'Seir',
  'Καδης': 'Kadesh',       'Εσεβων': 'Heshbon',       'Βασαν': 'Bashan',
  'Αρνων': 'Arnon',        'Ωγ': 'Og',                'Ωρ': 'Hor',
  'Σεννααρ': 'Shinar',     'Αμμαν': 'Ammon',          'Αμμων': 'Ammon',
  'Ναβαυ': 'Nebo',         'Αροηρ': 'Aroer',          'Βαρνη': 'Barnea',
  'Ιαζηρ': 'Jazer',        'Δαιβων': 'Dibon',         'Αρραν': 'Haran',
  'Ραφαϊν': 'Rephaim',     'Σουρ': 'Shur',            'Γεσεμ': 'Goshen',
  'Γεραρων': 'Gerar',      'Βεελσεπφων': 'Baal-Zephon','Ραμεσση': 'Rameses',
  'Αιλιμ': 'Elim',         'Ραφιδιν': 'Rephidim',     'Ασηρωθ': 'Hazeroth',
  'Σοκχωθ': 'Succoth',     'Βεελφεγωρ': 'Baal-Peor', 'Φογωρ': 'Peor',
  'Αδαμα': 'Admah',        'Σεβωιμ': 'Zeboiim',       'Εδεμ': 'Eden',
  'Λουζα': 'Luz',          'Εφραθα': 'Ephrathah',     'Σελμωνα': 'Zalmonah',
  'Γαδγαδ': 'Gudgodah',    'Ωβωθ': 'Oboth',           'Ζαρετ': 'Zered',
  'Εδραϊν': 'Edrei',       'Αργοβ': 'Argob',          'Αερμων': 'Hermon',
  'Γαιβαλ': 'Ebal',        'Γαι': 'Ai',               'Ενακιμ': 'Anakim',
  'Χους': 'Cush',          'Σαβα': 'Sheba',            'Ασσουρ': 'Asshur',
  'Αιλαμ': 'Elam',         'Ιεκταν': 'Joktan',
  'Θαιμαν': 'Teman',       'Χετ': 'Heth',             'Φυλιστιιμ': 'Philistines',
  'Σεπφωρ': 'Zippor',      'Αραβα': 'Arabah',          'Ασρων': 'Hezron',
  // ── Gentilics / tribal names ──────────────────────────────────────────────
  'Αμορραίων': 'Amorites',  'Αμορραίους': 'Amorites', 'Αμορραῖον': 'Amorite',
  'Αμορραῖος': 'Amorite',   'Χετταίου': 'Hittite',   'Χετταίων': 'Hittites',
  'Χετταῖον': 'Hittite',    'Φερεζαίων': 'Perizzites','Φερεζαῖον': 'Perizzite',
  'Γεργεσαίων': 'Girgashites','Γεργεσαῖον': 'Girgashite','Ευαίων': 'Hivites',
  'Ευαῖον': 'Hivite',       'Ιεβουσαίων': 'Jebusites','Ιεβουσαῖον': 'Jebusite',
  // ── Sacrificial / cultic vocabulary ──────────────────────────────────────
  'στέαρ': 'fat',           'στέατα': 'fat',
  'κριὸν': 'ram',           'κριοῦ': 'ram',           'κριῷ': 'ram',
  'κριοὺς': 'rams',         'κριούς': 'rams',          'κριοῖς': 'rams',
  'κριοὶ': 'rams',          'κριῶν': 'rams',           'κριοί': 'rams',
  'χίμαρον': 'goat',        'χίμαιραν': 'goat',        'χιμάρου': 'goat',
  'χιμάρους': 'goats',
  'αἶγα': 'goat',           'αἶγας': 'goats',          'αἰγῶν': 'goats',
  'ἀμνάδας': 'ewe-lambs',
  'ἐξιλάσεται': 'atone',    'ἐξιλάσασθαι': 'atone',   'ἐξιλάσκεσθαι': 'atone',
  'ἐξιλάσατο': 'atone',     'ἐξίλασαι': 'atone',       'ἐξιλασμοῦ': 'atonement',
  'πλημμελείας': 'guilt',   'πλημμέλειαν': 'guilt',   'ἐπλημμέλησεν': 'offend',
  'πλημμελήσῃ': 'offend',
  'κάρπωμα': 'offering',    'κάρπωμά': 'offering',    'καρπωμάτων': 'offerings',
  'καρπώματα': 'offerings',
  'ὁλοκαυτώσεως': 'burnt offering', 'ὁλοκάρπωσιν': 'burnt offering',
  'ὁλοκάρπωμα': 'burnt offering',   'ὁλοκαύτωσιν': 'burnt offering',
  'ὁλοκάρπωσις': 'burnt offering',
  'ἀφαίρεμα': 'contribution', 'ἀφαιρέματος': 'contribution',
  'ἀφαιρέματα': 'contributions', 'ἀφόρισμα': 'portion',
  'ἀφαιρέσεως': 'contribution',
  'νόμιμον': 'ordinance',   'νόμιμα': 'ordinances',   'προστάγματά': 'decrees',
  'προστάγματος': 'decree', 'προστάγματα': 'decrees', 'πρόσταγμα': 'decree',
  'λατρευτὸν': 'service',   'ἐνδελεχισμοῦ': 'continual', 'ἐνδελεχῶς': 'continually',
  'ἁγίασμα': 'sanctuary',
  // ── Tabernacle construction ───────────────────────────────────────────────
  'ἐπωμίδος': 'ephod',      'ἐπωμίδα': 'ephod',       'λογεῖον': 'breastpiece',
  'λογείου': 'breastpiece', 'στηθύνιον': 'breast',    'κατακάλυμμα': 'veil',
  'ὑποδύτου': 'robe',       'ὑποδύτην': 'robe',        'περιστόμιον': 'collar',
  'λῶμα': 'hem',            'λώματος': 'hem',           'ῥοίσκους': 'pomegranates',
  'κώδωνας': 'bells',       'κιδάρεις': 'turbans',     'κίδαριν': 'turban',
  'μίτραν': 'turban',       'πέταλον': 'plate',        'αὐλαίας': 'curtains',
  'αὐλαῖαι': 'curtains',    'δέρρεις': 'curtains',     'δέρρεων': 'curtains',
  'δέρρεως': 'curtains',    'ἱστία': 'curtains',       'μοχλοὺς': 'bars',
  'ἀναφορεῖς': 'poles',     'κρίκους': 'rings',        'ἀγκύλας': 'clasps',
  'ψαλίδες': 'clasps',      'καλαμίσκοι': 'branches',  'καλαμίσκους': 'branches',
  'κρατῆρες': 'bowls',      'σφαιρωτῆρες': 'knobs',   'σφαιρωτὴρ': 'knob',
  'κυάθους': 'cups',        'σπονδεῖα': 'libation bowls', 'λουτῆρα': 'basin',
  'πασσάλους': 'pegs',      'ἐσχάραν': 'grate',        'κρεάγρας': 'forks',
  'ὀνυχιστῆρας': 'tongs',   'καλυπτῆρα': 'cover',     'ἐργαλεῖα': 'implements',
  'διωστῆρας': 'bars',      'ὕφασμα': 'woven cloth',   'σπιθαμῆς': 'span',
  'συνθέσεως': 'composition', 'συμπεπλεγμένους': 'braided', 'ἐμπλόκια': 'braided',
  'στρεπτὰ': 'twisted',     'στίχος': 'row',            'ἐπίθεμα': 'cover',
  'ἐπιθέματος': 'cover',    'στεφάνην': 'crown/rim',
  'κεκλωσμένης': 'twisted', 'κεκλωσμένην': 'twisted', 'κεκλωσμένου': 'twisted',
  'κεκλωσμένον': 'twisted', 'ἀναπεποιημένης': 'woven', 'ἀναπεποιημένη': 'woven',
  'ἠρυθροδανωμένα': 'red-dyed', 'περιηργυρωμέναι': 'silver-plated',
  'καταχρυσώσεις': 'overlay', 'κατεχρύσωσεν': 'overlay', 'ἐχώνευσεν': 'cast',
  'λινοῦν': 'linen',        'λινῆν': 'linen',
  'πυρεῖον': 'fire-pan',    'πυρεῖα': 'fire-pans',
  'θυίσκην': 'censer',      'θυίσκας': 'censers',
  // ── Sacrifice — body parts / materials ───────────────────────────────────
  'ἥπατος': 'liver',        'λοβὸν': 'lobe',           'μηρίων': 'thighs',
  'κόπρον': 'dung',         'ἐνδόσθια': 'entrails',    'ἐνδοσθίων': 'entrails',
  'χρίσεως': 'anointing',   'μυρεψοῦ': 'perfumer',
  'κανοῦ': 'basket',        'κανοῦν': 'basket',        'κανῷ': 'basket',
  'λάγανα': 'cakes',        'λάγανον': 'cake',
  'ἐγκρυφίας': 'bread',     'πεφυραμένης': 'mixed',    'πεφυραμένην': 'mixed',
  'τηγάνου': 'pan',
  // ── Purity laws vocabulary ────────────────────────────────────────────────
  'θνησιμαίων': 'carcasses', 'θνησιμαῖον': 'carcass', 'θηριάλωτον': 'torn',
  'μηρυκισμὸν': 'cud',      'ὁπλὴν': 'hoof',           'διχηλεῖ': 'hoof',
  'διχηλοῦν': 'hoof',       'ὀνυχίζει': 'hoof',        'ἀκουσίως': 'unwittingly',
  'ἀφέδρου': 'impurity',    'ἀφέδρῳ': 'impurity',      'γονορρυής': 'discharge',
  'γονορρυὴς': 'discharge', 'οὐλὴ': 'scar',            'ὀρνίθιον': 'bird',
  'ὀρνιθίου': 'bird',       'πετεινῶν': 'birds',       'πετεινὰ': 'birds',
  'πετεινοῖς': 'birds',     'πετεινὸν': 'bird',        'ἑρπόντων': 'creeping things',
  'γλαῦκα': 'owl',          'θραῦσμα': 'bruise',        'θραύσματος': 'bruise',
  'θραῦσις': 'bruise',      'κέδρινον': 'cedar',        'ἐξαριθμήσεται': 'number',
  'ἐξαριθμῆσαι': 'number',
  // ── Measures / loanwords ─────────────────────────────────────────────────
  'ιν': 'hin',              'μαν': 'manna',             'οιφι': 'ephah',
  'γομορ': 'omer',          'σίκλον': 'shekel',         'σίκλων': 'shekels',
  'σίκλοι': 'shekels',      'σίκλους': 'shekels',       'ὁλκὴ': 'weight',
  'σταθμῷ': 'weight',       'σταθμῶν': 'weights',       'στάθμιον': 'weight',
  'σύγκρισιν': 'interpretation',
  // ── Census / military vocabulary ─────────────────────────────────────────
  'ἐπίσκεψις': 'census',    'ἐπισκέψεως': 'census',    'ἐπίσκεψιν': 'census',
  'σημασία': 'signal',      'σημασίαν': 'signal',       'σημασίας': 'signal',
  'σημασίᾳ': 'signal',      'παράταξιν': 'battle',      'ἐνωπλισμένοι': 'armed',
  'ἐπρονόμευσαν': 'plunder','προνομὴν': 'plunder',      'πολεμιστῶν': 'warriors',
  'ἐπίκλητος': 'summoned',  'ἑκατοντάρχους': 'captains','πεντηκοντάρχους': 'captains',
  'δεκαδάρχους': 'captains','γραμματοεισαγωγεῖς': 'officers','ἀρχιστράτηγος': 'commander',
  'ἀρχιοινοχόος': 'cupbearer','κατεσκέψαντο': 'spy out','κατασκέψασθαι': 'spy out',
  // ── Libations / offerings (additional) ───────────────────────────────────
  'σπονδαὶ': 'libations',   'σπονδὴν': 'libation',     'σπονδὴ': 'libation',
  'σπονδὰς': 'libations',   'ἐπιδέκατον': 'tenth',     'ἐπιδέκατα': 'tenths',
  'ἐνιαύσιον': 'yearling',  'ἐνιαυσίους': 'yearlings', 'ἐνιαυσίας': 'yearly',
  'μηνιαίου': 'monthly',    'εἰκοσαετοῦς': 'twenty years old',
  'πεντεκαιεικοσαετοῦς': 'twenty-five years old',
  'πεντηκονταετοῦς': 'fifty years old',
  // ── Numbers / quantities ──────────────────────────────────────────────────
  'ἑπτακόσιοι': 'seven hundred', 'ἑπτακόσια': 'seven hundred',
  'ὀκτακόσια': 'eight hundred',  'ἐννακόσια': 'nine hundred',
  'ὀκτακισχίλιοι': 'eight thousand', 'ἐνενήκοντα': 'ninety',
  'εἰκάδι': 'twentieth',     'πεντεκαίδεκα': 'fifteen', 'ἑβδομάδων': 'weeks',
  'ἑβδομάδας': 'weeks',
  // ── Geography / landscape ─────────────────────────────────────────────────
  'πεδίῳ': 'plain',         'πεδίον': 'plain',          'πεδίοις': 'plains',
  'πεδίων': 'plains',       'πεδίου': 'plain',          'χειμάρρου': 'wadi',
  'χειμάρρουν': 'wadi',     'χειμάρρους': 'wadi',       'κλίτος': 'side',
  'κλίτους': 'side',        'κλίτη': 'sides',            'κλίτει': 'side',
  'πλαγίων': 'sides',       'πλαγίῳ': 'side',           'πλάγιοι': 'lateral',
  'ἐπάνωθεν': 'above',      'κάτωθεν': 'below',         'ἔνδον': 'within',
  // ── People / social ───────────────────────────────────────────────────────
  'παλλακὴ': 'concubine',   'νυμφαγωγὸς': 'best man',  'γαμβρὸς': 'son-in-law',
  'γαμβρῷ': 'son-in-law',   'γαμβροῦ': 'son-in-law',   'θεραπαίνης': 'maidservant',
  'μαῖαι': 'midwives',      'οἰκογενεῖς': 'homeborn',  'αὐτόχθων': 'native',
  'ἐγχωρίῳ': 'native',      'πατριῶν': 'clans',         'ἀγχιστεύων': 'kinsman',
  'ἀγχιστεύοντος': 'kinsman', 'φυγαδευτήρια': 'refuge cities',
  // ── Livestock / animals ───────────────────────────────────────────────────
  'μοσχάριον': 'calf',      'σκύμνος': 'cub',           'δορκάδα': 'gazelle',
  'ἔλαφον': 'deer',         'βουκόλια': 'herds',         'βουκολίων': 'herds',
  'κτῆσιν': 'property',     'κτήσει': 'property',        'ἀμητὸν': 'harvest',
  'γίγας': 'giant',         'εὐθηνία': 'abundance',     'εὐθηνίας': 'abundance',
  'πρωτογενημάτων': 'firstfruits', 'δρόσου': 'dew',
  // ── Ornaments / garments ─────────────────────────────────────────────────
  'ψέλια': 'bracelets',     'ἐνώτια': 'earrings',       'θέριστρον': 'veil',
  'μανδραγορῶν': 'mandrakes',
  // ── Pillar / standing stone ───────────────────────────────────────────────
  'στήλην': 'pillar',       'στήλη': 'pillar',           'στήλας': 'pillars',
  'ἄλση': 'Asherahs',
  // ── Sacks / containers ───────────────────────────────────────────────────
  'μάρσιππον': 'sack',      'μαρσίππῳ': 'sack',         'μαρσίπποις': 'sacks',
  'μαρσίππους': 'sacks',    'ἁμάξας': 'wagons',          'κόνδυ': 'cup',
  'δράγμα': 'sheaf',        'δράγματα': 'sheaves',       'λάκκον': 'pit',
  'λάκκου': 'pit',
  // ── Agricultural / food ──────────────────────────────────────────────────
  'πυρῶν': 'wheat',         'λεπταὶ': 'thin',            'λεπτοὶ': 'thin',
  'λεπτὸν': 'thin',         'ἀνεμόφθοροι': 'blighted',  'πίων': 'fat',
  'ἀενάων': 'perennial',    'ζυμωτόν': 'leavened',       'ἄσηπτα': 'unleavened',
  'ἀσήπτων': 'unleavened',
  // ── Skin disease vocabulary (Lev 13–14) ──────────────────────────────────
  'τηλαυγὴς': 'bright',     'ἀμαυρά': 'dim',            'ξανθίζουσα': 'yellowish',
  'πυρρίζουσα': 'reddish',  'φαλακρώματι': 'baldness',  'ἀναφαλαντώματι': 'baldness',
  'ἔμμονός': 'persistent',  'μετέπεσεν': 'changed',     'διαχύσει': 'spread',
  'διεχύθη': 'spread',      'ἐξήνθησεν': 'erupted',
  // ── Misc verbs (without Strong's) ────────────────────────────────────────
  'ῥανεῖ': 'sprinkle',      'ῥανεῖται': 'sprinkle',     'περιρρανεῖ': 'sprinkle',
  'βάδιζε': 'go',           'ᾤχετο': 'depart',           'ἀπότρεχε': 'flee',
  'ἀπέδρα': 'flee',         'διεσκέδασεν': 'scatter',    'ἐλέπισεν': 'peel',
  'ἐνάρκησεν': 'prevail',   'ᾔδει': 'know',              'ᾔδεισαν': 'know',
  'οἶδα': 'know',           'οἴδατε': 'know',             'οἴδαμεν': 'know',
  'οἴδασιν': 'know',        'οἶδεν': 'know',              'εἰδέναι': 'know',
  'εἰδῇς': 'know',          'ἐξαναλῶσαι': 'consume',    'ἐξαναλώσω': 'consume',
  'ἐξαναλώσει': 'consume',  'ἐκτρίψει': 'destroy',       'ἐκτριβήσεται': 'destroy',
  'ἐκκλησίασον': 'assemble','ἐξαγορεύσει': 'confess',   'παρίδῃ': 'overlook',
  'ἀφαγνισθῇ': 'purify',   'ἐκμιανθῆναι': 'defile',    'προσέχεεν': 'pour',
  'προσχεεῖς': 'pour',      'προσχεοῦσιν': 'pour',       'διαχέηται': 'pour',
  'ἐπόζεσεν': 'stink',      'ἐπώζεσεν': 'stink',         'κερατίσῃ': 'gore',
  'ἑψήσεις': 'boil',        'ἀνανεύσῃ': 'refuse',        'ἀνανεύων': 'refuse',
  'παρατάξασθαι': 'battle', 'παρασιωπήσῃ': 'keep silent', 'πρίασθαι': 'buy',
  'ἐπιστοιβάσουσιν': 'pile','κατακληρονομῆσαι': 'inherit','καταμετρήσετε': 'measure',
  'κατῳκίσθησαν': 'settle', 'ἐκτοκιεῖς': 'lend',         'ἐνέχυρον': 'pledge',
  'ἀπόδομα': 'repayment',   'πολυπλασιασθῆτε': 'multiply','μακροημερεύσητε': 'live long',
  // ── Misc nouns ────────────────────────────────────────────────────────────
  'ζηλοτυπίας': 'jealousy', 'ζηλώσεως': 'jealousy',     'γύμνωσιν': 'nakedness',
  'ἀποσκευὴν': 'baggage',   'ἀποσκευὴ': 'baggage',       'ἀποσκευῆς': 'baggage',
  'εὖρος': 'width',         'εὐρεῖς': 'wide',             'ὁρκισμοῦ': 'oath',
  'σκνῖφες': 'gnats',       'κυνόμυια': 'flies',          'ἐπαοιδοὶ': 'magicians',
  'φαρμακείαις': 'sorceries','θύματα': 'sacrifices',      'ἐδέσματα': 'provisions',
  'σύνθεσιν': 'composition','σύνταξιν': 'arrangement',    'διχοτομήματα': 'halves',
  'παρθένια': 'maidenhood',
  'φαιὸν': 'speckled',      'διάλευκον': 'striped',       'διαλεύκους': 'striped',
  'ἐνταῦθα': 'here',
};

export function normalizeGloss(gloss: string, orig?: string, lemma?: string): string {
  if (!gloss || gloss === '[no gloss]') return gloss;

  // 1. Lemma override — most authoritative
  if (lemma && LEMMA_OVERRIDES[lemma]) return LEMMA_OVERRIDES[lemma];

  // 2. Particle map — exact orig match, then strip-points match for Hebrew
  if (orig) {
    const o = orig.trim();
    if (PARTICLES[o]) return PARTICLES[o];
    // Strip Hebrew vowel points and cantillation marks
    const bare = o.replace(/[\u0591-\u05C7]/g, '');
    if (PARTICLES[bare]) return PARTICLES[bare];
    // Greek form map (for LXX entries without Strong's numbers)
    if (GREEK_FORMS[o]) return GREEK_FORMS[o];
  }

  let g = gloss.trim();

  // 3. Strip "properly," / "perhaps properly," / "literally," / "viz." prefixes
  g = g.replace(/^(perhaps\s+)?(properly|literally|viz\.?|i\.e\.?),?\s+/i, '');

  // 4. STEPBible LXX format: "the/this/who", "spirit/breath: spirit", "earth: planet"
  //    Take before ":" first (contextual qualifier), then before "/"
  const colonIdx = g.indexOf(':');
  if (colonIdx > 0) g = g.slice(0, colonIdx).trim();
  const slashIdx = g.indexOf('/');
  if (slashIdx > 0) g = g.slice(0, slashIdx).trim();

  // 5. Remove parenthetical notes
  g = g.replace(/\s*\([^)]*\)\.?/g, '').trim();
  // Also strip unclosed parens
  g = g.replace(/\s*\([^)]*$/, '').trim();

  // 6. Remove scholarly qualifiers
  g = g.replace(/\bin the ordinary sense\b/gi, '').trim();
  g = g.replace(/\bin [a-z]+ sense\b/gi, '').trim();
  g = g.replace(/\bused (?:very |quite )?\w+ as\b.*/gi, '').trim();

  // 7. Take first of semantic-range alternatives
  g = g.split(/;\s*/)[0].trim();
  g = g.split(/,\s+(?=[a-z])/)[0].trim();
  g = g.split(/\s+or\s+/i)[0].trim();

  // 8. Remove trailing ellipsis and stray punctuation
  g = g.replace(/[.…]{2,}$/, '').trim();
  g = g.replace(/[.;:,]+$/, '').trim();

  // 9. Remove trailing single-letter abbreviation
  g = g.replace(/,?\s+[a-z]\.?$/i, '').trim();

  // 10. Root/stem: strip leading "to " (infinitive → root form)
  g = g.replace(/^to\s+/i, '').trim();

  // 11. If still over 20 chars, take first 1-3 words
  if (g.length > 20) {
    const ws = g.split(/\s+/).filter(Boolean);
    g = ws.slice(0, Math.min(3, ws.length)).join(' ');
  }

  // 12. Max 3 words
  const words = g.split(/\s+/).filter(Boolean);
  if (words.length > 3) g = words.slice(0, 3).join(' ');

  return g || gloss; // fallback to original if empty
}
