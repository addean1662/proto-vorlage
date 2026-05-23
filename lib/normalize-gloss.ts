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
  'G2992': 'people',    // λαός
  // ── Greek (LXX-specific corrections per NETS audit) ─────────────────────
  'G4733': 'firmament', // στερέωμα  — TBESG: "firmness" (poor gloss; all LXX trs. use "firmament")
  'G5458': 'luminary',  // φωστήρ    — TBESG: "light" (conflates φωστήρ with φῶς; NETS: "luminary")
  'G3857': 'garden',    // παράδεισος — TBESG: "paradise" (anachronistic; NETS: "orchard")
  'G2062': 'creeping thing', // ἑρπετόν — TBESG: "reptile" (too narrow; NETS: "creeping thing")
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
  'Αμαληκ': 'Amalek',      'Ιαφεθ': 'Japheth',       'Χαμ': 'Ham',
  'Ελιφας': 'Eliphaz',     'Θαμνα': 'Timna',         'Βασεμμαθ': 'Basemath',
  'Σεβεγων': 'Zibeon',     'Ανα': 'Anah',            'Ιαμιν': 'Jamin',
  'Χοδολλογομορ': 'Chedorlaomer', 'Αραδ': 'Arad',   'Σηλωμ': 'Shelah',
  'Οζιηλ': 'Uzziel',       'Διναν': 'Dinan',
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
  // ── Gender / human vocabulary ─────────────────────────────────────────────
  'ἀρσενικόν': 'male',     'ἀρσενικὸν': 'male',        'ἀρσενικά': 'male',
  'ἀρσενικὰ': 'male',      'ἀρσενικοῦ': 'male',        'ἀρσενικῷ': 'male',
  'νεάνιδι': 'girl',       'νεᾶνιν': 'girl',            'νεᾶνις': 'girl',
  // ── Head / top / summit ───────────────────────────────────────────────────
  'κορυφῆς': 'head',       'κορυφὴν': 'head',           'κορυφή': 'head',
  'κορυφήν': 'head',       'κορυφαί': 'heads',          'κορυφαῖς': 'heads',
  // ── Idolatry / images ─────────────────────────────────────────────────────
  'γλυπτὰ': 'idols',       'γλυπτὸν': 'idol',           'γλυπτόν': 'idol',
  'γλυπτά': 'idols',       'γλυπτοῦ': 'idol',           'γλυπτοῖς': 'idols',
  // ── Weaving / textile ─────────────────────────────────────────────────────
  'κρόκῃ': 'warp',         'κρόκην': 'warp',             'κρόκον': 'warp',
  'στήμονι': 'warp thread','στήμονα': 'warp thread',     'στήμων': 'warp thread',
  'ποικιλτοῦ': 'embroiderer','ποικιλτής': 'embroiderer',
  // ── Fractions / fifths ────────────────────────────────────────────────────
  'ἐπίπεμπτον': 'fifth part','ἐπίπεμπτα': 'fifth parts','ἐπιπέμπτου': 'fifth part',
  // ── Violence / crime ─────────────────────────────────────────────────────
  'φονευτής': 'murderer',  'φονευτοῦ': 'murderer',      'φονευτάς': 'murderers',
  // ── Rebuke / proof ───────────────────────────────────────────────────────
  'ἐλεγμοῦ': 'rebuke',     'ἐλεγμόν': 'rebuke',         'ἐλεγμός': 'rebuke',
  // ── Exchange / commerce ──────────────────────────────────────────────────
  'ἄλλαγμα': 'exchange',   'ἀλλάγματα': 'exchanges',    'πράσεως': 'sale',
  // ── Purity / misc ────────────────────────────────────────────────────────
  'διατήρησιν': 'observance','συμβολήν': 'meeting point','δειλινόν': 'evening',
  'κοτύλην': 'cotyle',     'πλινθείας': 'brick-making',
  'τραυματίου': 'wounded',  'Αμορραίου': 'Amorite',
  // ── Genesis — Table of Nations (Gen 10) ───────────────────────────────────
  'Γαμερ': 'Gomer',         'Ιωυαν': 'Javan',           'Ελισα': 'Elishah',
  'Μοσοχ': 'Meshech',       'Μεσραιμ': 'Mizraim',        'Νεβρωδ': 'Nimrod',
  'Ευιλα': 'Havilah',       'Σαβαθα': 'Sabtah',          'Ρεγμα': 'Raamah',
  'Ροωβωθ': 'Rehoboth',     'Χαλαχ': 'Calah',            'Ως': 'Uz',
  'Μασση': 'Massa',
  // ── Genesis — Primeval history / early genealogies ────────────────────────
  'Ευιλατ': 'Havilah',      'Γαιδαδ': 'Irad',            'Μαιηλ': 'Mehujael',
  'γίγαντες': 'giants',     'ὀνομαστοί': 'renowned',     'καταρράκται': 'floodgates',
  'ἑξακοσιοστῷ': 'six hundredth',
  // ── Genesis — Patriarchal narrative (Gen 11–24) ───────────────────────────
  'Σαραν': 'Haran',          'Βαραδ': 'Bered',            'Σααρ': 'Zoar',
  'κυνηγὸς': 'hunter',
  // ── Genesis — Esau's clan / Seir genealogy (Gen 36) ─────────────────────
  'Ιεους': 'Jeush',          'Ιεγλομ': 'Jalam',           'Σωφαρ': 'Zepho',
  'Ασαρ': 'Ezer',            'Ρισων': 'Dishan',            'Ασομ': 'Husham',
  'Χασβι': 'Chezib',         'Ασεννεθ': 'Asenath',
  // ── Genesis — Joseph narrative (Gen 37–50) ───────────────────────────────
  'κάρπιμον': 'fruit-bearing','στεάτων': 'fat',
  // ── Exodus — Vocabulary ───────────────────────────────────────────────────
  'ἀναβάτας': 'horsemen',    'ἀναβάτην': 'horseman',      'φαῦσιν': 'illumination',
  'συνάψεις': 'loops',       'συνάψητε': 'join',          'ὑφάντου': 'weaver',
  'ὑφάντης': 'weaver',       'διανενησμένου': 'braided',   'ἀσπιδίσκας': 'rosettes',
  'ἀσπιδίσκη': 'rosette',    'κατακαύματος': 'burn mark',  'περικύκλῳ': 'around',
  'ἐξαρχόντων': 'singers',   'ἐγκαθημένοις': 'inhabitants',
  // ── Leviticus — Vocabulary ───────────────────────────────────────────────
  'πένηται': 'poor',          'πένης': 'poor',              'φυλάγματα': 'watches',
  'προσκειμένων': 'adjoining','προσκειμένῳ': 'adjoining',
  // ── Numbers — Proper nouns ───────────────────────────────────────────────
  'Αραβωθ': 'Araboth',        'Οφερ': 'Hepher',             'Σαμι': 'Shami',
  'Ετεβαθα': 'Taberah',
  // ── Numbers — Vocabulary ────────────────────────────────────────────────
  'διεμβαλοῦσιν': 'insert',   'ἐπικαταρωμένου': 'cursed',   'ἐπικαταρώμενον': 'cursed',
  'κατάβρωμα': 'prey',         'πρέσβεις': 'messengers',     'ἄρασαί': 'curse',
  'μονοκέρωτος': 'wild ox',    'ἐχθραίνετε': 'be hostile',
  'ὁρισμοὺς': 'boundaries',   'ὁρισμοὶ': 'boundaries',      'ὁρισμός': 'boundary',
  'ὁρισμοί': 'boundaries',
  // ── Deuteronomy — Vocabulary ────────────────────────────────────────────
  'ἐξέτριψαν': 'destroy',
  // ── Genesis 4–9 — Early history (additional forms) ───────────────────────
  'συνέπεσεν': 'fell',          'στένων': 'groaning',          'ὠσφράνθη': 'smelled',
  'ἐπεκράτει': 'prevailed',     'ἐνεδίδου': 'was abating',
  // ── Genesis 11–13 — Additional places ────────────────────────────────────
  'Γεραρα': 'Gerar',            'Αγγαι': 'Ai',
  // ── Genesis 14 — Battle of the kings ─────────────────────────────────────
  'Αμαρφαλ': 'Amraphel',        'Αριωχ': 'Arioch',             'Ελλασαρ': 'Ellasar',
  'Θαργαλ': 'Tidal',            'Ασταρωθ': 'Ashteroth',        'Σαυη': 'Shaveh',
  'Εσχωλ': 'Eshcol',            'γίγαντας': 'giants',
  'παρετάξαντο': 'battle',      'κοιλάδι': 'valley',           'ἀπῴχοντο': 'departed',
  // ── Genesis — Oak tree forms ──────────────────────────────────────────────
  'δρῦν': 'oak',                'δρυὶ': 'oak',                  'δρυός': 'oak',
  // ── Genesis 15–22 — Abraham narratives ───────────────────────────────────
  'τριετίζουσαν': 'three years old','βούτυρον': 'butter',      'σκέπην': 'shade',
  'ἀορασίᾳ': 'blindness',       'ἐκτρῖψαι': 'destroy',         'ἀπεγαλακτίσθη': 'weaned',
  'ἐπέσαξεν': 'saddled',        'Καμουηλ': 'Kemuel',
  // ── Genesis 24–25 — Rebekah / Isaac / Keturah narratives ─────────────────
  'ὑδρεύσομαι': 'draw water',  'ὑδρεύσατο': 'drew water',     'ἅβραι': 'maidservants',
  'Ιεξαν': 'Jokshan',          'Δαιδαν': 'Dedan',               'δίδυμα': 'twins',
  // ── Genesis 25–27 — Jacob / Esau narratives ──────────────────────────────
  'δασύς': 'hairy',             'ἕψεμα': 'stew',                'ἐφαύλισεν': 'despised',
  'ἐνέφραξαν': 'blocked',       'ἀπόδραθι': 'flee',
  // ── Genesis 29–31 — Jacob's wives / Laban ────────────────────────────────
  'Ζελφαν': 'Zilpah',           'Βαλλαν': 'Bilhah',             'ἀμνάδες': 'ewe-lambs',
  'οἰκογενὴς': 'homeborn',      'ἀργυρώνητος': 'bought',        'Μελχας': 'Milcah',
  // ── Gentilics (additional case forms) ────────────────────────────────────
  'Χετταίους': 'Hittites',      'Ευαίους': 'Hivites',           'Ευαίου': 'Hivite',
  'Χετταῖος': 'Hittite',        'Μωαβιτῶν': 'Moabites',         'Γεραροις': 'Gerar',
  'ἄγροικος': 'farmer',
};

