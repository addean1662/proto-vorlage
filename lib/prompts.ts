
export interface MTWordEntry {
  orig: string;
  lemma: string | null;
  eng: string;
}

export interface LXXWordEntry {
  orig: string;
  strongs: string | null;
  eng: string;
}

export interface VulWordEntry {
  orig: string;
  lemma: string | null;
  eng: string;
}

/**
 * Build the Claude prompt for word alignment and DSS search.
 * mtWords:  pre-computed OSHB words with lexical glosses (null if unavailable).
 * lxxWords: pre-computed LXX words with TBESG glosses (null if unavailable).
 * vulWords: pre-computed Vulgate words with L&S glosses (null if unavailable).
 */
export function buildPrompt(
  ref: string,
  mt: string,
  lxx: string,
  vul: string,
  mtWords: MTWordEntry[] | null,
  lxxWords: LXXWordEntry[] | null,
  vulWords: VulWordEntry[] | null = null,
): string {

  const useMTIdx = mtWords !== null;
  const useLXXIdx = lxxWords !== null;
  const useVULIdx = vulWords !== null;

  const mtSection = useMTIdx
    ? `MASORETIC TEXT — pre-tokenized from OSHB (Westminster Leningrad Codex).
These are the ${mtWords!.length} MT words for this verse, numbered [0]–[${mtWords!.length - 1}].
Reference MT words by their index number (mt_idx) in the output rows. Do NOT repeat the word text.
${mtWords!.map((w, i) => `  [${i}] orig="${w.orig}" eng="${w.eng}"`).join('\n')}`
    : `MASORETIC TEXT (Westminster Leningrad Codex):
${mt}`;

  const lxxSection = useLXXIdx
    ? `SEPTUAGINT (Rahlfs 1935) — pre-tokenized from eliranwong/LXX-Rahlfs-1935 + STEPBible TBESG.
These are the ${lxxWords!.length} LXX words for this verse, numbered [0]–[${lxxWords!.length - 1}].
Reference LXX words by their index number (lxx_idx) in the output rows. Do NOT repeat the word text.
${lxxWords!.map((w, i) => `  [${i}] orig="${w.orig}" eng="${w.eng}"`).join('\n')}`
    : `SEPTUAGINT (Rahlfs):
${lxx}`;

  const vulSection = useVULIdx
    ? `VULGATE (Clementine) — pre-tokenized from vulgate.net / Lewis & Short.
These are the ${vulWords!.length} Vulgate words for this verse, numbered [0]–[${vulWords!.length - 1}].
Reference Vulgate words by their index number (vul_idx) in the output rows. Do NOT repeat the word text.
${vulWords!.map((w, i) => `  [${i}] orig="${w.orig}" eng="${w.eng}"`).join('\n')}`
    : `VULGATE (Clementine):
${vul}`;

  // Build the row format example based on what's available
  const rowFormat = JSON.stringify({
    ...(useMTIdx
      ? { mt_idx: 0 }
      : { mt: { orig: 'pointed Hebrew', eng: 'gloss' } }),
    ...(useLXXIdx
      ? { lxx_idx: 2 }
      : { lxx: { orig: 'Greek word', eng: 'gloss' } }),
    ...(useVULIdx
      ? { vul_idx: 1 }
      : { vul: { orig: 'Latin word', eng: 'gloss' } }),
  });

  // Build coverage accounting note
  const coverageNote = [
    useMTIdx ? `- mt_idx must cover all ${mtWords!.length} MT words (indices 0–${mtWords!.length - 1}), each exactly once` : '',
    useLXXIdx ? `- lxx_idx must cover all ${lxxWords!.length} LXX words (indices 0–${lxxWords!.length - 1}), each exactly once` : '',
    useVULIdx ? `- vul_idx must cover all ${vulWords!.length} Vulgate words (indices 0–${vulWords!.length - 1}), each exactly once` : '',
  ].filter(Boolean).join('\n');

  return `You are a biblical textual critic producing a word-alignment table for a scholar comparing three manuscript traditions (MT, LXX, Vulgate). The scholar reads the table row by row — each row must show the SAME CONCEPT across all three columns. A single misaligned row destroys the comparison. Alignment is the only thing that matters.

Verse: ${ref}

${mtSection}

${lxxSection}

${vulSection}

══════════════════════════════════════
ALIGNMENT TASK
══════════════════════════════════════
Your job is to produce an ALIGNMENT MAP — an ordered list of rows where each row specifies which word from each tradition expresses the same concept.

${useMTIdx ? 'The MT word list is the backbone. Start with each MT word in order and determine which LXX and Vulgate words translate it.' : ''}

For EACH row:
- Which MT word [index] belongs here? (null if no MT word for this row)
- Which LXX word [index] belongs here? (null if LXX has no word here)
- Which Vulgate word [index] belongs here? (null if Vulgate has no word here)

SEMANTIC ALIGNMENT — this is meaning-based, NOT position-based:
- Greek and Latin have free word order. A Latin word near the end of the sentence may translate the first Hebrew word.
- Ask for each Greek word: "Which Hebrew word does this translate?" Put them on the same row.
- Ask for each Latin word: "Which Hebrew word does this translate?" Put them on the same row.
- If a Greek or Latin word has no Hebrew equivalent (genuine addition), it gets its own row with ${useMTIdx ? 'mt_idx: null' : 'mt orig "—"'}.
- The Hebrew conjunction prefix (ו-) baked into a verb form is NOT a separate MT word. If the Greek has a standalone καί or the Latin has "et" for that prefix, they are additions — give them their own row with ${useMTIdx ? 'mt_idx: null' : 'mt "—"'}.

WORD COVERAGE (non-negotiable):
${coverageNote}
Every word from every pre-tokenized list must appear in exactly one row. No word may be skipped or duplicated.

TRADITION RELATIONSHIPS (scholarly context):
- LXX (c. 300–100 BCE) was translated from a Hebrew Vorlage sometimes differing from MT. LXX pluses may reflect real Hebrew words in that Vorlage.
- Vulgate (c. 400 CE) generally follows the Hebrew closely but may use interpretive Latin equivalents.

Respond with ONLY valid JSON, no markdown fences:
{"ref":"verse reference","title":"key Hebrew phrase in pointed Hebrew","subtitle":"English description","rows":[${rowFormat}]}

RULES (non-negotiable):
- ONE WORD PER CELL. Every particle, article, conjunction gets its own row.
- ${useMTIdx ? 'Use mt_idx (integer or null) to reference MT words. Do NOT write mt orig/eng text in rows.' : 'Provide mt: {orig, eng} for each MT word.'}
- ${useLXXIdx ? 'Use lxx_idx (integer or null) to reference LXX words. Do NOT write lxx orig/eng text in rows.' : 'Provide lxx: {orig, eng} for each LXX word.'}
- ${useVULIdx ? 'Use vul_idx (integer or null) to reference Vulgate words. Do NOT write vul orig/eng text in rows.' : 'Provide vul: {orig, eng} for each Vulgate word.'}
- Semantic alignment: the word for "God" in all traditions must be on the SAME row. The word for "called" must be on the SAME row. Position in the sentence is irrelevant — meaning determines the row.
- ONLY the JSON object, nothing else`;
}

