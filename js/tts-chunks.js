/**
 * Split long tutor/voice text into TTS-safe chunks without cutting mid-sentence.
 */
function protectTtsDecimalPoints(text) {
  return String(text || '')
    .replace(/(\d)\.(\d)/g, '$1<TTS_DOT>$2')
    .replace(/\b([A-Za-z])\./g, '$1<TTS_ABBR>');
}

function restoreTtsDecimalPoints(text) {
  return String(text || '')
    .replace(/<TTS_DOT>/g, '.')
    .replace(/<TTS_ABBR>/g, '.');
}

function splitTtsSentences(text) {
  var src = String(text || '').replace(/\s+/g, ' ').trim();
  if (!src) return [];
  var shielded = protectTtsDecimalPoints(src);
  var parts = [];
  var re = /[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g;
  var m;
  while ((m = re.exec(shielded)) !== null) {
    var s = restoreTtsDecimalPoints(m[0].trim());
    if (s.length > 1) parts.push(s);
  }
  return parts.length ? parts : [src];
}

function isCompleteSpokenLine(text, minWords) {
  minWords = minWords || 5;
  var t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length < 18) return false;
  if ((t.match(/\b\w+\b/g) || []).length < minWords) return false;
  return /[.!?]$/.test(t);
}

/**
 * Teaching forms for TTS — cascada TODA la biblioteca MSI:
 * ranuras/siglas se LEEN (pronombre, verbo, presente perfecto…), nunca "ve"/"pe pe".
 * V+ing → "verbo más í ene je" (CR jota — never English ai/en/yi or gee).
 */
