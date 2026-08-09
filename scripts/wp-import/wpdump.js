// Streaming reader for a phpMyAdmin/mysqldump file.
// Yields {table, cols, row} for every tuple of the tables asked for, without
// ever holding the whole dump (194MB) in memory.
const fs = require('fs');
const readline = require('readline');

// MySQL string escapes, as emitted by mysqldump.
const UNESC = { '0': '\0', b: '\b', n: '\n', r: '\r', t: '\t', Z: '\x1a', '\\': '\\', "'": "'", '"': '"' };

// Walks one VALUES section and returns an array of row arrays. Quote-aware, so
// a comma or bracket inside post_content cannot split a row.
function parseTuples(s) {
  const rows = [];
  let i = 0;
  const n = s.length;
  while (i < n) {
    while (i < n && s[i] !== '(') i++;
    if (i >= n) break;
    i++; // past '('
    const row = [];
    let cur = '';
    let quoted = false;
    let started = false;
    for (; i < n; i++) {
      const c = s[i];
      if (quoted) {
        if (c === '\\') {
          const nx = s[++i];
          cur += UNESC[nx] !== undefined ? UNESC[nx] : nx;
        } else if (c === "'") {
          quoted = false;
        } else cur += c;
        continue;
      }
      // Reset at the opening quote: the whitespace mysqldump puts after each
      // comma would otherwise be prepended to the value, so 'attachment' came
      // through as ' attachment' and every equality test failed.
      if (c === "'") { quoted = true; started = true; cur = ''; continue; }
      if (c === ',') { row.push(started ? cur : (cur.trim() === 'NULL' ? null : cur.trim())); cur = ''; started = false; continue; }
      if (c === ')') { row.push(started ? cur : (cur.trim() === 'NULL' ? null : cur.trim())); i++; break; }
      cur += c;
    }
    rows.push(row);
    // skip to the next tuple or the statement end
    while (i < n && s[i] !== '(' && s[i] !== ';') i++;
    if (i < n && s[i] === ';') break;
  }
  return rows;
}

async function scan(file, wanted, onRow) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  let table = null, cols = null, buf = '';
  const flush = () => {
    if (!table || !buf) return;
    for (const row of parseTuples(buf)) {
      const o = {};
      cols.forEach((c, i) => { o[c] = row[i]; });
      onRow(table, o);
    }
    buf = '';
  };
  for await (const line of rl) {
    const m = line.match(/^INSERT INTO `([A-Za-z0-9_]+)` \(([^)]*)\) VALUES/);
    if (m) {
      flush();
      table = wanted.has(m[1]) ? m[1] : null;
      cols = table ? m[2].split(',').map((c) => c.trim().replace(/`/g, '')) : null;
      const rest = line.slice(m[0].length);
      if (table && rest.trim()) buf += rest;
      continue;
    }
    if (!table) continue;
    buf += '\n' + line;
    if (line.trimEnd().endsWith(';')) flush();
  }
  flush();
  rl.close();
}

module.exports = { scan };