// Latin word-form overrides for Vulgate (medieval spellings: æ/œ ligatures,
// inflected forms whose L&S lemma lookup returned no gloss).
const LATIN_FORMS: Record<string, string> = {
  // ── Pronouns / particles ──────────────────────────────────────────────────
  'cujus': 'whose',          'cujusquam': 'anyone',     'uniuscujusque': 'each one',
  'ne': 'whether',           'illæ': 'they',            'tantæ': 'so great',

  // ── Praecipere (command) / praecedere (precede) ───────────────────────────
  'præcipio': 'command',     'præcipiat': 'command',    'præcepero': 'command',
  'præcipiente': 'command',  'præceperit': 'command',   'præceptorum': 'commands',
  'præcedite': 'go before',  'præcessit': 'go before',  'præcede': 'go before',
  'præcedens': 'precede',

  // ── Praedicere / praedicare ───────────────────────────────────────────────
  'prædico': 'proclaim',     'prædixerit': 'foretell',  'prædicta': 'foretold',

  // ── Praedari (plunder) ────────────────────────────────────────────────────
  'præda': 'plunder',        'prædæ': 'plunder',        'prædantium': 'plunderers',

  // ── Praeparare (prepare) ──────────────────────────────────────────────────
  'præparatum': 'prepared',  'præparabit': 'prepare',

  // ── Praesidium (garrison) ─────────────────────────────────────────────────
  'præsidium': 'garrison',   'præsidio': 'garrison',    'præsidia': 'garrisons',

  // ── Praesto / praebere (provide/ready) ────────────────────────────────────
  'præstoque': 'ready',      'præstiterunt': 'provide', 'præbuerit': 'provide',

  // ── Praeterire (pass by) ─────────────────────────────────────────────────
  'præterieritis': 'pass by','præterire': 'pass by',    'præteribis': 'pass by',
  'præterivi': 'pass by',

  // ── Praefectus / praeferre ────────────────────────────────────────────────
  'præfectique': 'officers', 'præferre': 'prefer',

  // ── Praevaricari / praesens / praeclarus / praecipuus ─────────────────────
  'prævaricari': 'transgress','præsenti': 'present',
  'præclara': 'splendid',    'præcipuum': 'chief',

  // ── Proelium (battle) ─────────────────────────────────────────────────────
  'prælium': 'battle',       'prælio': 'battle',

  // ── Quaerere (seek) ──────────────────────────────────────────────────────
  'quæsieris': 'seek',       'quærat': 'seek',          'quæsieritque': 'seek',
  'quæresque': 'seek',       'quæremus': 'seek',        'quære': 'seek',
  'quæstio': 'inquiry',

  // ── Aedificare (build) ───────────────────────────────────────────────────
  'Ædifica': 'build',        'Ædificate': 'build',      'ædificaveris': 'build',
  'ædificaverunt': 'build',  'ædificabis': 'build',     'ædificatur': 'build',
  'ædificabitur': 'build',   'ædificat': 'build',       'ædificasti': 'build',
  'ædifices': 'build',       'ædificetur': 'build',

  // ── Caelum (heavens) ─────────────────────────────────────────────────────
  'cælorum': 'heavens',      'cælique': 'heavens',

  // ── Haereditas (inheritance) ─────────────────────────────────────────────
  'hæreditas': 'inheritance','hæreditatem': 'inheritance',
  'hæreditatis': 'inheritance','hæreditate': 'inheritance',
  'hæreditarium': 'inheritance',

  // ── Caerimonia (rite/ceremony) ────────────────────────────────────────────
  'cæremonias': 'rite',      'cæremoniæ': 'rite',

  // ── Vinea (vineyard) ─────────────────────────────────────────────────────
  'vineas': 'vineyard',      'vinearum': 'vineyard',

  // ── Hircus + -que enclitic (male goat; and) ──────────────────────────────
  'hircumque': 'male goat',

  // ── Occidere / interficere (kill/slay) ───────────────────────────────────
  'occisi': 'slain',         'occisorum': 'slain',      'occideris': 'kill',
  'occidatur': 'kill',       'interfecerunt': 'kill',   'interfecto': 'slain',
  'interfectis': 'slain',    'interfecta': 'slain',     'interfectum': 'slain',
  'interficias': 'kill',     'interfecistis': 'kill',   'interficere': 'kill',

  // ── Caedere (cut/strike/hew) ─────────────────────────────────────────────
  'cædebat': 'strike',       'cædent': 'cut',           'cædis': 'slaughter',
  'cædenda': 'cut',          'cæsoribus': 'hewers',     'scidit': 'tear',
  'sciderunt': 'tear',

  // ── Contradicere (contradict) ────────────────────────────────────────────
  'contradixerit': 'contradict','contradixit': 'contradict',

  // ── Botrus (cluster of grapes) ───────────────────────────────────────────
  'botri': 'cluster',        'botrum': 'cluster',

  // ── Justus (just/righteous) ──────────────────────────────────────────────
  'justum': 'just',          'justorum': 'just',        'justo': 'just',
  'justaque': 'just',        'judicate': 'judge',

  // ── Torrens (torrent/stream) ─────────────────────────────────────────────
  'torrentis': 'torrent',    'torrentium': 'torrents',  'torrentibus': 'torrents',
  'torrenti': 'torrent',

  // ── Rebellis (rebel) ─────────────────────────────────────────────────────
  'rebelles': 'rebels',      'rebellis': 'rebel',       'rebellium': 'rebels',

  // ── Terminus (boundary) ──────────────────────────────────────────────────
  'terminus': 'boundary',

  // ── Perversus / contrarius ────────────────────────────────────────────────
  'perversa': 'perverse',    'contraria': 'contrary',

  // ── Gigas (giant) ────────────────────────────────────────────────────────
  'gigantum': 'giants',

  // ── Mutuum (loan) ────────────────────────────────────────────────────────
  'mutuum': 'loan',

  // ── Odiosus (hated) ──────────────────────────────────────────────────────
  'odiosæ': 'hated',

  // ── Fenerare / foenum / foedus / poenitudo ───────────────────────────────
  'fœnerabis': 'lend',       'fœnerabit': 'lend',       'fœnus': 'interest',
  'fœnumque': 'grass',       'fœditatis': 'shame',      'fœde': 'shamefully',
  'pœnitudine': 'repentance',

  // ── Communis / extremus / infinitus / immensus ────────────────────────────
  'commune': 'common',
  'extremam': 'uttermost',   'extremo': 'uttermost',
  'infinita': 'countless',   'infinitæ': 'countless',   'immensa': 'immense',

  // ── Misericordia (mercy) ─────────────────────────────────────────────────
  'misericordiæ': 'mercy',

  // ── Murmurare (grumble) ──────────────────────────────────────────────────
  'murmurastis': 'murmur',   'murmurare': 'murmur',     'murmurat': 'murmur',
  'murmurant': 'murmur',     'murmuretis': 'murmur',

  // ── Pessimus ─────────────────────────────────────────────────────────────
  'pessimæ': 'worst',

  // ── Deglutire (swallow) ──────────────────────────────────────────────────
  'deglutiat': 'swallow',

  // ── Virga (rod/branch) ───────────────────────────────────────────────────
  'virgæ': 'rod',

  // ── Vacca (heifer) ───────────────────────────────────────────────────────
  'vaccæ': 'heifer',

  // ── Puteus (well) / publicus / votum / stabulum ───────────────────────────
  'puteis': 'wells',         'publica': 'public',
  'voti': 'vow',             'stabula': 'enclosures',

  // ── Munire (fortify) ─────────────────────────────────────────────────────
  'munitas': 'fortified',    'munitæ': 'fortified',

  // ── Confinium (border) ───────────────────────────────────────────────────
  'confinia': 'borders',     'confinium': 'border',

  // ── Suburbanus (pastureland of Levitical cities) ──────────────────────────
  'suburbanis': 'pasturelands',

  // ── Propinquus / femina / redemit ────────────────────────────────────────
  'propinquum': 'nearest kin','feminæ': 'woman',         'redemit': 'redeem',

  // ── Conflatile (molten image) / ruminant / sicera ────────────────────────
  'conflatile': 'molten image','ruminant': 'chew cud',   'siceram': 'strong drink',

  // ── Laetitia / laetari (joy/rejoice) ─────────────────────────────────────
  'lætitia': 'joy',          'lætaberis': 'rejoice',    'lætetur': 'rejoice',
  'lætatus': 'rejoice',

  // ── Sacerdos / calx / laevigare / aversus ────────────────────────────────
  'sacerdotibus': 'priests', 'calce': 'lime',
  'lævigabis': 'smooth',     'aversum': 'turned away',

  // ── Antiquus ─────────────────────────────────────────────────────────────
  'antiquorum': 'ancients',  'antiquis': 'ancients',

  // ── Hujusmodi / supradictus / maledic ────────────────────────────────────
  'hujuscemodi': 'of this kind','istiusmodi': 'of this kind',
  'supradictarum': 'aforementioned','supradictis': 'aforementioned',
  'maledic': 'curse',

  // ── Novissimus (last/final) ──────────────────────────────────────────────
  'novissima': 'last',       'novissimo': 'last',       'novissimum': 'last',

  // ── Phiala / plena / lucerna / tuba / clangere ───────────────────────────
  'phialæ': 'bowls',         'plena': 'full',
  'lucernæ': 'lamps',        'tubæ': 'trumpet',
  'clangueris': 'sound',     'sonitu': 'sound',

  // ── Vigesimus / benefacere / absorptus ───────────────────────────────────
  'vigesima': 'twentieth',   'benefaciamus': 'do good', 'absorptus': 'consumed',

  // ── Food and drink ───────────────────────────────────────────────────────
  'pepones': 'melons',       'cæpe': 'onion',           'tortulas': 'wafers',
  'comedamus': 'eat',        'comeditur': 'eat',         'comederet': 'eat',
  'comedebant': 'eat',       'comedens': 'eat',          'comedesque': 'eat',

  // ── Nares / repellere ────────────────────────────────────────────────────
  'nares': 'nostrils',       'repuleritis': 'reject',

  // ── Prophetare / propheta ─────────────────────────────────────────────────
  'prophetaverunt': 'prophesy','prophetarent': 'prophesy','prophetant': 'prophesy',
  'prophetet': 'prophesy',   'prophetes': 'prophet',    'prophetæ': 'prophet',

  // ── Arreptans / coros / Aethiopissa ──────────────────────────────────────
  'arreptans': 'seizing',    'coros': 'cors',            'Æthiopissam': 'Ethiopian woman',

  // ── Sum (to be) garbled forms ─────────────────────────────────────────────
  'fuissent': 'be',          'sintque': 'be',            'eramus': 'be',
  'eratis': 'be',            'sitæ': 'situated',

  // ── Aenigmata / praecoquae ────────────────────────────────────────────────
  'ænigmata': 'riddles',     'præcoquæ': 'early figs',

  // ── Intrare (enter) ──────────────────────────────────────────────────────
  'intrantibus': 'entering', 'intrantes': 'entering',   'introëunte': 'entering',
  'introëas': 'enter',

  // ── Granatum / circuita / revera ─────────────────────────────────────────
  'granatis': 'pomegranate', 'circuita': 'surrounding', 'revera': 'truly',

  // ── Recludo / proceres / crastinus ───────────────────────────────────────
  'recluserunt': 'detain',   'proceres': 'leaders',     'crastino': 'tomorrow',

  // ── Desaevire / impius / consuescere / monimentum ────────────────────────
  'desæviet': 'rage',        'desævit': 'rage',
  'impiorum': 'impious',     'impia': 'impious',
  'consueta': 'accustomed',  'consuevisti': 'accustom', 'monimento': 'memorial',

  // ── Aeneus / turgentibus / querela ───────────────────────────────────────
  'ænea': 'bronze',          'turgentibus': 'budding',  'querelæ': 'complaint',

  // ── Electus / egregius / pinguis / integer ───────────────────────────────
  'electa': 'chosen',        'egregia': 'excellent',    'egregium': 'excellent',
  'pinguia': 'fat',          'integræ': 'whole',

  // ── Flamma / ecclesia / vivus / largus ───────────────────────────────────
  'flammæ': 'flame',         'ecclesiæ': 'congregation',
  'vivæ': 'living',          'largissimæ': 'abundant',  'largiter': 'abundantly',

  // ── Taedere / regia / possessa / ditio ───────────────────────────────────
  'tædere': 'weary',         'regia': 'royal',
  'possessa': 'possessed',   'ditionis': 'dominion',

  // ── Commorari (dwell/stay) ────────────────────────────────────────────────
  'commorantur': 'dwell',    'commorantem': 'dwell',    'commorante': 'dwell',
  'commoratur': 'dwell',

  // ── Angustia (distress/narrow) ───────────────────────────────────────────
  'angustiis': 'distress',   'angustum': 'narrow',      'angustia': 'distress',

  // ── Resistere / nemorosus / ossa / nuntius / proximus ────────────────────
  'resistenti': 'resist',    'nemorosæ': 'wooded',
  'ossaque': 'bones',        'nuntiis': 'messengers',   'nuntii': 'messengers',
  'proximos': 'neighbor',    'proximus': 'neighbor',

  // ── Genitalis / matutinus / ceteri ───────────────────────────────────────
  'genitalibus': 'genitals', 'matutinum': 'morning',
  'ceterarum': 'others',     'ceteros': 'others',

  // ── Rescire / parens / milleni ───────────────────────────────────────────
  'rescivit': 'learn',       'parentis': 'parent',      'millenos': 'thousands',

  // ── Numbers ──────────────────────────────────────────────────────────────
  'trecenta': 'three hundred','quingentæ': 'five hundred','sexcentæ': 'six hundred',

  // ── Murænula / famula / fabricari ────────────────────────────────────────
  'murænulas': 'necklaces',  'famulis': 'servants',     'fabricabimus': 'build',

  // ── Pauci / meridianus / auxilium / fortuitu ─────────────────────────────
  'paucis': 'few',           'meridiana': 'southern',
  'auxilia': 'help',         'fortuitu': 'by chance',

  // ── Jubilaeus / maritus / stella ─────────────────────────────────────────
  'jubilæus': 'jubilee',     'maritos': 'husbands',     'stellæ': 'stars',

  // ── Apis / parturiens / obfirmare / universus ────────────────────────────
  'apes': 'bees',            'parturientium': 'in labor',
  'obfirmaverat': 'harden',  'universisque': 'all',

  // ── Coepisse / adhaerere ─────────────────────────────────────────────────
  'cœpisti': 'begin',
  'adhæretis': 'cleave',     'adhærebis': 'cleave',     'adhærentes': 'cleave',
  'adhærebitis': 'cleave',   'adhærebunt': 'cleave',    'adhæreas': 'cleave',

  // ── Inclytus / volantes / sequester / tenebrae ───────────────────────────
  'inclyta': 'renowned',     'volantium': 'birds',
  'sequester': 'mediator',   'tenebrarum': 'darkness',

  // ── Irascor / sculptilis / odire / reminisci ─────────────────────────────
  'irasceturque': 'anger',   'irascetur': 'anger',
  'sculptilia': 'carved idols','odientibus': 'hating',  'reminiscaris': 'remember',

  // ── Nullus / inoboedire / aequitas / durus / comminatus ──────────────────
  'nullæ': 'none',           'inobedientes': 'disobedient',
  'æquitatem': 'justice',    'durissimæ': 'very stubborn','comminatus': 'threaten',

  // ── Irriguus / montuosus / subversus ─────────────────────────────────────
  'irriguæ': 'well-watered', 'montuosa': 'mountainous', 'subversæ': 'overthrown',

  // ── Deuteronomy 14 animals ───────────────────────────────────────────────
  'orygem': 'oryx',          'camelopardalum': 'giraffe','chœrogryllum': 'rock badger',
  'ixion': 'kite',           'herodium': 'stork',
  'hædum': 'kid goat',       'hædos': 'goats',

  // ── Subrepo / egenus / viaticum / festum ─────────────────────────────────
  'subrepat': 'creep up',    'egeno': 'poor',
  'viaticum': 'provisions',  'festum': 'feast',

  // ── Sapiens / inquisiere / ambiguus / python / alienus ───────────────────
  'sapientum': 'wise',       'sapientiæ': 'wisdom',
  'inquisieris': 'inquire',  'ambiguum': 'doubtful',
  'pythones': 'diviners',    'alienis': 'foreign',      'alienorum': 'foreign',

  // ── Vicinus / homicida / singulus / vitula ────────────────────────────────
  'vicino': 'neighbor',      'homicidæ': 'murderer',
  'singularum': 'individual','vitulæ': 'heifer',

  // ── Caesaries / dilectus / coercitus / comessatio / luxuria ──────────────
  'cæsariem': 'hair',        'dilectam': 'beloved',     'dilectæ': 'beloved',
  'coërcitus': 'restrained', 'comessationibus': 'feasting','luxuriæ': 'excess',

  // ── Incubare / praeceps / mamzer / requirere / polliceri ─────────────────
  'incubantem': 'nesting',   'præceps': 'headlong',
  'mamzer': 'illegitimate',  'requisita': 'required',   'polliceri': 'vow',

  // ── Opponere / volens / persequi / plane ─────────────────────────────────
  'opposuit': 'set against', 'volensque': 'willing',
  'persecuti': 'pursue',     'plane': 'plainly',

  // ── Caula / benedictus / aquila ──────────────────────────────────────────
  'caulæ': 'sheepfold',      'benedictæ': 'blessed',    'aquilæ': 'eagle',

  // ── Mollitia / secundae / gloriosus / scriptus / memoriter ───────────────
  'mollitiem': 'tenderness', 'secundarum': 'afterbirth',
  'gloriosum': 'glorious',   'scriptæ': 'written',      'memoriter': 'by heart',

  // ── Stilla / vastus / salutare / daemonium / infernus ────────────────────
  'stillæ': 'drops',         'vastæ': 'waste',
  'salutari': 'salvation',   'dæmoniis': 'demons',      'inferni': 'underworld',

  // ── Fel / opitulari / abyssus / luna / abscondere ────────────────────────
  'fel': 'gall',             'fellis': 'gall',
  'opitulentur': 'help',     'abysso': 'deep',           'lunæ': 'moon',
  'absconditos': 'hidden',

  // ── Dispergere / cogitare ─────────────────────────────────────────────────
  'disperserit': 'scatter',  'cogitato': 'consider',
};