function normalizeTtsTeachingForms(text) {
  var t = String(text || '');
  t = t.replace(/\(([^)]*)\)/g, ' $1 ');
  t = t.replace(/\[([^\]]*)\]/g, ' $1 ');
  t = t.replace(/（([^）]*)）/g, ' $1 ');
  t = t.replace(/\[\[CTYPE:[^\]]*\]\]/gi, ' ');
  t = t.replace(/\b([A-Za-z]{2,14})\s*\/\s*([A-Za-z]{2,14})\s*\/\s*([A-Za-z]{2,14})\b/g, '$1. $2. $3.');
  t = t.replace(/\b([A-Za-z]{2,14})\s*\/\s*([A-Za-z]{2,14})\b/g, '$1. $2.');
  var triples = [
    ['do', 'did', 'done'], ['go', 'went', 'gone'], ['come', 'came', 'come'],
    ['take', 'took', 'taken'], ['give', 'gave', 'given'], ['get', 'got', 'gotten'],
    ['make', 'made', 'made'], ['see', 'saw', 'seen'], ['say', 'said', 'said'],
    ['send', 'sent', 'sent'], ['keep', 'kept', 'kept'], ['let', 'let', 'let'],
    ['put', 'put', 'put'], ['have', 'has', 'had'], ['be', 'was', 'been']
  ];
  triples.forEach(function (tr) {
    var re = new RegExp('\\b(' + tr[0] + ')\\s+(' + tr[1] + ')\\s+(' + tr[2] + ')\\b', 'gi');
    t = t.replace(re, tr[0] + '. ' + tr[1] + '. ' + tr[2] + '.');
  });
  t = t.replace(/\bI\s+do\s*\.?\s*did\s*\.?\s*done\b/gi, 'I do. did. done.');
  t = t.replace(/\bI\s+have\s*\.?\s*has\s*\.?\s*had\b/gi, 'I have. has. had.');

  // Siglas largas ANTES de ranuras de 1 letra
  t = t.replace(/\bGOING\s+TO\b/gi, ' going to ');
  t = t.replace(/\bTO\s+BE\b/gi, ' to be ');
  t = t.replace(/\bPARTICIPIO\b/gi, ' participio ');
  t = t.replace(/\bPREP\b/gi, ' preposicion ');
  t = t.replace(/\bMODAL(?:ES)?\b/gi, ' modal ');
  t = t.replace(/\bAUX(?:ILIAR)?\b/gi, ' auxiliar ');
  t = t.replace(/\bADJ(?:ECTIVE|ETIVO)?\b/gi, ' adjetivo ');
  t = t.replace(/\bPRP\b/gi, ' presente perfecto ');
  t = t.replace(/\bPPC\b/gi, ' pasado perfecto continuo ');
  t = t.replace(/\bPAP\b/gi, ' pasado perfecto ');
  t = t.replace(/\bPR\b/gi, ' presente simple ');
  t = t.replace(/\bPS\b/gi, ' pasado simple ');
  t = t.replace(/\bPC\b/gi, ' presente continuo ');
  t = t.replace(/\bPP\b/gi, ' participio ');
  t = t.replace(/\bTB\b/gi, ' to be ');
  t = t.replace(/\bBEEN\b/gi, ' been ');
  t = t.replace(/\bHAVE\b/gi, ' have ');
  t = t.replace(/\bHAS\b/gi, ' has ');
  t = t.replace(/\bHAD\b/gi, ' had ');
  t = t.replace(/\bWILL\b/gi, ' will ');

  // V+ing / VERBO+ING — CR Spanish with JOTA: í ene je (never English ai·en·yi / gee)
  t = t.replace(/\bai\s*[·•.\-–]?\s*en\s*[·•.\-–]?\s*yi\b/gi, ' í ene je ');
  t = t.replace(/\bay\s+en\s+yi\b/gi, ' í ene je ');
  t = t.replace(/\beye\s+en\s+jee\b/gi, ' í ene je ');
  t = t.replace(/\bVERBO\s*[+|\/]\s*ING\b/gi, ' verbo más í ene je ');
  t = t.replace(/\bV\s*[+|\/]\s*ing\b/gi, ' verbo más í ene je ');
  t = t.replace(/\bV\s*-\s*ing\b/gi, ' verbo más í ene je ');
  t = t.replace(/\bVing\b/gi, ' verbo más í ene je ');
  t = t.replace(/\bV\s*[+|\/]\s*s\b/gi, ' verbo más S ');
  t = t.replace(/\bV\s*-\s*s\b/gi, ' verbo más S ');
  t = t.replace(/\bV3\b/gi, ' past participle ');

  t = t.replace(/\bP\s*[|+/]\s*AUX(?:ILIAR)?\s*[|+/]\s*NOT\s*[|+/]\s*V\s*[|+/]\s*C\b/gi,
    ' pronombre más auxiliar más not más verbo más complemento ');
  t = t.replace(/\bP\s*[|+/]\s*M\s*[|+/]\s*V\s*[|+/]\s*C\b/gi,
    ' pronombre más modal más verbo más complemento ');
  t = t.replace(/\bP\s*[|+/]\s*V\s*[|+/]\s*C\b/gi,
    ' pronombre más verbo más complemento ');
  t = t.replace(/\b([PMVC])\s*\+\s*([PMVC])\s*\+\s*([PMVC])(?:\s*\+\s*([PMVC]))?\b/gi, function (_, a, b, c, d) {
    var map = { P: 'pronombre', M: 'modal', V: 'verbo', C: 'complemento', p: 'pronombre', m: 'modal', v: 'verbo', c: 'complemento' };
    var parts = [map[a] || a, map[b] || b, map[c] || c];
    if (d) parts.push(map[d] || d);
    return ' ' + parts.join(' más ') + ' ';
  });

  t = t.replace(/\+/g, ' más ');
  t = t.replace(/\s*\|\s*/g, ' más ');
  t = t.replace(/\bVERBO\s*más\s*ING\b/gi, ' verbo más í ene je ');
  t = t.replace(/\bV\s*más\s*ing\b/gi, ' verbo más í ene je ');
  t = t.replace(/\bV\s*más\s*s\b/gi, ' verbo más S ');
  t = t.replace(/\bI\s+N\s+G\b/g, ' í ene je ');
  t = t.replace(/\bí\s+ene\s+ge\b/gi, ' í ene je ');
  // Have = jáf with Spanish JOTA (never English J → "yaf")
  // Double-j seeds LatAm jota /x/ in ElevenLabs; bare "jáf" often becomes "yaf"
  t = t.replace(/\byaf\b/gi, 'jáf');
  t = t.replace(/\byas\b/gi, 'jás');
  t = t.replace(/\byad\b/gi, 'jád');
  t = t.replace(/\bjaf\b/gi, 'jáf');
  t = t.replace(/\bjas\b/gi, 'jás');
  t = t.replace(/\bjad\b/gi, 'jád');
  t = t.replace(/\bjáf\b/gi, 'jjáf');
  t = t.replace(/\bjás\b/gi, 'jjás');
  t = t.replace(/\bjád\b/gi, 'jjád');

  t = t.replace(/\bP\b/g, ' pronombre ');
  t = t.replace(/\bM\b/g, ' modal ');
  t = t.replace(/\bV\b/g, ' verbo ');
  t = t.replace(/\bC\b/g, ' complemento ');

  t = t.replace(/\bBE\b/g, ' be ');
  t = t.replace(/\bAM\b/g, ' am ');
  t = t.replace(/\bIS\b/g, ' is ');
  t = t.replace(/\bARE\b/g, ' are ');
  t = t.replace(/\bWAS\b/g, ' was ');
  t = t.replace(/\bWERE\b/g, ' were ');
  t = t.replace(/\bNOT\b/g, ' not ');
  t = t.replace(/\bTHAN\b/gi, ' than ');
  t = t.replace(/\bTHE\b/g, ' the ');
  t = t.replace(/\bAS\b/g, ' as ');
  t = t.replace(/\bING\b/g, ' í ene je ');
  return t;
}

