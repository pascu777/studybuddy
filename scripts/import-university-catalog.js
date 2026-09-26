#!/usr/bin/env node

/**
 * Importa il catalogo ufficiale MUR (atenei + corsi di laurea attivi) e genera
 * supabase/seed_university_full.sql, pronto per essere eseguito nell'SQL
 * Editor di Supabase (o via psql). Fonte: dati-ustat.mur.gov.it (Open Data
 * dell'istruzione superiore). Uso: `node scripts/import-university-catalog.js`.
 */

const fs = require('fs');
const path = require('path');

const ATENEI_URL =
  'https://dati-ustat.mur.gov.it/dataset/bed0c71e-9f86-4a0f-a266-963b6f7bbbd2/resource/820aefe6-0662-4656-84ec-d8859a2a3b7e/download/01_atenei.csv';
const OFFERTA_URL =
  'https://dati-ustat.mur.gov.it/dataset/bed0c71e-9f86-4a0f-a266-963b6f7bbbd2/resource/c0e63906-7190-4568-892b-0cf399f56071/download/03_offertaformativa-corsidilaurea_2010-2025.csv';

const TARGET_YEAR = '2025';
const LEVEL_MAP = {
  Laurea: 'triennale',
  'Laurea Magistrale': 'magistrale',
  'Laurea Magistrale Ciclo Unico': 'ciclo_unico',
};

// Le 6 coppie ateneo+corso già presenti nel vecchio seed hand-typed
// (supabase/seed_university.sql) — vanno ripuntate ai corsi reali equivalenti.
const RECONCILE_TARGETS = [
  { oldId: 'dc-inf-polito', ateneo: 'Torino Politecnico', corso: 'Ingegneria Informatica' },
  { oldId: 'dc-mecc-polito', ateneo: 'Torino Politecnico', corso: 'Ingegneria Meccanica' },
  { oldId: 'dc-mat-unito', ateneo: 'Torino', corso: 'Matematica' },
  { oldId: 'dc-fis-unito', ateneo: 'Torino', corso: 'Fisica' },
  { oldId: 'dc-eco-unito', ateneo: 'Torino', corso: 'Economia' },
  { oldId: 'dc-inf-unipi', ateneo: 'Pisa', corso: 'Informatica' },
];

// Alcune righe del CSV MUR (anni più vecchi, probabile copia-incolla da Word/Excel)
// contengono singoli byte Windows-1252 (apostrofi tipografici, "à") in mezzo a un file
// altrimenti UTF-8 valido. TextDecoder('utf-8') li sostituirebbe con "�" (U+FFFD):
// qui invece ogni sequenza UTF-8 non valida viene reinterpretata byte-per-byte come
// Windows-1252, recuperando il carattere originale invece di perderlo.
const CP1252_HIGH = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…',
  0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š',
  0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘', 0x92: '’',
  0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—',
  0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ',
  0x9e: 'ž', 0x9f: 'Ÿ',
};
const cp1252Char = (b) => CP1252_HIGH[b] ?? String.fromCharCode(b);

function decodeUtf8LooseCp1252(buf) {
  let out = '';
  const n = buf.length;
  let i = 0;
  while (i < n) {
    const b0 = buf[i];
    if (b0 < 0x80) {
      out += String.fromCharCode(b0);
      i++;
      continue;
    }
    let len = 0;
    let cp = 0;
    let min = 0;
    if ((b0 & 0xe0) === 0xc0) { len = 2; cp = b0 & 0x1f; min = 0x80; }
    else if ((b0 & 0xf0) === 0xe0) { len = 3; cp = b0 & 0x0f; min = 0x800; }
    else if ((b0 & 0xf8) === 0xf0) { len = 4; cp = b0 & 0x07; min = 0x10000; }
    else {
      out += cp1252Char(b0);
      i++;
      continue;
    }
    if (i + len > n) {
      out += cp1252Char(b0);
      i++;
      continue;
    }
    let valid = true;
    let cur = cp;
    for (let k = 1; k < len; k++) {
      const bk = buf[i + k];
      if ((bk & 0xc0) !== 0x80) { valid = false; break; }
      cur = (cur << 6) | (bk & 0x3f);
    }
    if (!valid || cur < min) {
      out += cp1252Char(b0);
      i++;
      continue;
    }
    if (len === 4) {
      const c2 = cur - 0x10000;
      out += String.fromCharCode(0xd800 + (c2 >> 10), 0xdc00 + (c2 & 0x3ff));
    } else {
      out += String.fromCharCode(cur);
    }
    i += len;
  }
  return out.replace(/^﻿/, ''); // BOM UTF-8 iniziale, se presente
}

