#!/usr/bin/env node
/**
 * Builds src/data/languages.json, the data behind the language picker.
 *
 *   npm run languages
 *
 * Sources (downloaded into scripts/sources/ on first run):
 *  - ISO 639-3 code tables, SIL International — every language with a code,
 *    its status (living / extinct / ancient / historical / constructed) and
 *    macrolanguage membership (e.g. Egyptian Arabic ⊂ Arabic).
 *  - Glottolog CLDF (CC-BY 4.0) — dialects of each language, the countries
 *    where it is spoken, its language family, and languages without an ISO code.
 *  - Unicode CLDR — speaker populations per country (for ranking and country tags)
 *    and the UN M49 regions each country belongs to.
 * Native names (autonyms) come from Node's built-in ICU (CLDR) data.
 * A small curated layer below adds learner-friendly varieties, common alternate
 * names, and newer languages that no standard covers yet.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'scripts', 'sources');
const outFile = join(root, 'src', 'data', 'languages.json');

const SOURCES = {
  'iso-639-3.tab': 'https://iso639-3.sil.org/sites/iso639-3/files/downloads/iso-639-3.tab',
  'macrolanguages.tab':
    'https://iso639-3.sil.org/sites/iso639-3/files/downloads/iso-639-3-macrolanguages.tab',
  'glottolog-languages.csv':
    'https://raw.githubusercontent.com/glottolog/glottolog-cldf/master/cldf/languages.csv',
  'territoryInfo.json':
    'https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json/cldr-core/supplemental/territoryInfo.json',
  'territoryContainment.json':
    'https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json/cldr-core/supplemental/territoryContainment.json',
};

// ---------------------------------------------------------------------------
// Curated layer
// ---------------------------------------------------------------------------

/** Alternate names people search for, keyed by ISO 639-3 code. */
const ALIASES = {
  aka: ['Twi', 'Fante'],
  twi: ['Asante', 'Akuapem'],
  ara: ['Arabic'],
  arb: ['Modern Standard Arabic', 'Fusha', 'MSA'],
  arz: ['Masri'],
  ary: ['Darija'],
  apc: ['Levantine', 'Shami'],
  zho: ['Chinese'],
  cmn: ['Mandarin', 'Putonghua', 'Guoyu', 'Standard Chinese'],
  yue: ['Cantonese'],
  nan: ['Hokkien', 'Taiwanese', 'Min Nan'],
  fas: ['Farsi'],
  pes: ['Farsi'],
  prs: ['Dari'],
  tgl: ['Tagalog', 'Filipino'],
  fil: ['Tagalog'],
  nya: ['Nyanja', 'Chewa', 'Chinyanja'],
  tso: ['Shangani', 'Xitsonga'],
  swa: ['Kiswahili'],
  swh: ['Kiswahili'],
  nde: ['Sindebele', 'isiNdebele', 'Ndebele'],
  nbl: ['isiNdebele'],
  sna: ['chiShona', 'Chishona'],
  tsn: ['Setswana'],
  sot: ['Sesotho', 'Southern Sotho'],
  nso: ['Sepedi', 'Pedi'],
  ven: ['Tshivenda', 'Luvenda'],
  xho: ['isiXhosa'],
  zul: ['isiZulu'],
  ssw: ['siSwati', 'Swazi'],
  kin: ['Ikinyarwanda'],
  run: ['Ikirundi'],
  lug: ['Ganda'],
  toi: ['Chitonga', 'Tonga'],
  kck: ['TjiKalanga', 'Ikalanga'],
  ndc: ['Chindau'],
  nmq: ['Nambya'],
  ell: ['Greek', 'Modern Greek'],
  grc: ['Classical Greek', 'Koine'],
  hbo: ['Biblical Hebrew', 'Classical Hebrew'],
  heb: ['Ivrit'],
  lzh: ['Classical Chinese', 'Wenyan'],
  ang: ['Anglo-Saxon', 'Old English'],
  enm: ['Middle English', 'Chaucer'],
  egy: ['Ancient Egyptian', 'Hieroglyphs'],
  non: ['Old Icelandic', 'Viking'],
  pan: ['Panjabi', 'Gurmukhi'],
  pnb: ['Shahmukhi', 'Punjabi'],
  msa: ['Malay'],
  zsm: ['Bahasa Malaysia'],
  ind: ['Bahasa Indonesia'],
  hat: ['Kreyòl'],
  nor: ['Norsk'],
  nob: ['Bokmål'],
  nno: ['Nynorsk'],
  khm: ['Cambodian'],
  mya: ['Myanmar'],
  ben: ['Bangla'],
  ori: ['Oriya'],
  sin: ['Singhalese'],
  kat: ['Kartuli'],
  hye: ['Armenian'],
  eus: ['Euskara'],
  cym: ['Cymraeg'],
  gle: ['Gaelic', 'Irish Gaelic'],
  gla: ['Gaelic'],
  mri: ['Te Reo', 'Te Reo Māori'],
  haw: ['ʻŌlelo Hawaiʻi'],
  nav: ['Diné'],
  que: ['Runasimi', 'Kichwa'],
  grn: ['Avañeʼẽ'],
  tlh: ['tlhIngan Hol'],
  tok: ['toki pona'],
  epo: ['Esperanto'],
  vol: ['Volapük'],
  jbo: ['Lojban'],
  ase: ['ASL'],
  bfi: ['BSL'],
  asf: ['Auslan'],
  sgn: ['Sign language'],
};