var _TTS_EN_GRAMMAR = /^(am|is|are|was|were|be|been|being|do|does|did|have|has|had|will|would|can|could|must|may|might|not|to|past|participle)$/i;

/** One TTS line — keep pause marks so paradigms are not mashed; soft human cadence. */
function prepareTtsLine(text) {
  var cleaned = normalizeTtsTeachingForms(
    String(text || '')
      // Portal/machine tags FIRST — later we strip [ ] chars, which would leave "BOARD:present" spoken
      .replace(/\[\[\s*BOARD_DESIGN\s*:[^\]]*\]\]/gi, ' ')
      .replace(/\[\[\s*BOARD\s*:[^\]]*\]\]/gi, ' ')
      .replace(/\[\[\s*CTYPE\s*:[^\]]*\]\]/gi, ' ')
      .replace(/JILL_META:\s*\{[\s\S]*$/i, ' ')
      .replace(/ALICE:|CLAIRE:|JILL:/gi, '')
      // Internal labels — NEVER reach student ears
      .replace(/\bGet It Straight(?:\s*ING)?\b[:\s—–\-]*/gi, '')
      .replace(/\b(?:John\s+)?Off the Clock\b[:\s—–\-]*/gi, '')
      .replace(/\bJohn\s+Ram[ií]rez\b/gi, '')
      .replace(/\bJohnny(?:\s+Ram[ií]rez)?\b/gi, '')
      .replace(/\bPuente\s+JOHN\b[:\s—–\-]*/gi, 'Puente: ')
      .replace(/\blecci[oó]n\s+(?:can[oó]nica\s+)?John\b[:\s—–\-]*/gi, '')
      .replace(/\bM[oó]dulo\s*0*\d+[A-Z-]*/gi, '')
      .replace(/\bestilo\s+John(?:\s+Ram[ií]rez)?\b/gi, 'estilo Infinity')
      .replace(/\bPaso\s*\d+\s*[:.\-–—]*/gi, '')
      .replace(/\b(?:Primero|Segundo|Tercero)\s*[:.\-–—]/gi, '')
      .replace(/\bEs importante destacar que\b/gi, 'Mira, ')
      .replace(/\bCabe mencionar que\b/gi, '')
      .replace(/\bA continuaci[oó]n\b/gi, 'Entonces')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^\s*[-•]\s+/gm, '')
      .replace(/[*_#\[\]{}<>|~`^]/g, ' ')
      // Tico lock — never AR / PT (no \\b on accents: JS \\b breaks on á/ê)
      .replace(/mirá/gi, 'mira')
      .replace(/fíjate/gi, 'fijate')
      .replace(/(^|[\s,.—–\-¿¡])che\b[,!.…]*/gi, '$1')
      .replace(/bolud[oa]s?/gi, '')
      .replace(/\blaburando\b/gi, 'trabajando')
      .replace(/\blaburar\b/gi, 'trabajar')
      .replace(/\blaburo\b/gi, 'trabajo')
      .replace(/\bte\s+late\b/gi, 'qué te parece')
      .replace(/\bme\s+late\b/gi, 'tuanis')
      .replace(/voc[eê]s?/gi, 'vos')
      .replace(/obrigad[oa]/gi, 'gracias')
      .replace(/então/gi, 'entonces')
      .replace(/não/gi, 'no')
  )
    .replace(/[¿¡]/g, '')
    .replace(/[—–―…]/g, ', ')
    .replace(/\.{2,}/g, '. ')
    // Keep . ! ? , as pauses for ElevenLabs (do. did. done. — never dodiddone)
    .replace(/[;:/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // L=ele, G=je, R=erre — never English letter names
  return expandCrLetterNames(cleaned);
}

var _ES_TTS_WORD = /^(el|la|los|las|un|una|unos|unas|que|de|del|al|con|por|para|en|y|o|u|es|son|soy|estás|estoy|está|están|hola|gracias|claro|ejemplo|verbo|oración|regla|practica|practicá|decime|seguimos|entiendo|más|qué|cómo|vos|podés|armá|querés|vamos|hoy|ahora|paso|frase|modelo|ranura|fórmula|tema|lección|mini|simple|parte|palabras|inglés|español|pedime|escucho|listo|perfecto|muy|bien|retomemos|arrancamos|confirmá|enseñá|corregí|charla|libre|futuro|pasado|presente|gerundio|modal|estructura|mecánica|pieza|chunk|complemento|pronombre|artículo|preposición|siguiente|turno|respuesta|pregunta|duda|ayuda|explic|enseñ|podés|armás|querés|decís|habl|practic|segu|vamos|ok|dale|bueno|genial|excelente|primero|después|luego|también|pero|porque|cuando|donde|dónde|cuál|este|esta|ese|esa|tu|mi|su|nuestro|vuestro|sin|sobre|entre|hacia|desde|hasta|solo|si|sí|no|ni|ya|aún|todavía|siempre|nunca|aquí|allí|así|me|te|se|nos|les|lo|la|le|unos|unas|auxiliar|fórmula|ranuras|negación|negaciones|trabajo|trabajar|trabajando|trabajé|trabajó|trabajamos|trabajás|ele|eme|ene|erre|ese|jota|je|hache|uve|equis|eñe|letra|letras|abecedario|jota|tuanis|computadora|carro|celular|jugo|casa|clase|estudiante|tutora|tico|tica|costa|rica)$/i;

/** CR Spanish letter names — L=ele, G=je (jota), R=erre. Never English el/gee/ar. */
var _CR_LETTER_NAME = {
  a: 'a', b: 'be', c: 'ce', d: 'de', e: 'e', f: 'efe', g: 'je', h: 'hache',
  i: 'i', j: 'jota', k: 'ka', l: 'ele', m: 'eme', n: 'ene', o: 'o', p: 'pe',
  q: 'cu', r: 'erre', s: 'ese', t: 'te', u: 'u', v: 'uve', w: 'doble uve',
  x: 'equis', y: 'ye', z: 'zeta'
};

var _EN_TTS_WORD = /^(i|you|he|she|it|we|they|am|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|should|could|can|must|may|might|the|a|an|to|of|in|on|at|for|and|but|or|not|with|from|by|as|if|so|that|this|these|those|my|your|his|her|its|our|their|home|work|worked|study|studied|ready|tomorrow|today|yesterday|because|however|although|example|practice|sentence|verb|structure|hello|thanks|yes|please|let|me|rephrase|night|morning|tired|happy|here|there|next|month|week|day|travel|learn|speak|go|going|make|made|take|took|get|got|see|saw|know|knew|think|thought|want|need|say|said|tell|told|office|school|been|base|simple|past|present|future|progressive|perfect|continuous|modal|chunk|linker|however|top|that|what|how|when|where|who|why|which|some|any|every|each|both|all|one|two|three|first|second|third|time|year|life|world|people|thing|way|day|man|woman|child|children|good|great|new|old|long|short|high|low|big|small|other|same|different|right|left|early|late|hard|easy|fast|slow|warm|cool|hot|cold|open|close|start|stop|try|use|find|give|keep|leave|call|ask|help|show|move|live|believe|hold|turn|follow|begin|run|bring|write|provide|sit|stand|lose|pay|meet|include|continue|set|learn|change|lead|understand|watch|follow|create|read|allow|add|spend|grow|open|walk|win|offer|remember|love|consider|appear|buy|wait|serve|die|send|expect|build|stay|fall|cut|reach|kill|remain|suggest|raise|pass|sell|require|report|decide|pull)$/i;

function classifyTtsWord(word) {
  var w = String(word || '').trim();
  if (!w) return null;
  // Single MSI letters stay with surrounding language (usually Spanish)
  if (/^[PMVC]$/i.test(w)) return null;
  // Letter names CR — always Spanish TTS (ele / je / erre), never English el/gee/ar
  if (/^(í|i|ene|eme|ele|erre|ese|je|ge|jota|hache|uve|equis|eñe|efe|doble|jáf|jás|jád|jjáf|jjás|jjád|jaf|jas|jad)$/i.test(w)) return 'es';
  if (/[áéíóúñ¿¡]/i.test(w)) return 'es';
  var bare = w.toLowerCase().replace(/['']/g, "'");
  // Spanish morphology BEFORE English — stops "Trabajo" → English TTS ("shrabajou")
  if (/(ción|cion|mente|ando|endo|amos|emos|imos|áis|éis|ís|aba|ía|oso|osa|aje|aje|bilidad)$/i.test(bare)) return 'es';
  if (/^(trabajar|trabajo|trabajando|trabajé|trabajó|trabajamos|trabajás|trabaja|trabajás)$/i.test(bare)) return 'es';
  if (_TTS_EN_GRAMMAR.test(bare)) return 'en';
  if (_ES_TTS_WORD.test(bare)) return 'es';
  if (_EN_TTS_WORD.test(bare)) return 'en';
  if (/^(don't|didn't|won't|can't|couldn't|shouldn't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't|i'm|you're|we're|they're|he's|she's|it's|i've|you've|we've|they've|i'll|you'll|we'll|they'll|i'd|you'd|we'd|they'd)$/i.test(bare)) return 'en';
  if (/^[a-z]+ing$/i.test(bare) && bare.length > 4) return 'en';
  if (/^[a-z]+ed$/i.test(bare) && bare.length > 3 && !/^(red|fed|led|bed|wed)$/i.test(bare)) return 'en';
  // DO NOT treat Capitalized words as English — Spanish sentences start with caps ("Trabajo…")
  return null;
}

/** Expand letter names for CR TTS: L→ele, G→je, R→erre. */
function expandCrLetterNames(text) {
  var t = String(text || '');
  t = t.replace(/\b(la|el|letra)\s+L\b/gi, '$1 ele');
  t = t.replace(/\b(la|el|letra)\s+G\b/gi, '$1 je');
  t = t.replace(/\b(la|el|letra)\s+R\b/gi, '$1 erre');
  t = t.replace(/\b(la|el|letra)\s+J\b/gi, '$1 jota');
  // Spelled clusters of single letters (I N G, L M N…) → CR names
  t = t.replace(/\b([A-Za-zÁÉÍÓÚÑáéíóúñ])(?:\s+([A-Za-zÁÉÍÓÚÑáéíóúñ])){1,6}\b/g, function (m) {
    var parts = m.trim().split(/\s+/);
    if (parts.length < 2) return m;
    if (!parts.every(function (p) { return p.length === 1; })) return m;
    return parts.map(function (p) {
      var k = p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (p.toLowerCase() === 'ñ') return 'eñe';
      return _CR_LETTER_NAME[k] || p;
    }).join(' ');
  });
  // Force jota on leftover ge in letter-name phrases
  t = t.replace(/\bí\s+ene\s+ge\b/gi, 'í ene je');
  t = t.replace(/\bene\s+ge\b/gi, 'ene je');
  // Soft accent — keep Spanish TTS (block Brazilian "shrabajou")
  t = t.replace(/\btrabajo\b/gi, 'trabájo');
  t = t.replace(/\btrabajando\b/gi, 'trabajándo');
  t = t.replace(/\btrabajar\b/gi, 'trabajár');
  return t;
}

/** Split mixed ES/EN tutor lines so each TTS chunk uses one language. */
function splitBilingualTtsSegments(text) {
  var src = String(text || '').replace(/\s+/g, ' ').trim();
  if (!src) return [];
  var tokens = src.match(/[\wáéíóúñüÁÉÍÓÚÑÜ]+(?:'[a-z]+)?|[^\w\s]/g) || [src];
  var segments = [];
  var buf = '';
  var lang = 'es';

  function flush() {
    var t = buf.replace(/\s+/g, ' ').trim();
    if (t.length > 0) segments.push({ text: t, lang: lang });
    buf = '';
  }

  tokens.forEach(function (tok) {
    if (!/[\wáéíóúñüÁÉÍÓÚÑÜ]/i.test(tok)) {
      buf += tok;
      return;
    }
    var cls = classifyTtsWord(tok);
    if (cls && cls !== lang && buf.trim()) {
      flush();
      lang = cls;
    } else if (!cls && !buf.trim()) {
      lang = lang || 'es';
    } else if (cls) {
      lang = cls;
    }
    if (buf && !/\s$/.test(buf)) buf += ' ';
    buf += tok;
  });
  flush();

  if (!segments.length) return [{ text: src, lang: 'es' }];
  return segments.filter(function (s) { return s.text && s.text.length > 0; });
}

/** Merge tiny bilingual clips so speech does not pause between every language hop.
 *  Never swallow English grammar islands (am / be / is…) into a Spanish clip. */
function mergeShortTtsSegments(segments, minKeep) {
  minKeep = minKeep || 64;
  if (!segments || !segments.length) return [];
  var out = [];
  segments.forEach(function (seg) {
    var t = String(seg.text || '').replace(/\s+/g, ' ').trim();
    if (!t) return;
    var lang = seg.lang || 'es';
    var last = out[out.length - 1];
    var grammarIsland = _TTS_EN_GRAMMAR.test(t) || (t.split(/\s+/).length <= 3 && t.split(/\s+/).every(function (w) { return _TTS_EN_GRAMMAR.test(w); }));
    var lastGrammar = last && (_TTS_EN_GRAMMAR.test(last.text) || (last.text.split(/\s+/).length <= 3 && last.text.split(/\s+/).every(function (w) { return _TTS_EN_GRAMMAR.test(w); })));
    if (last && last.lang !== lang && (grammarIsland || lastGrammar)) {
      out.push({ text: t, lang: lang });
      return;
    }
    if (last && (t.length < minKeep || last.text.length < minKeep) && last.lang === lang) {
      out[out.length - 1] = { text: (last.text + ' ' + t).replace(/\s+/g, ' ').trim(), lang: lang };
    } else if (last && (t.length < minKeep || last.text.length < minKeep) && last.lang !== lang && !grammarIsland && !lastGrammar) {
      var merged = (last.text + ' ' + t).replace(/\s+/g, ' ').trim();
      var preferNew = t.length > last.text.length;
      out[out.length - 1] = { text: merged, lang: preferNew ? lang : last.lang };
    } else {
      out.push({ text: t, lang: lang });
    }
  });
  return out;
}

function detectJillLineLang(line) {
  var t = String(line || '');
  if (/[áéíóúñ]/i.test(t)) return 'es';
  var words = t.match(/[\wáéíóúñüÁÉÍÓÚÑÜ']+/g) || [];
  var en = 0;
  var es = 0;
  words.forEach(function (w) {
    var c = classifyTtsWord(w);
    if (c === 'en') en++;
    if (c === 'es') es++;
  });
  return en > es * 1.4 ? 'en' : 'es';
}

/** Jill: ONLY two accents — LatAm Spanish (es-CR) or American English (en-US). */
function jillTtsSegments(text, maxLen) {
  maxLen = maxLen || 900;
  var line = prepareTtsLine(text);
  if (!line) return [];
  var lineLang = detectJillLineLang(line);
  // Mostly Spanish explanation → ONE LatAm clip (never American islands on Spanish)
  if (lineLang === 'es' || /[áéíóúñ]/i.test(line)) {
    if (line.length <= maxLen) return [{ text: line, lang: 'es-CR' }];
    return splitTtsChunks(line, maxLen).map(function (chunk) {
      return { text: chunk, lang: 'es-CR' };
    });
  }
  // Pure English → American only
  if (line.length <= maxLen) return [{ text: line, lang: 'en-US' }];
  return splitTtsChunks(line, maxLen).map(function (chunk) {
    return { text: chunk, lang: 'en-US' };
  });
}

/** Debounced TTS warm-up while LLM is still streaming — only complete sentences. */
function scheduleTtsPrefetch(text, prefetchFn, state) {
  state = state || {};
  var minLen = state.minLen || 80;
  var ms = state.ms || 280;
  var line = prepareTtsLine(text);
  if (line.length < minLen) return;
  // Never prefetch a truncated mid-stream clip — it used to poison server TTS cache.
  if (!/[.!?…]$/.test(String(text || '').replace(/\s+/g, ' ').trim()) && line.length < 220) return;
  if (!isCompleteSpokenLine(line, 8) && line.length < 180) return;
  clearTimeout(state.timer);
  state.timer = setTimeout(function () {
    if (line === state.last) return;
    state.last = line;
    if (typeof prefetchFn === 'function') prefetchFn(line);
  }, ms);
}

/** Prefer one TTS request; split only when text is very long. */
function ttsSpeakLines(text, maxLen) {
  maxLen = maxLen || 1200;
  var line = prepareTtsLine(text);
  if (!line) return [];
  if (line.length <= maxLen) return [line];
  return splitTtsChunks(line, maxLen);
}

/** Watchdog ms so long audio is never cut mid-playback (~12 chars/sec + buffer). */
function ttsWatchdogMs(textLen) {
  var n = Math.max(40, Number(textLen) || 0);
  return Math.min(180000, Math.max(75000, Math.ceil(n / 10) * 1000 + 20000));
}

function splitTtsChunks(text, maxLen) {
  maxLen = maxLen || 450;
  var sentences = splitTtsSentences(text);
  if (!sentences.length) return [];
  var chunks = [];
  var buf = '';
  sentences.forEach(function (sentence) {
    if (sentence.length > maxLen) {
      if (buf) { chunks.push(buf.trim()); buf = ''; }
      var rest = sentence;
      while (rest.length > maxLen) {
        var slice = rest.slice(0, maxLen);
        var breakAt = Math.max(slice.lastIndexOf(' '), Math.floor(maxLen * 0.6));
        if (breakAt < 20) breakAt = maxLen;
        chunks.push(rest.slice(0, breakAt).trim());
        rest = rest.slice(breakAt).trim();
      }
      if (rest) buf = rest + ' ';
      return;
    }
    if ((buf + sentence).trim().length > maxLen) {
      if (buf.trim()) chunks.push(buf.trim());
      buf = sentence + ' ';
    } else {
      buf += sentence + ' ';
    }
  });
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

function drainTtsPending(pending, onSentence, onPrefetch) {
  var rest = String(pending || '');
  var out = [];
  while (rest.length) {
    var m = rest.match(/^([\s\S]+?[.!?¿¡])(?:\s+|$)/);
    if (m && m[1].length > 8) {
      out.push(m[1].trim());
      if (typeof onSentence === 'function') onSentence(m[1].trim());
      rest = rest.slice(m[0].length);
      var next = rest.match(/^([\s\S]+?[.!?¿¡])(?:\s+|$)/);
      if (next && next[1].length > 8 && typeof onPrefetch === 'function') {
        onPrefetch(next[1].trim());
      }
      continue;
    }
    break;
  }
  return { pending: rest, spoken: out };
}

var _ttsAudioUnlocked = false;
var _ttsSharedCtx = null;

/** Unlock browser audio after a user gesture. Always re-resume — context often suspends after mic/TTS. */
function unlockTtsAudio() {
  if (typeof CelebrationSfx !== 'undefined') CelebrationSfx.unlock();
  return new Promise(function (resolve) {
    var settled = false;
    function done() {
      if (settled) return;
      settled = true;
      _ttsAudioUnlocked = true;
      resolve();
    }
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        if (!_ttsSharedCtx || _ttsSharedCtx.state === 'closed') _ttsSharedCtx = new Ctx();
        var ctx = _ttsSharedCtx;
        var p = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
        if (p && typeof p.then === 'function') p.then(done).catch(done);
        else done();
        return;
      }
    } catch (e) { /* fall through */ }
    try {
      var a = new Audio();
      a.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      a.volume = 0.001;
      var p2 = a.play();
      if (p2 && typeof p2.then === 'function') p2.then(done).catch(done);
      else done();
    } catch (e2) {
      done();
    }
  });
}

/**
 * Play TTS blob reliably — retries autoplay, never skips queue silently.
 */
function playAudioBlob(blob, handlers) {
  handlers = handlers || {};
  if (!blob) {
    if (handlers.onError) handlers.onError();
    return null;
  }
  var url = URL.createObjectURL(blob);
  var audio = new Audio(url);
  audio.volume = 1;
  audio.muted = false;
  audio.preload = 'auto';
  var dead = false;
  var attempts = 0;

  function done(fn) {
    if (dead) return;
    dead = true;
    try { URL.revokeObjectURL(url); } catch (e) {}
    if (fn) fn();
  }

  audio.onended = function () { done(handlers.onEnded); };
  audio.onerror = function () { done(handlers.onError); };

  function tryPlay() {
    var p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(function () { _ttsAudioUnlocked = true; }).catch(function () {
        attempts++;
        if (attempts < 6) {
          unlockTtsAudio().finally(function () {
            setTimeout(tryPlay, 140 * attempts);
          });
        } else {
          done(handlers.onError);
        }
      });
    }
  }
  unlockTtsAudio().finally(tryPlay);
  return audio;
}

/** Unlock stuck send locks after network hang */
function voiceSendWatchdog(isStuck, unlock, ms) {
  ms = ms || 50000;
  var t0 = Date.now();
  var id = setInterval(function () {
    if (!isStuck()) { clearInterval(id); return; }
    if (Date.now() - t0 > ms) {
      clearInterval(id);
      unlock();
    }
  }, 2000);
  return function () { clearInterval(id); };
}
