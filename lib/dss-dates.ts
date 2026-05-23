/**
 * Paleographic date ranges and primary source citations for Dead Sea Scrolls Torah manuscripts.
 *
 * Date ranges follow the paleographic assessments in the cited DJD volumes.
 * Where a scroll is published outside the DJD series the source is noted explicitly.
 *
 * DJD = Discoveries in the Judaean Desert (Oxford: Clarendon Press).
 */
export interface DSSFragInfo {
  date: string;
  source: string;
}

export const DSS_FRAG_DATES: Record<string, DSSFragInfo> = {
  // ── Cave 1 — DJD I (Barthélemy & Milik, 1955) ────────────────────────────
  '1Q1':   { date: 'c. 100–50 BCE',    source: 'DJD I (Barthélemy & Milik, 1955)' },
  '1Q2':   { date: 'c. 50–1 BCE',      source: 'DJD I (Barthélemy & Milik, 1955)' },
  '1Q3':   { date: 'c. 100 BCE',       source: 'DJD I (Barthélemy & Milik, 1955)' },
  '1Q4':   { date: 'c. 50–1 BCE',      source: 'DJD I (Barthélemy & Milik, 1955)' },
  '1Q5':   { date: 'c. 50–1 BCE',      source: 'DJD I (Barthélemy & Milik, 1955)' },

  // ── Cave 2 — DJD III (Baillet, Milik & de Vaux, 1962) ────────────────────
  '2Q1':   { date: 'c. 50–1 BCE',      source: 'DJD III (Baillet, Milik & de Vaux, 1962)' },
  '2Q2':   { date: 'c. 250–200 BCE',   source: 'DJD III (Baillet, Milik & de Vaux, 1962)' },
  '2Q3':   { date: 'c. 50–1 BCE',      source: 'DJD III (Baillet, Milik & de Vaux, 1962)' },
  '2Q4':   { date: 'c. 100–50 BCE',    source: 'DJD III (Baillet, Milik & de Vaux, 1962)' },
  '2Q5':   { date: 'c. 200–150 BCE',   source: 'DJD III (Baillet, Milik & de Vaux, 1962)' },
  '2Q6':   { date: 'c. 50–1 BCE',      source: 'DJD III (Baillet, Milik & de Vaux, 1962)' },
  '2Q7':   { date: 'c. 250–200 BCE',   source: 'DJD III (Baillet, Milik & de Vaux, 1962)' },
  '2Q8':   { date: 'c. 50–1 BCE',      source: 'DJD III (Baillet, Milik & de Vaux, 1962)' },
  '2Q10':  { date: 'c. 50–1 BCE',      source: 'DJD III (Baillet, Milik & de Vaux, 1962)' },
  '2Q11':  { date: 'c. 100–50 BCE',    source: 'DJD III (Baillet, Milik & de Vaux, 1962)' },
  '2Q12':  { date: 'c. 50–1 BCE',      source: 'DJD III (Baillet, Milik & de Vaux, 1962)' },

  // ── Cave 4 Genesis–Numbers — DJD XII (Ulrich, Cross, et al., 1994) ────────
  '4Q1':   { date: 'c. 100–50 BCE',    source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q2':   { date: 'c. 50 BCE–1 CE',   source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q3':   { date: 'c. 30–1 BCE',      source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q5':   { date: 'c. 100–50 BCE',    source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q6':   { date: 'c. 50 BCE–68 CE',  source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q7':   { date: 'c. 100–50 BCE',    source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q9':   { date: 'c. 50 BCE',        source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q10':  { date: 'c. 200–150 BCE',   source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q11':  { date: 'c. 225–175 BCE',   source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q12':  { date: 'c. 250–200 BCE',   source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q13':  { date: 'c. 250–200 BCE',   source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q14':  { date: 'c. 50 BCE–1 CE',   source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q15':  { date: 'c. 200–150 BCE',   source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q17':  { date: 'c. 250–200 BCE',   source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q18':  { date: 'c. 100–50 BCE',    source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q19':  { date: 'c. 50–1 BCE',      source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q20':  { date: 'c. 50–1 BCE',      source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q21':  { date: 'c. 100–50 BCE',    source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q23':  { date: 'c. 100–50 BCE',    source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q24':  { date: 'c. 50 BCE–1 CE',   source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q25':  { date: 'c. 50–1 BCE',      source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q26':  { date: 'c. 100–50 BCE',    source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q26a': { date: 'c. 100–50 BCE',    source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q26b': { date: 'c. 50–1 BCE',      source: 'DJD XII (Ulrich, Cross et al., 1994)' },
  '4Q27':  { date: 'c. 100–50 BCE',    source: 'DJD XII (Ulrich, Cross et al., 1994)' },

  // ── Cave 4 Paleo-Hebrew manuscripts — DJD IX (Skehan, Ulrich & Sanderson, 1992) ──
  '4Q22':  { date: 'c. 100–50 BCE',    source: 'DJD IX (Skehan, Ulrich & Sanderson, 1992)' },
  '4Q45':  { date: 'c. 100–50 BCE',    source: 'DJD IX (Skehan, Ulrich & Sanderson, 1992)' },
  '4Q46':  { date: 'c. 100–50 BCE',    source: 'DJD IX (Skehan, Ulrich & Sanderson, 1992)' },

  // ── Cave 4 Deuteronomy — DJD XIV (White Crawford et al., 1995) ───────────
  '4Q28':  { date: 'c. 50–1 BCE',      source: 'DJD XIV (White Crawford et al., 1995)' },
  '4Q29':  { date: 'c. 250–200 BCE',   source: 'DJD XIV (White Crawford et al., 1995)' },
  '4Q30':  { date: 'c. 100–50 BCE',    source: 'DJD XIV (White Crawford et al., 1995)' },
  '4Q31':  { date: 'c. 150–100 BCE',   source: 'DJD XIV (White Crawford et al., 1995)' },
  '4Q32':  { date: 'c. 100–50 BCE',    source: 'DJD XIV (White Crawford et al., 1995)' },
  '4Q33':  { date: 'c. 50–1 BCE',      source: 'DJD XIV (White Crawford et al., 1995)' },
  '4Q34':  { date: 'c. 100–50 BCE',    source: 'DJD XIV (White Crawford et al., 1995)' },
  '4Q35':  { date: 'c. 100–50 BCE',    source: 'DJD XIV (White Crawford et al., 1995)' },
  '4Q36':  { date: 'c. 250–200 BCE',   source: 'DJD XIV (White Crawford et al., 1995)' },
  '4Q37':  { date: 'c. 100–50 BCE',    source: 'DJD XIV (White Crawford et al., 1995)' },
  '4Q38a': { date: 'c. 100–50 BCE',    source: 'DJD XIV (White Crawford et al., 1995)' },
  '4Q38b': { date: 'c. 100–50 BCE',    source: 'DJD XIV (White Crawford et al., 1995)' },
  '4Q39':  { date: 'c. 50–1 BCE',      source: 'DJD XIV (White Crawford et al., 1995)' },
  '4Q40':  { date: 'c. 100–50 BCE',    source: 'DJD XIV (White Crawford et al., 1995)' },
  '4Q41':  { date: 'c. 50–1 BCE',      source: 'DJD XIV (White Crawford et al., 1995)' },
  '4Q42':  { date: 'c. 50 BCE–1 CE',   source: 'DJD XIV (White Crawford et al., 1995)' },
  '4Q43':  { date: 'c. 50–1 BCE',      source: 'DJD XIV (White Crawford et al., 1995)' },
  '4Q44':  { date: 'c. 50–1 BCE',      source: 'DJD XIV (White Crawford et al., 1995)' },
  '4Q576': { date: 'c. 150–100 BCE',   source: 'DJD XIV (White Crawford et al., 1995)' },

  // ── Cave 5 — DJD III (Baillet, Milik & de Vaux, 1962) ────────────────────
  '5Q1':   { date: 'c. 50–1 BCE',      source: 'DJD III (Baillet, Milik & de Vaux, 1962)' },

  // ── Cave 6 — DJD III (Baillet, Milik & de Vaux, 1962) ────────────────────
  '6Q1':   { date: 'c. 250–200 BCE',   source: 'DJD III (Baillet, Milik & de Vaux, 1962)' },
  '6Q2':   { date: 'c. 250–200 BCE',   source: 'DJD III (Baillet, Milik & de Vaux, 1962)' },

  // ── Cave 8 — DJD III (Baillet, Milik & de Vaux, 1962) ────────────────────
  '8Q1':   { date: 'c. 50–1 BCE',      source: 'DJD III (Baillet, Milik & de Vaux, 1962)' },

  // ── Cave 11 — DJD XXIII (García Martínez, Tigchelaar & van der Woude, 1998) ──
  '11Q1':  { date: 'c. 100–25 BCE',    source: 'DJD XXIII (García Martínez, Tigchelaar & van der Woude, 1998)' },
  '11Q2':  { date: 'c. 50 BCE–68 CE',  source: 'DJD XXIII (García Martínez, Tigchelaar & van der Woude, 1998)' },
  '11Q3':  { date: 'c. 50–1 BCE',      source: 'DJD XXIII (García Martínez, Tigchelaar & van der Woude, 1998)' },
};