/** Native names that ICU does not provide (or gets wrong). */
const NATIVE = {
  ven: 'Tshivenḓa',
  tso: 'Xitsonga',
  kck: 'TjiKalanga',
  nde: 'isiNdebele',
  toi: 'Chitonga',
  ndc: 'Chindau',
  nso: 'Sesotho sa Leboa',
  grc: 'Ἑλληνική',
  lat: 'Latina',
  san: 'संस्कृतम्',
  ang: 'Ænglisc',
  non: 'Norrœnt mál',
  got: '𐌲𐌿𐍄𐌹𐍃𐌺',
  hbo: 'עִבְרִית',
  lzh: '文言',
  pli: 'पाळि',
  cop: 'ⲙⲉⲧⲣⲉⲙⲛ̀ⲭⲏⲙⲓ',
  tlh: 'tlhIngan Hol',
  tok: 'toki pona',
  twi: 'Twi',
  bem: 'IciBemba',
  loz: 'Silozi',
  lua: 'Tshiluba',
  kik: 'Gĩkũyũ',
  luo: 'Dholuo',
  mos: 'Mòoré',
  bam: 'Bamanankan',
  ful: 'Fulfulde',
  kon: 'Kikongo',
  sag: 'Sängö',
  tum: 'chiTumbuka',
  kua: 'Oshikwanyama',
  ndo: 'Oshindonga',
  her: 'Otjiherero',
};

/**
 * Learner-facing varieties to make sure appear under a language, in addition
 * to Glottolog's dialects. Keyed by ISO 639-3 code.
 */
