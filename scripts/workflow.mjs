/**
 * Proto-Vorlage Build Workflow
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Master orchestrator for all four text traditions: MT, LXX, Vulgate, DSS.
 * Runs all build and enrichment steps in dependency order.
 *
 * ── Usage ──────────────────────────────────────────────────────────────────
 *
 *   node scripts/workflow.mjs                   run all steps in order
 *   node scripts/workflow.mjs --step <id>       run one step only
 *   node scripts/workflow.mjs --from <id>       run from this step onward
 *   node scripts/workflow.mjs --force           re-run even if outputs exist
 *   node scripts/workflow.mjs --dry-run         print plan without executing
 *   node scripts/workflow.mjs --status          show build state of all files
 *
 * ── Step IDs (in dependency order) ────────────────────────────────────────
 *
 *   mt          Build Masoretic Text from OSHB XML
 *   lxx         Build LXX from CSV word lists + TBESG
 *   vulgate     Build Vulgate from vulgate.net + GetBible + L&S
 *   lsj         Download and index LSJ (Perseus GitHub, ~43 MB XML)
 *   dss         Build DSS coverage structure from OSHB + coverage maps
 *   variants    Populate DSS attested verses with consonantal MT
 *   definitions Add xlit + full definition fields to MT and LXX
 *   normalize   Normalize all glosses to ≤3-word display form
 *   morph-vul   Back-fill Vulgate lemmas via Perseids (Gen/Exod/Lev)
 *   patch-vul   Patch remaining Vulgate [no gloss] via L&S + enclitics
 *   glosses     Fill LXX [no gloss] via LSJ; Vulgate via L&S + Perseids
 *
 * ── Dependency graph ───────────────────────────────────────────────────────
 *
 *   mt ──────────────┬──────────────────────────────┐
 *                    ↓                              ↓
 *   lxx         definitions → normalize        dss → variants
 *                    ↓
 *   vulgate     morph-vul → patch-vul
 *                    ↓             ↓
 *               lsj → glosses ────┘
 *
 * ── Prerequisites (manual one-time downloads — see each step) ─────────────
 *
 *   data/oshb/Gen.xml … Deut.xml         OSHB morphological XML
 *   data/lxx/versification.csv           LXX verse → word-index table
 *   data/lxx/words.csv                   LXX word-index → Greek form
 *   data/lxx/strongs.csv                 LXX word-index → Extended Strong's
 *   data/lxx/tbesg.txt                   Extended Strong's → English gloss
 *   data/vulgate/ls_A.json … ls_Z.json   Lewis & Short full Latin dictionary
 *   lib/{book}_dss_coverage.json         DSS verse-level coverage maps
 *
 * ── Generated outputs (safe to delete and rebuild) ────────────────────────
 *
 *   data/oshb/{book}.json                MT: pointed Hebrew + BDB/Strong's
 *   data/lxx/{book}.json                 LXX: Greek + TBESG/LSJ glosses
 *   data/vulgate/{book}.json             Vulgate: Latin + L&S glosses
 *   data/lxx/lsj-index.json             LSJ: normalized Unicode key → gloss
 *   data/dss/{book}.json                 DSS: coverage structure
 *   data/dss/variants/{book}.json        DSS: consonantal Hebrew + glosses
 *   data/lemma-cache.json               Perseids lemmatization cache
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * STEP DOCUMENTATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── STEP: mt ───────────────────────────────────────────────────────────────
 *
 * Script: build-oshb.mjs
 *
 * Purpose:
 *   Converts OSHB morphological XML into a verse-keyed JSON lookup used by
 *   the app. Applies scholarly Hebrew glosses: BDB primary, Strong's fallback,
 *   and a curated override table for particles, pronouns, and common verbs.
 *
 * Source — OSHB XML (Open Scriptures Hebrew Bible):
 *   Repository: https://github.com/openscriptures/morphhb/tree/master/wlc
 *   License:    CC BY 4.0
 *   Files:      Gen.xml, Exod.xml, Lev.xml, Num.xml, Deut.xml
 *   Save to:    data/oshb/{book}.xml
 *
 *   XML structure (abridged):
 *     <verse osisID="Gen.1.1">
 *       <w lemma="b/7225" morph="HR/Ncfsa">בְּרֵאשִׁית</w>
 *       <w lemma="1254 a" morph="HVqp3ms">בָּרָא</w>
 *       ...
 *     </verse>
 *
 *   lemma attribute formats:
 *     "7225"        → Strong's H7225 (simple)
 *     "1254 a"      → H1254 variant a (disambiguated)
 *     "b/7225"      → prefix 'b' (bet, "in") + root H7225
 *     "c/l"         → prefix 'c' (waw, "and") + prefix 'l' (lamed, "to")
 *     "b/884+"      → 'b' prefix + proper noun marker (+)
 *
 * Source — Brown-Driver-Briggs (BDB):
 *   File:       scripts/DictBDB.json
 *   Format:     { "entry_id": { "top": "H7225", "def": "<b>beginning</b>…" } }
 *   Indexed by: top field (Strong's number)
 *   Extraction: First <b>bold</b> token not in a skip-list of grammatical labels.
 *               The skip-list covers ~60 BDB structural labels (verb qal, noun
 *               masculine, substantive, pronoun personal, etc.) that BDB puts in
 *               bold but that are POS tags, not glosses.
 *
 * Source — Strong's Hebrew Dictionary (1894):
 *   File:       scripts/strongs-hebrew-dictionary.js  (JS variable, require'd)
 *   Format:     { "H7225": { strongs_def: "…", kjv_def: "…", xlit: "rê'shîyth" } }
 *   Used as:    Fallback when BDB has no extractable gloss.
 *               strongs_def → kjv_def → [no gloss]
 *
 * Manual overrides (BDB_OVERRIDE in build-oshb.mjs):
 *   ~80 entries covering deity names (H430 → "God"), pronouns (H589 → "I"),
 *   object marker (H853 → "[obj]"), common verbs (H1254 → "create"), and
 *   cases where BDB's sense-I conflicts with Torah-relevant sense-II.
 *
 * Output: data/oshb/{book}.json
 *   {
 *     "1:1": [
 *       { "orig": "בְּרֵאשִׁית", "lemma": "H7225", "eng": "beginning" },
 *       { "orig": "בָּרָא",     "lemma": "H1254", "eng": "create"    },
 *       ...
 *     ],
 *     "1:2": [ ... ]
 *   }
 *   orig  = pointed Hebrew with nikud + cantillation (display form)
 *   lemma = canonical Strong's number (H-prefixed) or null for particles
 *   eng   = English gloss (BDB → Strong's → override → "[no gloss]")
 *
 * Known gaps:
 *   Hapax legomena and rare proper nouns may still have "[no gloss]".
 *   MT Hebrew gloss coverage is typically >98% after the BDB + Strong's pipeline.
 *   Remaining gaps do NOT need fill-scholarly-glosses.mjs — those scripts
 *   target LXX and Vulgate only. MT uses BDB/Strong's exclusively.
 *
 * ── STEP: lxx ─────────────────────────────────────────────────────────────
 *
 * Script: build-lxx.mjs
 *
 * Purpose:
 *   Builds verse-keyed LXX Greek word lists with Extended Strong's numbers
 *   and TBESG one-word English glosses. LXX-specific vocabulary not covered
 *   by TBESG (which targets the NT) is marked [no gloss] and filled later
 *   by the `lsj` + `glosses` steps.
 *
 * Source A — Rahlfs LXX word list (eliranwong):
 *   Repository: https://github.com/eliranwong/LXX-Rahlfs-1935
 *   License:    Public domain (Rahlfs text 1935) / CC for alignment data
 *   Files:
 *     data/lxx/versification.csv  — verse ref → start word index (1-based)
 *       Format: "Gen.1.1\t1"  (tab-separated: ref, 1-based word index)
 *     data/lxx/words.csv          — word index → Greek form
 *       Format: "1\t1\tἐν"   (tab-separated: idx, idx, accented-Unicode)
 *     data/lxx/strongs.csv        — word index → Extended Strong's
 *       Format: "1\tG1722"   (tab-separated: idx, strongs)
 *   Note: verse range end = next verse's start − 1.
 *         Only Torah-range indices are loaded to minimize memory use.
 *
 * Source B — TBESG (STEPBible Translators' Greek Lexicon):
 *   Repository: https://github.com/STEPBible/STEPBible-Data
 *   File:       data/lxx/tbesg.txt  (download TBESG.txt, rename)
 *   License:    CC BY 4.0
 *   Format:     Tab-separated, one Strong's entry per line:
 *     Col 0: Extended Strong's with suffix (G0001G)
 *     Col 4: Transliteration (theos)
 *     Col 6: One-word gloss (God)
 *     Col 7: Full definition HTML
 *   Strong's normalization: eliranwong uses short form (G746), TBESG uses
 *   4-digit zero-padded (G0746). The build script pads to 4 digits to match.
 *
 * Output: data/lxx/{book}.json
 *   {
 *     "1:1": [
 *       { "orig": "ἐν",    "strongs": "G1722", "eng": "in"       },
 *       { "orig": "ἀρχῇ",  "strongs": "G0746", "eng": "beginning"},
 *       ...
 *     ]
 *   }
 *   orig    = accented Unicode Greek word form (Rahlfs 1935 text)
 *   strongs = Extended Strong's number (4-digit zero-padded, G-prefixed)
 *   eng     = one-word TBESG gloss, or "[no gloss]" if not in TBESG
 *
 * Coverage gap:
 *   TBESG was built for the NT. LXX-specific words — Old Greek vocabulary
 *   not occurring in the NT — have no TBESG entry and appear as [no gloss].
 *   These are filled in the `glosses` step using LSJ via Perseids lemmatization.
 *   Typical gap: ~5–8% of LXX Torah words.
 *
 * ── STEP: vulgate ─────────────────────────────────────────────────────────
 *
 * Script: build-vulgate.mjs
 *
 * Purpose:
 *   Builds verse-keyed Vulgate Latin word lists with lemmas and L&S glosses.
 *   Uses a three-source pipeline: interlinear HTML scrape for Gen–Num, REST API
 *   for gaps, and Morpheus + L&S for lemmatization and glossing throughout.
 *
 * Source A — vulgate.net (interlinear, Gen/Exod/Lev/Num):
 *   URL pattern: https://vulgate.net/{code}{chapter}-{verse}
 *   Codes: gn=Genesis, ex=Exodus, lv=Leviticus, nm=Numbers
 *   HTML structure: <td><b>Latin word</b></td><td>English gloss</td>
 *   Rate limit: 200ms delay per verse. ~3.5 hours total for Gen–Num.
 *   ⚠ One-time scrape: outputs are cached to data/vulgate/{book}.json.
 *      Re-running on an existing file skips the scrape.
 *
 * Source B — GetBible REST API (gap fill, including Deuteronomy):
 *   URL: https://query.getbible.net/v2/vulgate/{Book} {ch}:{v}
 *   Returns plain Latin text (no interlinear). Words are tokenized, then
 *   lemmatized via Perseids and looked up in L&S.
 *   Used for: Deuteronomy (vulgate.net coverage incomplete) and any verses
 *   that 404'd or timed out during the vulgate.net scrape.
 *
 * Source C — Lewis & Short Latin Dictionary:
 *   Files:   data/vulgate/ls_A.json … ls_Z.json  (one file per first letter)
 *   Source:  latin-dict project (https://github.com/latin-dict)
 *   License: CC BY-SA (derivative of the public-domain 1879 print edition)
 *   Format:  JSON array of entries, each with:
 *     { "key": "dico", "senses": ["say, speak", ["Sense II:…"]], "main_notes": "…" }
 *   Disambiguation: some lemmas have key+"1" / key+"2" variants (L&S usage).
 *   Size: 51,595 entries across 26 files.
 *
 * Source D — Perseids/Alpheios Morpheus (lemmatization):
 *   URL: https://services.perseids.org/bsp/morphologyservice/analysis/word
 *        ?lang=lat&engine=morpheuslat&word={form}&xml=true
 *   Returns HTTP 201 with JSON (non-standard status code — body is valid JSON).
 *   Lemma path: response.RDF.Annotation.Body.rest.entry.dict.hdwd.$
 *   Rate limit: 200–250ms delay per call. Shared with LXX pipeline.
 *   Cache: data/lemma-cache.json (keyed "lat:{form}") — skip on re-run.
 *
 * Form→gloss optimization (Gen–Num → Deut):
 *   Before processing Deuteronomy, a map of already-seen lowercase Latin
 *   form → {lemma, gloss} is built from Gen–Num data. This avoids ~60% of
 *   Perseids API calls for Deut (most Deut words were already seen in the
 *   earlier books).
 *
 * Output: data/vulgate/{book}.json
 *   {
 *     "1:1": [
 *       { "orig": "In",        "lemma": "in",        "eng": "in"          },
 *       { "orig": "principio", "lemma": "principium", "eng": "beginning"  },
 *       { "orig": "creavit",   "lemma": "creo",      "eng": "create"     },
 *       ...
 *     ]
 *   }
 *   orig  = Latin inflected form as it appears in the text
 *   lemma = L&S headword (null if Perseids/Morpheus failed to lemmatize)
 *   eng   = L&S gloss, or interlinear gloss from vulgate.net, or "[no gloss]"
 *
 * Known gaps:
 *   ~10% of Vulgate words have no lemma (Morpheus failure on rare forms).
 *   ~10% have no gloss after build (L&S miss or no lemma to look up).
 *   Filled in sequence by: morph-vul → patch-vul → glosses.
 *
 * ── STEP: lsj ─────────────────────────────────────────────────────────────
 *
 * Script: build-lsj-index.mjs
 *
 * Purpose:
 *   Downloads the Perseus LSJ XML, converts Beta Code headword keys to
 *   Unicode Greek, extracts the first English translation from each entry,
 *   and saves a compact index for fast normalized lookup.
 *   This index is the scholarly dictionary for all LXX [no gloss] entries.
 *
 * Source — PerseusDL/lexica (GitHub raw):
 *   URL:     https://raw.githubusercontent.com/PerseusDL/lexica/master/
 *            CTS_XML_TEI/perseus/pdllex/grc/lsj/grc.lsj.perseus-eng1.xml
 *   Size:    ~43 MB XML (downloaded automatically during script run)
 *   License: Public domain (Liddell-Scott-Jones 9th ed., 1940)
 *   Format:  TEI XML with <entryFree key="a)rch/" ...> elements
 *            where key is in Perseus Beta Code encoding.
 *
 * Beta Code → Unicode conversion (betaToUnicode in build-lsj-index.mjs):
 *   Base alphabet: a→α, b→β, g→γ, d→δ, e→ε, z→ζ, h→η, q→θ, i→ι,
 *                  k→κ, l→λ, m→μ, n→ν, c→ξ, o→ο, p→π, r→ρ, s→σ,
 *                  t→τ, u→υ, f→φ, x→χ, y→ψ, w→ω
 *   Diacritics (combining, applied after base character):
 *     )  → U+0313 combining comma above (smooth breathing)
 *     (  → U+0314 combining reversed comma above (rough breathing)
 *     /  → U+0301 combining acute accent
 *     \  → U+0300 combining grave accent
 *     =  → U+0342 combining Greek perispomeni (circumflex)
 *     +  → U+0308 combining diaeresis
 *     |  → U+0345 combining Greek ypogegrammeni (iota subscript)
 *   After combining: .normalize('NFC') collapses to precomposed Unicode.
 *   Example: "a)rch/" → ἀρχή (alpha + smooth + acute = ἀ, rho, chi, eta + acute = ή)
 *
 * Gloss extraction:
 *   Each <entryFree> contains <tr> (translation) elements with English text.
 *   The first non-trivial <tr> (length ≥ 2, ASCII-only, ≤ 80 chars) is used.
 *   Only the first comma/semicolon segment is kept; parentheticals stripped.
 *
 * Normalized index key:
 *   Both index keys and lookup words use the same normalization:
 *     s.normalize('NFD')              → decompose precomposed characters
 *     .replace(/[̀-ͯ]/g, '') → strip all combining diacritics
 *     .toLowerCase().trim()
 *   This allows inflected forms (e.g. ἐν vs ἐν with breathing marks) to
 *   match headwords regardless of accent spelling variants.
 *
 * Output: data/lxx/lsj-index.json
 *   { "αρχη": "beginning", "λογος": "word, reason", "θεος": "God", … }
 *   Keys: normalized Unicode (no diacritics, lowercase)
 *   Values: first English gloss from LSJ <tr> element
 *   Size: ~566 KB, ~15,048 entries (out of 18,950 parsed — ~4k had no <tr>)
 *
 * ── STEP: dss ─────────────────────────────────────────────────────────────
 *
 * Script: build-dss.mjs
 *
 * Purpose:
 *   Builds the DSS display structure by merging MT word-count data with
 *   Dead Sea Scrolls coverage maps. Establishes word-slot alignment between
 *   MT and DSS, and assigns one of three display states to each word slot.
 *
 * Source A — OSHB MT data:
 *   Files: data/oshb/{book}.json  (must be built first — step 'mt')
 *   Used to: set the number of word slots per verse (DSS aligns to MT structure)
 *
 * Source B — DSS coverage maps:
 *   Files: lib/{genesis,exodus,leviticus,numbers,deuteronomy}_dss_coverage.json
 *   Format:
 *     {
 *       "Genesis 1:1": { "manuscripts": ["1QGen", "4QGen-b"], "partial": false },
 *       "Genesis 2:4": { "manuscripts": [],                   "partial": false },
 *       ...
 *     }
 *   Coverage = which Dead Sea Scrolls scrolls/fragments attest each verse.
 *   Compiled from: Abegg, Flint & Ulrich, The Dead Sea Scrolls Bible (1999)
 *   and the Discoveries in the Judean Desert (DJD) series.
 *   Manual maintenance required when new fragment identifications are published.
 *
 * Word slot states:
 *   "lost"      — no DSS manuscript preserves this verse.
 *                 Display: red dot. orig: "—", eng: "—"
 *   "attested"  — a scroll preserves this verse but word-level text is not
 *                 yet in the variants file. Display: scroll siglum only.
 *                 orig: "", eng: "" (filled by variants step)
 *   "extant"    — word-level reading is confirmed from transcription data.
 *                 Display: Hebrew word + English gloss.
 *
 * Paleo-Hebrew manuscripts (prioritized as primary siglum):
 *   4Q22 (4QPaleoExod-m), 4Q45 (4QPaleoDtrj), 4Q46 (4QPaleoDtrk), 11Q1 (11QPaleoLev)
 *   When one of these attests a verse, it is surfaced as the primary siglum
 *   regardless of alphabetical order — script identification is a primary datum.
 *
 * Output: data/dss/{book}.json
 *   {
 *     "1:1": [
 *       { "orig": "", "eng": "", "manuscripts": ["1QGen"], "frag": "1QGen",
 *         "status": "attested", "paleo": false },
 *       ...
 *     ],
 *     "3:24": [
 *       { "orig": "—", "eng": "—", "manuscripts": [], "status": "lost" },
 *       ...
 *     ]
 *   }
 *
 * ── STEP: variants ────────────────────────────────────────────────────────
 *
 * Script: generate-dss-variants.js
 *
 * Purpose:
 *   Populates data/dss/variants/{book}.json for all "attested" word slots
 *   by stripping nikud and morphological markers from the MT pointed text.
 *   The result is consonantal Hebrew — the script form used in DSS scrolls.
 *   Manually-audited entries already present in the variants file are preserved.
 *
 * Hebrew text transformation (stripNikud):
 *   Removes vowel points and cantillation marks:
 *     U+0591–U+05C7  — full range: cantillation (טְעָמִים), sheva, vowels, dagesh
 *     Specifically: שְׁוָא, פַּתַּח, קָמַץ, חִירִיק, צֵרֵי, סְגוֹל, חוֹלָם, קוּבּוּץ, שׁוּרֵק
 *   Removes OSHB-specific morphological separators:
 *     '/'  — OSHB morpheme boundary (e.g. "בְּ/רֵאשִׁית" → "בראשית")
 *   Removes maqaf (U+05BE, ־):
 *     Masoretic word-joiner; not present in DSS scribal tradition
 *   Result: pure consonantal Hebrew matching DSS scribal convention
 *
 * Merge policy:
 *   Existing entries in data/dss/variants/{book}.json are NEVER overwritten.
 *   Only missing word slots (index not present in the variants object) are filled.
 *   This protects manually-audited DSS variants (e.g. Deut 32:8 reads "בני אלהים"
 *   where MT reads "בני ישראל") from being silently reverted to MT.
 *
 * Output: data/dss/variants/{book}.json
 *   {
 *     "1:1": {
 *       "0": { "orig": "בראשית", "eng": "beginning" },
 *       "1": { "orig": "ברא",    "eng": "create"    },
 *       ...
 *     },
 *     ...
 *   }
 *   Keys: chapter:verse → word index (0-based string) → {orig, eng}
 *   orig = consonantal Hebrew (nikud-stripped MT)
 *   eng  = inherited from MT BDB/Strong's gloss
 *
 * ⚠ AUDIT REQUIRED — CRITICAL SCHOLARLY NOTE:
 *   These variants files contain MT-derived consonantal text, NOT transcribed
 *   DSS readings. They are a starting template that must be audited against:
 *
 *   Primary source (required):
 *     Abegg, Flint & Ulrich. The Dead Sea Scrolls Bible. HarperOne, 1999.
 *     ISBN 978-0-06-060940-7
 *     The only complete English translation of all biblical DSS fragments.
 *
 *   Secondary sources:
 *     DJD series (Discoveries in the Judean Desert), vols. 1–40. OUP, 1955–2010.
 *     DSSL (Dead Sea Scrolls Lexicon, Abegg 2003+) — digital lemmatization
 *     Leon Levy DSS Digital Library: https://www.deadseascrolls.org.il
 *       High-resolution images of all fragments; sortable by scroll/fragment
 *
 *   What to correct:
 *     Orthographic variants  — DSS often use different plene/defective spelling
 *                              (e.g. כתיב/קרי differences appear in MT not DSS)
 *     Plus readings          — word present in DSS but absent in MT
 *     Minus readings         — word absent in DSS but present in MT
 *                              (mark with orig: null, eng: "[omitted]")
 *     Substitutions          — different word entirely (e.g. Deut 32:8 ישׂראל→אלהים)
 *     Lacunae                — physically damaged/lost text within an attested verse
 *                              (mark individual words with status: "lacuna")
 *
 *   Preserved manual entries (do not overwrite):
 *     Deut 32:8  — "בני אלהים" (DSS 4QDeut-j) vs MT "בני ישׂראל"
 *     Deut 32:43 — DSS longer ending (6 lines vs MT 4) from 4QDeut-q + LXX
 *
 * ── STEP: definitions ─────────────────────────────────────────────────────
 *
 * Script: add-definitions.mjs
 *
 * Purpose:
 *   Enriches MT (OSHB) and LXX JSON files with two additional fields:
 *   xlit (transliteration) and def (full scholarly definition).
 *   These power the tooltip/hover cards in the app's word inspector.
 *
 * For MT (OSHB):
 *   Source: scripts/strongs-hebrew-dictionary.js
 *   xlit = entry.xlit (Strong's transliteration, e.g. "rê'shîyth")
 *   def  = entry.strongs_def ?? entry.kjv_def (full definition string)
 *   Applied to all words with a known lemma (Strong's number).
 *
 * For LXX:
 *   Source: data/lxx/tbesg.txt (col 4 = xlit, col 7 = full def HTML)
 *   xlit = TBESG transliteration column (e.g. "theos")
 *   def  = TBESG full definition, with <ref=> tags and HTML stripped
 *   Applied to all words with a known strongs number.
 *
 * Output: in-place patch to existing JSON files (adds xlit + def fields)
 *   { "orig": "בְּרֵאשִׁית", "lemma": "H7225", "eng": "beginning",
 *     "xlit": "rê'shîyth", "def": "the first, in place, time, order or rank…" }
 *
 * ── STEP: normalize ───────────────────────────────────────────────────────
 *
 * Script: normalize-glosses.mjs
 *
 * Purpose:
 *   Post-processes all eng gloss fields across MT, LXX, and Vulgate to
 *   produce short display-ready labels (≤3 words). Applies lemma overrides
 *   and particle shortcuts, then strips BDB/Strong's verbose preambles.
 *   Must run AFTER build, definition-enrichment, and gloss-filling steps.
 *
 * Normalization rules (applied in sequence):
 *   1. Hard particle map: Hebrew particles (וְ→"and", כִּי→"for"), Greek
 *      articles (ὁ/ἡ/τό→"the"), Latin conjunctions (et→"and") matched
 *      by orig value before any other rule.
 *   2. Lemma override map: ~16 key lemmas with manually-set glosses
 *      (H430→"God", G3588→"the", H8064→"the heavens", etc.)
 *   3. Strip "properly…", "literally…", "viz.…", "i.e.…" preambles
 *   4. Truncate at first colon (BDB sense colon)
 *   5. Truncate at first slash (alternative reading divider)
 *   6. Strip parenthetical notes like "(post-class.)", "(prop.)"
 *   7. Take first semicolon segment
 *   8. Take first comma-then-lowercase segment
 *   9. Take first "or" alternative
 *   10. Cap to 3 words
 *
 * Particle map coverage:
 *   Hebrew: את ו עַל כִּי (and bare nikud-stripped forms)
 *   Greek:  ὁ ἡ τό (and all inflected article forms), καί, δέ, ἐν, ἐπί
 *   Latin:  et autem in super de ad
 *
 * ── STEP: morph-vul ───────────────────────────────────────────────────────
 *
 * Script: morpheus-vulgate.mjs
 *
 * Purpose:
 *   Back-fills missing lemmas in Vulgate Gen/Exod/Lev data — words that
 *   vulgate.net did not provide a lemma for during the initial scrape.
 *   Without a lemma, L&S lookup is impossible.
 *   Applies only to Gen, Exod, Lev (Num and Deut were built using GetBible
 *   + Morpheus from the start, so they already have lemmas).
 *
 * API: Perseids/Alpheios Morpheus Latin
 *   URL: http://morph.perseids.org/analysis/word?lang=lat&word={form}
 *   Note: Uses http:// not https:// — older endpoint, may migrate
 *   Rate limit: 50ms delay (lighter than fill-scholarly-glosses.mjs's 220ms)
 *   Lemma path: response.RDF.Annotation.Body.rest.entry.dict.hdwd.$
 *
 * Scope: unique Latin forms without lemma in Gen + Exod + Lev only.
 *        Num and Deut are not processed (already have lemmas from GetBible pipeline).
 *
 * Output: in-place addition of lemma field to words that had lemma: null
 *
 * ── STEP: patch-vul ───────────────────────────────────────────────────────
 *
 * Script: patch-vulgate-glosses.mjs
 *
 * Purpose:
 *   First-pass [no gloss] repair for Vulgate using only local data (no API).
 *   Strategy A: word has a lemma → try L&S lookup with the improved sense
 *               extractor (BAD_LS filters, depth-first sense traversal).
 *   Strategy B: no lemma → if starts with capital letter, treat as proper
 *               noun and use the word itself as the gloss; if ends in
 *               -que/-ve/-ne, strip the enclitic and retry as Strategy A.
 *
 * L&S sense extractor (improved over build-vulgate.mjs version):
 *   - Depth-first traversal of nested senses array
 *   - Skips: case labels (Gen./Dat./Acc.), corpus inscriptionum references,
 *     Cicero/Horace-style citations, cross-references (v./cf./=), all-caps abbrevs
 *   - Takes first comma/semicolon segment; strips parentheticals
 *   - Strips article "To"/"A"/"An"/"The" prefix
 *   - Falls back to main_notes "= synonym" pattern
 *
 * Output: in-place patch to data/vulgate/{book}.json (eng field only)
 *
 * ── STEP: glosses ─────────────────────────────────────────────────────────
 *
 * Script: fill-scholarly-glosses.mjs
 *
 * Purpose:
 *   Final scholarly gloss pass across LXX (LSJ) and Vulgate (L&S + Perseids).
 *   Only touches words where eng is "[no gloss]" or missing. Safe to re-run.
 *
 * LXX pipeline (per unique [no gloss] word in lxx/{book}.json):
 *   1. Direct LSJ lookup: normalizeGreek(word) → lsj-index.json key
 *      normalizeGreek = NFD decompose → strip U+0300–U+036F → lowercase
 *   2. If miss: call Perseids (lang=grc, engine=morpheusgrc) to get lemma
 *   3. normalizeGreek(lemma) → LSJ lookup
 *   4. Write gloss back if found; write null to lemma-cache if not
 *
 * Vulgate pipeline (per unique [no gloss] word in vulgate/{book}.json):
 *   1. Direct L&S lookup: word.toLowerCase() → ls_*.json index
 *      Also tries key+"1" and key+"2" for L&S disambiguation variants
 *   2. If miss: call Perseids (lang=lat, engine=morpheuslat) to get lemma
 *   3. lemma.toLowerCase() → L&S lookup (with +"1"/"2" fallbacks)
 *   4. Write gloss back if found; write null to lemma-cache if not
 *
 * Lemma cache (data/lemma-cache.json):
 *   Key format: "grc:{word}" or "lat:{word}"
 *   Value: lemma string, or null if Perseids returned nothing
 *   Cached null means "Perseids was called and failed" — won't be retried.
 *   Delete specific cache entries to force a re-try for a particular word.
 *   Delete the whole file to clear all cached lemmas.
 *
 * Perseids API details:
 *   URL:  https://services.perseids.org/bsp/morphologyservice/analysis/word
 *         ?lang={grc|lat}&engine={morpheusgrc|morpheuslat}&word={form}&xml=true
 *   Auth: None. User-Agent header required (set to project identifier).
 *   Returns: HTTP 201 (not 200) with valid JSON body.
 *   Response: { RDF: { Annotation: { Body: { rest: {
 *                entry: { dict: { hdwd: { $: "lemma" } } }
 *              } } } } }
 *   The 'entry' field may be an array — iterate until hdwd.$ is found.
 *   Rate limit: 220ms delay enforced between calls. Do not reduce — Perseids
 *               is a shared academic service; abuse risks IP bans.
 *
 * BAD_LS filters (L&S gloss rejection):
 *   Rejected if matches:
 *     /^(Gen|Dat|Acc|Nom|Voc|Abl|Loc)\b/  — Latin case labels
 *     /C\.\s*I\.\s*L\./                   — Corpus Inscriptionum Latinarum
 *     /\bInscr\b/                          — Inscription citation
 *     /^[A-Z][a-z]{1,5}\.\s+[A-Z]/        — Author abbreviation (Cic., Hor.)
 *     /^(v\.|cf\.|i\.e\.|i\.q\.|syn\.|see |vid\.|= )/ — cross-references
 *     /^[A-Z]{2,}\./                       — all-caps abbreviation
 *     /inflection of/i, /form of/i         — morphological descriptions
 *   Must contain at least 3 lowercase letters (not purely Greek/Latin headwords).
 *
 * Unresolvable words (remain [no gloss] after all steps):
 *   Proper nouns (personal names, place names) — not in LSJ/L&S as headwords
 *   Hapax legomena — occurring once in the entire corpus, often not in LSJ/L&S
 *   Damaged/lacunose DSS readings — no recoverable text
 *   These are expected. Approximately 5–15% of unique forms will remain [no gloss].
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DEPRECATED SCRIPTS (do not use)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   fill-missing-glosses.js   — Used Wiktionary REST API as gloss source.
 *                               Wiktionary is not scholarly; abandoned after
 *                               4,000/7,494 words (53%) with poor quality.
 *                               Replaced by fill-scholarly-glosses.mjs.
 *
 *   build-genesis-dss.mjs     — Early prototype for Genesis DSS only.
 *                               Superseded by build-dss.mjs (all books).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DEPLOYMENT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   After any data rebuild:
 *     npx vercel --prod
 *
 *   The Next.js app reads all data files at request time from data/.
 *   There is no separate database — data files ARE the database.
 *   Vercel's CDN caches the SSE streaming API route per unique URL.
 *   Upstash Redis is used for server-side caching of assembled verse rows.
 *   After a data rebuild, flush the Redis cache:
 *     (set UPSTASH_REDIS_REST_URL + TOKEN in environment, then)
 *     curl -X POST "$UPSTASH_REDIS_REST_URL/flushdb" \
 *          -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BOOKS = ['Gen', 'Exod', 'Lev', 'Num', 'Deut'];

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const stepArg = args.includes('--step') ? args[args.indexOf('--step') + 1] : null;
const fromArg = args.includes('--from') ? args[args.indexOf('--from') + 1] : null;
const force   = args.includes('--force');
const dryRun  = args.includes('--dry-run');
const status  = args.includes('--status');

// ── Helpers ───────────────────────────────────────────────────────────────────

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function fileSize(relPath) {
  try { return fs.statSync(path.join(ROOT, relPath)).size; } catch { return 0; }
}

function countNoGloss(relPath) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
    return Object.values(data).flat().filter(w => w?.eng === '[no gloss]').length;
  } catch { return '?'; }
}

function run(script, label) {
  const ext  = script.endsWith('.mjs') ? 'mjs' : 'js';
  const node = 'node';
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`▶  ${label}`);
  console.log(`   node scripts/${script}`);
  console.log('─'.repeat(70));
  if (dryRun) { console.log('   [dry-run — skipped]'); return; }
  execSync(`${node} scripts/${script}`, { cwd: ROOT, stdio: 'inherit' });
}

function check(label, prereqs) {
  const missing = prereqs.filter(f => !exists(f));
  if (missing.length === 0) return;
  console.error(`\n✗  Missing prerequisites for step '${label}':`);
  for (const f of missing) console.error(`     ${f}`);
  process.exit(1);
}

// ── Status report ─────────────────────────────────────────────────────────────

if (status) {
  const col = (s, w) => s.slice(0, w).padEnd(w);

  console.log('\nProto-Vorlage build status');
  console.log('═'.repeat(70));

  const groups = [
    {
      label: 'Prerequisites (manual downloads)',
      files: [
        ['data/oshb/Gen.xml',               'OSHB morphological XML — Genesis'],
        ['data/oshb/Exod.xml',              'OSHB — Exodus'],
        ['data/oshb/Lev.xml',               'OSHB — Leviticus'],
        ['data/oshb/Num.xml',               'OSHB — Numbers'],
        ['data/oshb/Deut.xml',              'OSHB — Deuteronomy'],
        ['data/lxx/versification.csv',      'LXX verse→word-index table'],
        ['data/lxx/words.csv',              'LXX word-index→Greek form'],
        ['data/lxx/strongs.csv',            'LXX word-index→Extended Strong\'s'],
        ['data/lxx/tbesg.txt',              'TBESG Extended Strong\'s glosses'],
        ['data/vulgate/ls_A.json',          'Lewis & Short (first file — proxy for all 26)'],
        ['lib/genesis_dss_coverage.json',   'DSS coverage map — Genesis'],
      ],
    },
    {
      label: 'MT outputs',
      files: BOOKS.map(b => [`data/oshb/${b}.json`, `MT Hebrew — ${b}`]),
    },
    {
      label: 'LXX outputs',
      files: BOOKS.map(b => [`data/lxx/${b}.json`, `LXX Greek — ${b}`]),
    },
    {
      label: 'Vulgate outputs',
      files: BOOKS.map(b => [`data/vulgate/${b}.json`, `Vulgate Latin — ${b}`]),
    },
    {
      label: 'LSJ index + Lemma cache',
      files: [
        ['data/lxx/lsj-index.json', 'LSJ normalized Unicode key→gloss (~15k entries)'],
        ['data/lemma-cache.json',   'Perseids lemmatization cache'],
      ],
    },
    {
      label: 'DSS structure',
      files: BOOKS.map(b => [`data/dss/${b}.json`, `DSS coverage structure — ${b}`]),
    },
    {
      label: 'DSS variants',
      files: BOOKS.map(b => [`data/dss/variants/${b}.json`, `DSS consonantal Hebrew — ${b}`]),
    },
  ];

  for (const { label, files } of groups) {
    console.log(`\n${label}:`);
    for (const [f, desc] of files) {
      const ok   = exists(f);
      const kb   = ok ? `${(fileSize(f) / 1024).toFixed(0)} KB` : '';
      const mark = ok ? '✓' : '✗';
      console.log(`  ${mark}  ${col(f, 38)}  ${col(kb, 8)}  ${desc}`);
    }
  }

  console.log('\n[no gloss] counts (current data):');
  console.log('─'.repeat(50));
  for (const [trad, dir] of [['MT (OSHB)', 'oshb'], ['LXX', 'lxx'], ['Vulgate', 'vulgate']]) {
    let total = 0, words = 0;
    for (const b of BOOKS) {
      const p = `data/${dir}/${b}.json`;
      if (!exists(p)) continue;
      const data = JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
      const flat = Object.values(data).flat();
      words += flat.length;
      total += flat.filter(w => w?.eng === '[no gloss]').length;
    }
    const pct = words > 0 ? ((total / words) * 100).toFixed(1) : '?';
    console.log(`  ${trad.padEnd(14)} ${String(total).padStart(5)} [no gloss]  ` +
                `${String(words).padStart(6)} total words  ${pct}% gap`);
  }

  process.exit(0);
}

// ── Step definitions ──────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 'mt',
    label: 'Build MT — OSHB XML + BDB/Strong\'s → data/oshb/*.json',
    prereqs: BOOKS.map(b => `data/oshb/${b}.xml`),
    outputs: BOOKS.map(b => `data/oshb/${b}.json`),
    script: 'build-oshb.mjs',
  },
  {
    id: 'lxx',
    label: 'Build LXX — Rahlfs CSV + TBESG → data/lxx/*.json',
    prereqs: ['data/lxx/versification.csv', 'data/lxx/words.csv',
              'data/lxx/strongs.csv', 'data/lxx/tbesg.txt'],
    outputs: BOOKS.map(b => `data/lxx/${b}.json`),
    script: 'build-lxx.mjs',
  },
  {
    id: 'vulgate',
    label: 'Build Vulgate — vulgate.net scrape + GetBible + L&S → data/vulgate/*.json',
    prereqs: ['data/vulgate/ls_A.json'],
    outputs: BOOKS.map(b => `data/vulgate/${b}.json`),
    script: 'build-vulgate.mjs',
  },
  {
    id: 'lsj',
    label: 'Build LSJ index — Perseus XML download → data/lxx/lsj-index.json',
    prereqs: [],
    outputs: ['data/lxx/lsj-index.json'],
    script: 'build-lsj-index.mjs',
  },
  {
    id: 'dss',
    label: 'Build DSS structure — OSHB + coverage maps → data/dss/*.json',
    prereqs: [...BOOKS.map(b => `data/oshb/${b}.json`), 'lib/genesis_dss_coverage.json'],
    outputs: BOOKS.map(b => `data/dss/${b}.json`),
    script: 'build-dss.mjs',
  },
  {
    id: 'variants',
    label: 'Generate DSS variants — consonantal MT → data/dss/variants/*.json',
    prereqs: [...BOOKS.map(b => `data/oshb/${b}.json`), ...BOOKS.map(b => `data/dss/${b}.json`)],
    outputs: BOOKS.map(b => `data/dss/variants/${b}.json`),
    script: 'generate-dss-variants.js',
  },
  {
    id: 'definitions',
    label: 'Add definitions — xlit + full def fields → OSHB and LXX JSON',
    prereqs: [...BOOKS.map(b => `data/oshb/${b}.json`), ...BOOKS.map(b => `data/lxx/${b}.json`),
              'data/lxx/tbesg.txt'],
    outputs: [],
    script: 'add-definitions.mjs',
  },
  {
    id: 'normalize',
    label: 'Normalize glosses — ≤3-word display form across MT + LXX + Vulgate',
    prereqs: [...BOOKS.map(b => `data/oshb/${b}.json`), ...BOOKS.map(b => `data/lxx/${b}.json`),
              ...BOOKS.map(b => `data/vulgate/${b}.json`)],
    outputs: [],
    script: 'normalize-glosses.mjs',
  },
  {
    id: 'morph-vul',
    label: 'Back-fill Vulgate lemmas — Perseids Morpheus (Gen/Exod/Lev)',
    prereqs: ['data/vulgate/Gen.json', 'data/vulgate/Exod.json', 'data/vulgate/Lev.json'],
    outputs: [],
    script: 'morpheus-vulgate.mjs',
  },
  {
    id: 'patch-vul',
    label: 'Patch Vulgate [no gloss] — L&S lookup + proper noun + enclitic strip',
    prereqs: [...BOOKS.map(b => `data/vulgate/${b}.json`), 'data/vulgate/ls_A.json'],
    outputs: [],
    script: 'patch-vulgate-glosses.mjs',
  },
  {
    id: 'glosses',
    label: 'Fill scholarly glosses — LXX via LSJ, Vulgate via L&S + Perseids',
    prereqs: [...BOOKS.map(b => `data/lxx/${b}.json`), ...BOOKS.map(b => `data/vulgate/${b}.json`),
              'data/lxx/lsj-index.json', 'data/vulgate/ls_A.json'],
    outputs: [],
    script: 'fill-scholarly-glosses.mjs',
  },
];

const ORDER = ['mt', 'lxx', 'vulgate', 'lsj', 'dss', 'variants',
               'definitions', 'normalize', 'morph-vul', 'patch-vul', 'glosses'];

// ── Main ──────────────────────────────────────────────────────────────────────

let targets;
if (stepArg) {
  targets = STEPS.filter(s => s.id === stepArg);
  if (targets.length === 0) {
    console.error(`Unknown step: ${stepArg}\nValid: ${ORDER.join(', ')}`);
    process.exit(1);
  }
} else if (fromArg) {
  const idx = ORDER.indexOf(fromArg);
  if (idx === -1) {
    console.error(`Unknown step: ${fromArg}\nValid: ${ORDER.join(', ')}`);
    process.exit(1);
  }
  targets = ORDER.slice(idx).map(id => STEPS.find(s => s.id === id));
} else {
  targets = ORDER.map(id => STEPS.find(s => s.id === id));
}

console.log('\nProto-Vorlage build workflow');
console.log(`Steps:  ${targets.map(s => s.id).join(' → ')}`);
if (force)  console.log('Mode:   --force (re-run even if outputs exist)');
if (dryRun) console.log('Mode:   --dry-run (plan only)');
console.log();

for (const step of targets) {
  check(step.id, step.prereqs);

  // Steps with no tracked outputs always run (they patch in-place)
  const skip = !force
    && step.outputs.length > 0
    && step.outputs.every(o => exists(o));

  if (skip) {
    console.log(`✓  ${step.label}`);
    const noGlossFiles = step.outputs.filter(o => /\/(lxx|vulgate|oshb)\//.test(o));
    for (const o of step.outputs) {
      const kb = (fileSize(o) / 1024).toFixed(0);
      const ng = noGlossFiles.includes(o) ? `  ${countNoGloss(o)} [no gloss]` : '';
      console.log(`     ${o}  (${kb} KB${ng})`);
    }
    console.log('   Skipping — all outputs exist (use --force to rebuild)');
    continue;
  }

  run(step.script, step.label);
}

console.log(`\n${'═'.repeat(70)}`);
console.log('Workflow complete.');
if (!dryRun) {
  console.log('\nNext steps:');
  console.log('  1. Audit data/dss/variants/*.json against Abegg, Flint & Ulrich (1999)');
  console.log('  2. Flush Redis cache if Upstash is configured');
  console.log('  3. Deploy: npx vercel --prod');
}
