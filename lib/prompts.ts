
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
 * Build the Claude prompt for word alignment.
 * Returns alignment groups: each group links semantically equivalent words across traditions.
 * Word order within each tradition is never touched — only correspondence is recorded.
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
${mtWords!.length} words, indexed [0]–[${mtWords!.length - 1}]:
${mtWords!.map((w, i) => `  [${i}] orig="${w.orig}" eng="${w.eng}"`).join('\n')}`
    : `MASORETIC TEXT (Westminster Leningrad Codex):
${mt}`;

  const lxxSection = useLXXIdx
    ? `SEPTUAGINT (Rahlfs 1935) — pre-tokenized from eliranwong/LXX-Rahlfs-1935 + STEPBible TBESG.
${lxxWords!.length} words, indexed [0]–[${lxxWords!.length - 1}]:
${lxxWords!.map((w, i) => `  [${i}] orig="${w.orig}" eng="${w.eng}"`).join('\n')}`
    : `SEPTUAGINT (Rahlfs):
${lxx}`;

  const vulSection = useVULIdx
    ? `VULGATE (Clementine) — pre-tokenized from vulgate.net / Lewis & Short.
${vulWords!.length} words, indexed [0]–[${vulWords!.length - 1}]:
${vulWords!.map((w, i) => `  [${i}] orig="${w.orig}" eng="${w.eng}"`).join('\n')}`
    : `VULGATE (Clementine):
${vul}`;

  const coverageNote = [
    useMTIdx  ? `- mt:  every index 0–${mtWords!.length - 1} must appear in exactly one group` : '',
    useLXXIdx ? `- lxx: every index 0–${lxxWords!.length - 1} must appear in exactly one group` : '',
    useVULIdx ? `- vul: every index 0–${vulWords!.length - 1} must appear in exactly one group` : '',
  ].filter(Boolean).join('\n');

  return `You are a biblical textual critic producing a word-alignment map for a scholar comparing three manuscript traditions (MT, LXX, Vulgate).

CRITICAL PRINCIPLE: Word order within each tradition is sacred and must never be changed. Your only job is to record WHICH words correspond across traditions — not to sort or reorder anything.

Verse: ${ref}

${mtSection}

${lxxSection}

${vulSection}

══════════════════════════════════════
ALIGNMENT TASK
══════════════════════════════════════
Produce an ALIGNMENT MAP — a list of semantic groups. Each group records which word from each tradition expresses the same underlying concept.

For each group:
- ${useMTIdx ? 'mt: which MT index (integer or null)' : 'mt: {orig, eng} or null'}
- ${useLXXIdx ? 'lxx: which LXX index (integer or null)' : 'lxx: {orig, eng} or null'}
- ${useVULIdx ? 'vul: which VUL index (integer or null)' : 'vul: {orig, eng} or null'}

Order groups by MT word order when possible (null-MT groups may be inserted at the nearest semantic position).

SEMANTIC ALIGNMENT — meaning-based, NOT position-based:
- Greek and Latin have free word order. A Latin word at the end may translate the first Hebrew word.
- Ask for each Greek word: "Which Hebrew word does this translate?" Link them in the same group.
- Ask for each Latin word: "Which Hebrew word does this translate?" Link them in the same group.
- If a Greek or Latin word has no Hebrew equivalent (genuine addition), give it its own group with mt: null.
- The Hebrew conjunction prefix (ו-) baked into a verb is NOT a separate MT word. If Greek has standalone καί or Latin has "et" for that prefix, give them their own group with mt: null.
- Greek definite articles (ὁ, ἡ, τό, τόν, τήν, τοῦ, τῆς, etc.) always get mt: null — Hebrew definiteness is a baked-in prefix, not a standalone word.
- Hebrew morphological prefixes (ב, ל, מ, כ) are baked into their token. When LXX or Vulgate expresses such a prefix as a standalone word (ἐν for ב, in/in for ב, ἐκ/ἀπό for מ), that preposition gets mt: null. The Hebrew word pairs with the corresponding content noun (not the preposition).

WORD COVERAGE (non-negotiable):
${coverageNote}
Every word from every pre-tokenized list must appear in exactly one group. No word may be skipped or duplicated.

TRADITION RELATIONSHIPS (scholarly context):
- LXX (c. 300–100 BCE) was translated from a Hebrew Vorlage sometimes differing from MT.
- Vulgate (c. 400 CE) generally follows the Hebrew closely but may use interpretive equivalents.

Respond with ONLY valid JSON, no markdown fences:
{"ref":"verse reference","title":"key Hebrew phrase in pointed Hebrew","subtitle":"English description","groups":[{"lxx":0,"mt":null,"vul":null},{"lxx":1,"mt":0,"vul":0}]}

RULES (non-negotiable):
- ONE WORD PER GROUP. Every particle, article, conjunction gets its own group.
- ${useMTIdx  ? 'Use mt integer index or null. Do NOT write mt orig/eng text.' : 'Provide mt: {orig, eng} or null.'}
- ${useLXXIdx ? 'Use lxx integer index or null. Do NOT write lxx orig/eng text.' : 'Provide lxx: {orig, eng} or null.'}
- ${useVULIdx ? 'Use vul integer index or null. Do NOT write vul orig/eng text.' : 'Provide vul: {orig, eng} or null.'}
- ONLY the JSON object, nothing else`;
}

/**
 * Build the verification prompt for the second-pass gloss check.
 */
export function buildVerifyPrompt(ref: string, groups: unknown[], traditions: unknown): string {
  return `You are a biblical language expert reviewing a word-alignment map for ${ref}.

IMPORTANT: Do NOT suggest changes to MT, LXX, or Vulgate English glosses — those come from authoritative lexical databases. Only flag: (1) wrong-group alignment (semantically different words in the same group), (2) DSS readings that clearly disagree with the attested manuscript text.

Check two things only:
1. Groups align semantically — the MT, LXX, and Vulgate entries in the same group translate the same underlying concept. Flag groups where semantically different words are linked.
2. DSS entries marked "extant" actually agree with the MT text shown.

Alignment data to review:
${JSON.stringify({ ref, groups, traditions })}

If everything is correct, respond with ONLY:
{"verified":true,"corrections":[]}

If you find errors, respond with:
{"verified":false,"corrections":[{"group":0,"tradition":"lxx","field":"idx","was":2,"now":3,"reason":"explanation"}]}

Only flag genuine errors. ONLY return valid JSON, nothing else.`;
}