const VARIETIES = {
  eng: [
    'American English', 'British English', 'Australian English', 'Canadian English',
    'Irish English', 'Scottish English', 'New Zealand English', 'South African English',
    'Indian English', 'Nigerian English', 'Ghanaian English', 'Kenyan English',
    'Zimbabwean English', 'Singaporean English', 'Caribbean English',
    'African American Vernacular English',
  ],
  spa: [
    'Castilian Spanish (Spain)', 'Latin American Spanish', 'Mexican Spanish',
    'Rioplatense Spanish', 'Caribbean Spanish', 'Andean Spanish', 'Colombian Spanish',
    'Chilean Spanish', 'Central American Spanish', 'Andalusian Spanish', 'Canarian Spanish',
    'Equatoguinean Spanish',
  ],
  por: [
    'Brazilian Portuguese', 'European Portuguese', 'Angolan Portuguese',
    'Mozambican Portuguese', 'Cape Verdean Portuguese',
  ],
  fra: [
    'Metropolitan French', 'Canadian French (Québécois)', 'Belgian French', 'Swiss French',
    'African French', 'Acadian French', 'Cajun French',
  ],
  deu: ['Standard German (Germany)', 'Austrian German', 'Swiss Standard German'],
  gsw: ['Swiss German (Schweizerdeutsch)'],
  ita: ['Standard Italian', 'Swiss Italian'],
  nld: ['Netherlands Dutch', 'Belgian Dutch (Flemish)', 'Surinamese Dutch'],
  kor: ['Seoul (Standard) Korean', 'Gyeongsang Korean', 'Jeolla Korean', 'North Korean (Munhwaŏ)'],
  jpn: ['Standard Japanese (Tokyo)', 'Kansai Japanese', 'Tōhoku Japanese', 'Kyūshū Japanese'],
  cmn: ['Beijing Mandarin', 'Taiwanese Mandarin', 'Singaporean Mandarin', 'Sichuanese Mandarin', 'Northeastern Mandarin'],
  yue: ['Hong Kong Cantonese', 'Guangzhou Cantonese', 'Taishanese'],
  rus: ['Standard Russian'],
  swh: ['Standard Swahili (Kiswahili Sanifu)', 'Kiunguja (Zanzibar)', 'Kimvita (Mombasa)', 'Congo Swahili'],
  sna: ['Standard Shona', 'Zezuru', 'Karanga', 'Korekore', 'Manyika', 'Budya'],
  nde: ['Standard Ndebele (Zimbabwe)'],
  hin: ['Standard Hindi', 'Hindustani', 'Bambaiya Hindi'],
  urd: ['Standard Urdu', 'Dakhini'],
  ell: ['Standard Modern Greek', 'Cypriot Greek', 'Pontic Greek'],
  arb: ['Modern Standard Arabic (Fusha)', 'Classical (Quranic) Arabic'],
  fas: ['Iranian Persian (Farsi)', 'Dari (Afghanistan)', 'Tajik'],
  tur: ['Istanbul Turkish', 'Cypriot Turkish'],
};

const L = (name, opts = {}) => ({ name, ...opts });

/** Languages that ISO 639-3 and Glottolog do not list (new, urban or fictional). */
const EXTRA_LANGUAGES = [
  // Constructed — fiction and art languages
  L('Na’vi', { native: 'Lìʼfya leNaʼvi', status: 'constructed', family: 'Artificial Language' }),
  L('Dothraki', { native: 'Lekh Dothraki', status: 'constructed', family: 'Artificial Language' }),
  L('High Valyrian', { native: 'Valyrio Udrir', status: 'constructed', family: 'Artificial Language' }),
  L('Quenya', { native: 'Quenya', status: 'constructed', family: 'Artificial Language', aliases: ['Elvish'] }),
  L('Sindarin', { native: 'Sindarin', status: 'constructed', family: 'Artificial Language', aliases: ['Elvish'] }),
  L('Kryptonian', { status: 'constructed', family: 'Artificial Language' }),
  L('Trigedasleng', { status: 'constructed', family: 'Artificial Language' }),
  L('Atlantean', { status: 'constructed', family: 'Artificial Language' }),
  L('Newspeak', { status: 'constructed', family: 'Artificial Language' }),
  L('Globasa', { status: 'constructed', family: 'Artificial Language' }),
  L('Kotava', { status: 'constructed', family: 'Artificial Language' }),
  L('Solresol', { status: 'constructed', family: 'Artificial Language' }),
  L('Ithkuil', { status: 'constructed', family: 'Artificial Language' }),
  // New urban and mixed languages
  L('Sheng', { countries: ['KE'], family: 'Mixed Language', aliases: ['Nairobi slang'] }),
  L('Engsh', { countries: ['KE'], family: 'Mixed Language' }),
  L('Tsotsitaal', { countries: ['ZA'], family: 'Mixed Language', aliases: ['Flaaitaal'] }),
  L('Iscamtho', { countries: ['ZA'], family: 'Mixed Language' }),
  L('Camfranglais', { countries: ['CM'], family: 'Mixed Language' }),
  L('Nouchi', { countries: ['CI'], family: 'Mixed Language' }),
  L('Indoubil', { countries: ['CD'], family: 'Mixed Language' }),
  L('Sheng Tanzania (Lugha ya Mitaani)', { countries: ['TZ'], family: 'Mixed Language' }),
  L('Multicultural London English', { countries: ['GB'], family: 'Indo-European', aliases: ['MLE', 'Roadman'] }),
  L('Kiezdeutsch', { countries: ['DE'], family: 'Indo-European' }),
  L('Zimbabwean Sign Language', { countries: ['ZW'], status: 'sign', family: 'Sign Language', aliases: ['ZSL'] }),
];