/**
 * Build the verification prompt for the second-pass gloss check.
 */
export function buildVerifyPrompt(ref: string, rows: unknown[]): string {
  return `You are a biblical language expert reviewing a word-alignment table for ${ref}.

IMPORTANT: Do NOT suggest changes to MT, LXX, or Vulgate English glosses — those come from authoritative lexical databases and are not subject to correction. Only flag: (1) wrong-row alignment (semantically different words on the same row), (2) DSS readings that clearly disagree with the attested manuscript text.

Check two things only:
1. Rows align semantically — the MT, LXX, and Vulgate cells on the same row translate the same underlying concept. Flag rows where semantically different words are placed together.
2. DSS entries marked "extant" actually agree with the MT text shown (do not flag presumed agreement — only flag if the DSS orig clearly differs from MT orig on the same row).

Alignment JSON to review:
${JSON.stringify({ ref, rows })}

If everything is correct, respond with ONLY:
{"verified":true,"corrections":[]}

If you find errors, respond with:
{"verified":false,"corrections":[{"row":0,"column":"dss","field":"orig","was":"wrong","now":"correct","reason":"explanation"}],"corrected_rows":[THE FULL CORRECTED ROWS ARRAY WITH ALL CORRECTIONS APPLIED]}

The "row" index is 0-based. "column" is one of: mt, lxx, vul, dss. "field" is one of: orig, eng.
Only flag genuine errors, not stylistic preferences.
ONLY return valid JSON, nothing else.`;
}