// In connected Greek speech, final acute accent shifts to grave; converting
// back lets GREEK_FORMS keys (citation form, acute) match in-text forms.
function normalizeGreekAccents(s: string): string {
  return s.normalize('NFD').replace(/̀/g, '́').normalize('NFC');
}

export function normalizeGloss(gloss: string, orig?: string, lemma?: string): string {
  if (!gloss || gloss === '[no gloss]') {
    if (orig) {
      const o = orig.trim();
      if (GREEK_FORMS[o]) return GREEK_FORMS[o];
      const oNorm = normalizeGreekAccents(o);
      if (oNorm !== o && GREEK_FORMS[oNorm]) return GREEK_FORMS[oNorm];
      if (LATIN_FORMS[o]) return LATIN_FORMS[o];
    }
    return gloss;
  }

  // 1. Lemma override — most authoritative
  if (lemma && LEMMA_OVERRIDES[lemma]) {
    const override = LEMMA_OVERRIDES[lemma];
    // Preserve Hebrew morphological prefix prepositions (ב=in, מ=from, כ=like)
    // stored at the start of the raw gloss by the build script (e.g. "in the first…" → "in beginning")
    const prefixMatch = gloss.match(/^(in|from|like)\s+/i);
    if (prefixMatch) return `${prefixMatch[1].toLowerCase()} ${override}`;
    return override;
  }

  // 2. Particle map — exact orig match, then strip-points match for Hebrew
  if (orig) {
    const o = orig.trim();
    if (PARTICLES[o]) return PARTICLES[o];
    // Strip Hebrew vowel points and cantillation marks
    const bare = o.replace(/[\u0591-\u05C7]/g, '');
    if (PARTICLES[bare]) return PARTICLES[bare];
    // Greek form map (for LXX entries without Strong's numbers)
    if (GREEK_FORMS[o]) return GREEK_FORMS[o];
    const oNorm = normalizeGreekAccents(o);
    if (oNorm !== o && GREEK_FORMS[oNorm]) return GREEK_FORMS[oNorm];
    // Latin form map (for Vulgate entries with missing/garbled L&S glosses)
    if (LATIN_FORMS[o]) return LATIN_FORMS[o];
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