// ---------------------------------------------------------------------------

const download = async () => {
  mkdirSync(srcDir, { recursive: true });
  for (const [file, url] of Object.entries(SOURCES)) {
    const path = join(srcDir, file);
    if (existsSync(path)) continue;
    console.log(`Downloading ${file}…`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  }
};

const read = (file) => readFileSync(join(srcDir, file), 'utf8');

const parseTsv = (text) => {
  const [head, ...rows] = text.replace(/\r/g, '').split('\n').filter(Boolean);
  const cols = head.replace(/^﻿/, '').split('\t');
  return rows.map((r) => Object.fromEntries(r.split('\t').map((v, i) => [cols[i], v])));
};

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') row.push(field), (field = '');
    else if (c === '\n') row.push(field), rows.push(row), (row = []), (field = '');
    else if (c !== '\r') field += c;
  }
  if (field || row.length) row.push(field), rows.push(row);
  const [cols, ...data] = rows;
  return data.filter((r) => r.length > 1).map((r) => Object.fromEntries(r.map((v, i) => [cols[i], v])));
};

// Status bit flags (kept in sync with src/utils/languages.ts)
// ISO 639-3 now files ancient languages (Latin, Sumerian…) under H = historical
const S = { living: 1, extinct: 2, historical: 8, constructed: 16, sign: 32 };
const ISO_STATUS = { L: S.living, E: S.extinct, A: S.historical, H: S.historical, C: S.constructed };

const cleanIsoName = (n) => n.replace(/ \((individual language|macrolanguage)\)$/, '');