async function fetchDecoded(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} su ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return decodeUtf8LooseCp1252(buf);
}

/** Parser CSV a caratteri, delimitatore ';', campi tra virgolette in stile RFC4180. */
function parseCsv(text) {
  const records = [];
  let field = '';
  let record = [];
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  const pushField = () => {
    record.push(field);
    field = '';
  };
  const pushRecord = () => {
    pushField();
    records.push(record);
    record = [];
  };

  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ';') {
      pushField();
      i++;
      continue;
    }
    if (c === '\r') {
      i++;
      continue;
    }
    if (c === '\n') {
      pushRecord();
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length || record.length) pushRecord();

  const nonEmpty = records.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
  const header = nonEmpty[0].map((h) => h.trim());
  const rows = [];
  for (let r = 1; r < nonEmpty.length; r++) {
    const cols = nonEmpty[r];
    if (cols.length !== header.length) continue; // riga malformata, scartata
    const row = {};
    header.forEach((h, idx) => (row[h] = (cols[idx] ?? '').trim()));
    rows.push(row);
  }
  return rows;
}

function sqlEscape(s) {
  return String(s ?? '').replace(/'/g, "''");
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // rimuove accenti
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function titleCase(s) {
  return String(s)
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Raggruppa righe già formattate (stringa per riga) in batch di al più maxChars caratteri. */
function chunkByChars(lines, maxChars) {
  const out = [];
  let cur = [];
  let curLen = 0;
  for (const line of lines) {
    if (cur.length && curLen + line.length + 1 > maxChars) {
      out.push(cur);
      cur = [];
      curLen = 0;
    }
    cur.push(line);
    curLen += line.length + 1;
  }
  if (cur.length) out.push(cur);
  return out;
}

async function main() {
  console.log('Scarico 01_atenei.csv...');
  const ateneiRows = parseCsv(await fetchDecoded(ATENEI_URL));
  console.log(`  ${ateneiRows.length} righe.`);

  console.log('Scarico 03_offertaformativa-corsidilaurea_2010-2025.csv (~16MB)...');
  const offertaRows = parseCsv(await fetchDecoded(OFFERTA_URL));
  console.log(`  ${offertaRows.length} righe totali.`);

  // --- Università (attive) -------------------------------------------------
  const activeAtenei = ateneiRows.filter((r) => r.Status === 'A');
  const nomeOperativoToId = new Map();
  for (const r of activeAtenei) {
    nomeOperativoToId.set(r.NomeOperativo.trim(), r.COD_Ateneo);
  }

  const universities = activeAtenei.map((r) => ({
    id: r.COD_Ateneo,
    name: r.NomeEsteso,
    city: titleCase(r.CITTA || ''),
  }));

  // --- Corsi di laurea (anno più recente, tipi correnti) -------------------
  const offerta2025 = offertaRows.filter(
    (r) => r.ANNO === TARGET_YEAR && LEVEL_MAP[r.TipoCorso],
  );
  console.log(`  ${offerta2025.length} corsi attivi per l'anno ${TARGET_YEAR}.`);

  const unmatched = new Set();
  const usedIds = new Map(); // slug base -> contatore
  const degreeCourses = [];
  const reconcileLookup = new Map(); // "ateneo|corso" -> id generato (primo match)

  for (const r of offerta2025) {
    const universityId = nomeOperativoToId.get(r.Ateneo.trim());
    if (!universityId) {
      unmatched.add(r.Ateneo);
      continue;
    }
    const base = `${universityId}-${slugify(r.Classe)}-${slugify(r.Corso)}`;
    const n = (usedIds.get(base) ?? 0) + 1;
    usedIds.set(base, n);
    const id = n === 1 ? base : `${base}-${n}`;

    degreeCourses.push({
      id,
      university_id: universityId,
      name: r.Corso,
      level: LEVEL_MAP[r.TipoCorso],
    });

    const lookupKey = `${r.Ateneo.trim()}|${r.Corso.trim().toLowerCase()}`;
    const isTriennale = LEVEL_MAP[r.TipoCorso] === 'triennale';
    const existing = reconcileLookup.get(lookupKey);
    if (!existing || (isTriennale && !existing.triennale)) {
      reconcileLookup.set(lookupKey, { id, triennale: isTriennale });
    }
  }

  if (unmatched.size) {
    console.warn(
      `\nATTENZIONE — ${unmatched.size} nomi Ateneo nell'offerta formativa non trovati in 01_atenei.csv (corsi scartati):`,
    );
    console.warn('  ' + Array.from(unmatched).sort().join(', '));
  }

  // --- Riconciliazione con i 6 corsi hand-seeded ---------------------------
  console.log('\nRiconciliazione con il vecchio seed_university.sql:');
  const reconcileSql = [];
  for (const t of RECONCILE_TARGETS) {
    const key = `${t.ateneo}|${t.corso.toLowerCase()}`;
    const found = reconcileLookup.get(key);
    const newId = found && found.id;
    if (!newId) {
      console.warn(`  NON TROVATO: ${t.oldId} (${t.ateneo} / ${t.corso}) — resta invariato.`);
      continue;
    }
    console.log(`  ${t.oldId} -> ${newId}`);
    reconcileSql.push(
      `update public.courses set degree_course_id = '${sqlEscape(newId)}' where degree_course_id = '${sqlEscape(t.oldId)}';`,
    );
  }

  // --- Genera SQL -----------------------------------------------------------
  const out = [];
  out.push('-- StudyBuddy — catalogo universitario reale (fonte: dati-ustat.mur.gov.it,');
  out.push(`-- Open Data MUR, offerta formativa anno ${TARGET_YEAR}). Generato da`);
  out.push('-- scripts/import-university-catalog.js — non modificare a mano, rigenerare.');
  out.push('');

  out.push('insert into public.universities (id, name, city) values');
  out.push(
    universities
      .map((u) => `  ('${sqlEscape(u.id)}', '${sqlEscape(u.name)}', '${sqlEscape(u.city)}')`)
      .join(',\n') + '',
  );
  out[out.length - 1] += '\non conflict (id) do update set name = excluded.name, city = excluded.city;';
  out.push('');

  const dcLines = degreeCourses.map(
    (d) =>
      `  ('${sqlEscape(d.id)}', '${sqlEscape(d.university_id)}', '${sqlEscape(d.name)}', '${d.level}')`,
  );
  for (const batch of chunkByChars(dcLines, 27000)) {
    out.push('insert into public.degree_courses (id, university_id, name, level) values');
    out.push(batch.join(',\n'));
    out[out.length - 1] +=
      '\non conflict (id) do update set university_id = excluded.university_id, name = excluded.name, level = excluded.level;';
    out.push('');
  }

  if (reconcileSql.length) {
    out.push('-- Ripunta gli esami hand-seeded ai corsi di laurea reali equivalenti.');
    out.push(...reconcileSql);
    out.push('');
    out.push('-- Rimuove i corsi/atenei placeholder ormai sostituiti dai dati reali.');
    out.push(
      "delete from public.degree_courses where id in ('dc-inf-polito','dc-mecc-polito','dc-mat-unito','dc-fis-unito','dc-eco-unito','dc-inf-unipi');",
    );
    out.push("delete from public.universities where id in ('unito','polito','unipi','unimi');");
    out.push('');
  }

  const outPath = path.join(__dirname, '..', 'supabase', 'seed_university_full.sql');
  fs.writeFileSync(outPath, out.join('\n'), 'utf8');

  console.log(`\nScritto ${outPath}`);
  console.log(`  ${universities.length} atenei, ${degreeCourses.length} corsi di laurea.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