const main = async () => {
  await download();

  // --- ISO 639-3 ---------------------------------------------------------
  const iso = parseTsv(read('iso-639-3.tab')).filter((r) => r.Language_Type !== 'S');
  const byCode = new Map(); // iso3 -> entry
  const part1To3 = new Map();
  for (const r of iso) {
    if (r.Part1) part1To3.set(r.Part1, r.Id);
    byCode.set(r.Id, {
      code: r.Id,
      part1: r.Part1 || undefined,
      name: cleanIsoName(r.Ref_Name),
      status: ISO_STATUS[r.Language_Type] ?? S.living,
      macro: r.Scope === 'M',
      countries: new Set(),
      dialects: new Set(),
      aliases: new Set(),
      pop: 0,
    });
  }

  const macroOf = new Map(); // member -> macro
  for (const r of parseTsv(read('macrolanguages.tab'))) {
    if (r.I_Status === 'A' && byCode.has(r.M_Id) && byCode.has(r.I_Id)) macroOf.set(r.I_Id, r.M_Id);
  }

  // --- Glottolog -----------------------------------------------------------
  const glotto = parseCsv(read('glottolog-languages.csv'));
  const familyName = new Map(glotto.filter((r) => r.Level === 'family').map((r) => [r.ID, r.Name]));
  const SKIP_FAMILIES = new Set(['book1242', 'unat1236']);
  const familyNames = new Set(familyName.values());

  const glottoLang = new Map(); // glottocode -> entry
  for (const r of glotto) {
    if (r.Level !== 'language' || SKIP_FAMILIES.has(r.Family_ID)) continue;
    let entry = r.ISO639P3code && byCode.get(r.ISO639P3code);
    if (!entry) {
      entry = {
        code: r.Glottocode,
        name: r.Name,
        status: S.living,
        countries: new Set(),
        dialects: new Set(),
        aliases: new Set(),
        pop: 0,
      };
      byCode.set(r.Glottocode, entry);
    }
    if (r.Family_ID === 'arti1236') entry.status = S.constructed;
    if (r.Family_ID === 'sign1238') entry.status |= S.sign;
    entry.family = familyName.get(r.Family_ID) ?? (r.Is_Isolate === 'true' ? 'Isolate' : undefined);
    for (const c of r.Countries.split(';').filter(Boolean)) entry.countries.add(c);
    if (r.Name !== entry.name) entry.aliases.add(r.Name);
    glottoLang.set(r.Glottocode, entry);
  }

  // Dialects, attached to their language. Strip Glottolog's "(Family)" disambiguators.
  for (const r of glotto) {
    if (r.Level !== 'dialect') continue;
    const parent = glottoLang.get(r.Language_ID);
    if (!parent) continue;
    let name = r.Name;
    const m = name.match(/^(.*) \(([^)]+)\)$/);
    if (m && familyNames.has(m[2])) name = m[1];
    if (name.toLowerCase() !== parent.name.toLowerCase()) parent.dialects.add(name);
  }

  for (const e of byCode.values()) if (/sign language/i.test(e.name)) e.status |= S.sign;

  // --- CLDR: populations, country tags and regions --------------------------
  const territoryInfo = JSON.parse(read('territoryInfo.json')).supplemental.territoryInfo;
  for (const [country, info] of Object.entries(territoryInfo)) {
    if (!/^[A-Z]{2}$/.test(country)) continue;
    const population = Number(info._population) || 0;
    for (const [tag, lp] of Object.entries(info.languagePopulation ?? {})) {
      const base = tag.split('_')[0];
      const entry = byCode.get(part1To3.get(base) ?? base);
      if (!entry) continue;
      const pct = Number(lp._populationPercent) || 0;
      entry.pop += (population * pct) / 100;
      const official = /official/.test(lp._officialStatus ?? '');
      if (pct >= 10 || official) entry.countries.add(country);
    }
  }

  const containment = JSON.parse(read('territoryContainment.json')).supplemental.territoryContainment;
  const REGION_CODES = { '002': 'F', '019': 'A', '142': 'S', '150': 'E', '009': 'O', '145': 'M' };
  const regionOf = {}; // country -> region letter
  const walk = (code, region) => {
    for (const child of containment[code]?._contains ?? []) {
      const r = REGION_CODES[child] ?? region;
      if (/^[A-Z]{2}$/.test(child)) {
        if (!regionOf[child] || r === 'M') regionOf[child] = r;
      } else walk(child, r);
    }
  };
  for (const code of Object.keys(REGION_CODES)) walk(code, REGION_CODES[code]);
  regionOf.EG = 'F'; // Egypt: list under Africa (M49 puts it in Northern Africa already)

  // Macrolanguages inherit their members' countries and speakers
  for (const [member, macro] of macroOf) {
    const m = byCode.get(macro);
    const e = byCode.get(member);
    e.countries.forEach((c) => m.countries.add(c));
    if (!m.pop) m.family = m.family ?? e.family;
  }
  for (const [member, macro] of macroOf) {
    const m = byCode.get(macro);
    if (m._popSummed) continue;
    const members = [...macroOf].filter(([, mm]) => mm === macro).map(([c]) => byCode.get(c));
    const sum = members.reduce((s, e) => s + e.pop, 0);
    if (sum > m.pop) m.pop = sum;
    m._popSummed = true;
    void member;
  }

  // CLDR counts some speakers under the macrolanguage code (zh, fa, ms, sw…);
  // credit them to the dominant member too so it ranks correctly.
  const DOMINANT_MEMBER = { zho: 'cmn', fas: 'pes', msa: 'zsm', swa: 'swh', nor: 'nob', aka: 'twi', ori: 'ory' };
  for (const [macro, member] of Object.entries(DOMINANT_MEMBER)) {
    const m = byCode.get(macro);
    const e = byCode.get(member);
    if (m && e && !e.pop) e.pop = m.pop * 0.7;
  }

  // --- Curated layer ---------------------------------------------------------
  for (const [code, aliases] of Object.entries(ALIASES)) {
    aliases.forEach((a) => byCode.get(code)?.aliases.add(a));
  }
  for (const [code, list] of Object.entries(VARIETIES)) {
    const e = byCode.get(code);
    if (!e) continue;
    // Curated first (in the order given), then Glottolog's, without duplicates
    const seen = new Set(list.map((v) => v.toLowerCase()));
    e.dialects = new Set([...list, ...[...e.dialects].filter((d) => !seen.has(d.toLowerCase()))]);
  }
  const knownNames = new Set([...byCode.values()].map((e) => e.name.toLowerCase()));
  for (const x of EXTRA_LANGUAGES) {
    if (knownNames.has(x.name.toLowerCase())) continue; // already covered by Glottolog/ISO
    const code = 'x-' + x.name.toLowerCase().replace(/[^a-z]+/g, '-');
    byCode.set(code, {
      code,
      name: x.name,
      native: x.native,
      status: x.status === 'constructed' ? S.constructed : x.status === 'sign' ? S.living | S.sign : S.living,
      family: x.family,
      countries: new Set(x.countries ?? []),
      dialects: new Set(),
      aliases: new Set(x.aliases ?? []),
      pop: 0,
    });
  }

  // A member with the same name as its macrolanguage (e.g. Swahili ⊂ Swahili)
  // would appear twice: fold it into the macrolanguage.
  for (const [member, macro] of [...macroOf]) {
    const e = byCode.get(member);
    const m = byCode.get(macro);
    if (e.name.toLowerCase() !== m.name.toLowerCase()) continue;
    e.countries.forEach((c) => m.countries.add(c));
    e.aliases.forEach((a) => m.aliases.add(a));
    m.dialects = new Set([...m.dialects, ...e.dialects]);
    m.family = m.family ?? e.family;
    m.status |= e.status;
    m.pop = Math.max(m.pop, e.pop);
    byCode.delete(member);
    macroOf.delete(member);
  }

  // --- Native names ------------------------------------------------------
  const en = new Intl.DisplayNames(['en'], { type: 'language' });
  for (const e of byCode.values()) {
    if (e.native) continue;
    const iso3 = e.code;
    if (NATIVE[iso3]) {
      e.native = NATIVE[iso3];
      continue;
    }
    const tag = e.part1 ?? (/^[a-z]{3}$/.test(iso3) ? iso3 : null);
    if (!tag) continue;
    try {
      const own = new Intl.DisplayNames([tag], { type: 'language', fallback: 'none' }).of(tag);
      if (own && own !== tag && own !== en.of(tag) && own.toLowerCase() !== e.name.toLowerCase()) {
        e.native = own;
      }
    } catch {
      /* no locale data */
    }
  }

  // --- Output --------------------------------------------------------------
  const families = [...new Set([...byCode.values()].map((e) => e.family).filter(Boolean))].sort();
  const familyIndex = new Map(families.map((f, i) => [f, i]));

  const entries = [...byCode.values()]
    .map((e) => {
      e.aliases.delete(e.name);
      return e;
    })
    .sort((a, b) => b.pop - a.pop || a.name.localeCompare(b.name));

  // Different languages can share a name (e.g. two called "Dan"). The most
  // spoken keeps the plain name; the others get their family (or code) added.
  const taken = new Set();
  for (const e of entries) {
    const key = e.name.toLowerCase();
    if (taken.has(key)) {
      e.aliases.add(e.name);
      e.name = `${e.name} (${e.family ?? e.code})`;
      if (taken.has(e.name.toLowerCase())) e.name = `${e.name.slice(0, -1)}, ${e.code})`;
    }
    taken.add(e.name.toLowerCase());
  }

  // Compact row format — see LanguageRow in src/utils/languages.ts
  const langs = entries.map((e) => {
    const countries = [...e.countries].filter((c) => regionOf[c] || c.length === 2).sort();
    const row = [
      e.code,
      e.name,
      e.native ?? '',
      e.status,
      countries.join(' '),
      e.pop >= 1 ? Math.round(e.pop) : 0,
      e.family ? familyIndex.get(e.family) : -1,
      macroOf.get(e.code) ?? '',
      [...e.aliases].join('|'),
      [...e.dialects].join('|'),
    ];
    // Trim trailing empties to save space
    while (row.length > 4 && (row[row.length - 1] === '' || row[row.length - 1] === -1)) row.pop();
    return row;
  });

  const data = {
    generated: new Date().toISOString().slice(0, 10),
    sources: 'ISO 639-3 (SIL International); Glottolog (CC-BY 4.0); Unicode CLDR',
    families,
    regions: regionOf,
    langs,
  };
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(data));

  const count = (bit) => entries.filter((e) => e.status & bit).length;
  const dialects = entries.reduce((n, e) => n + e.dialects.size, 0);
  console.log(
    `Wrote ${entries.length} languages, ${dialects} dialects/varieties ` +
      `(living ${count(S.living)}, extinct ${count(S.extinct)}, ` +
      `historical ${count(S.historical)}, constructed ${count(S.constructed)}, sign ${count(S.sign)}) ` +
      `→ ${(JSON.stringify(data).length / 1024).toFixed(0)} KB`
  );
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
