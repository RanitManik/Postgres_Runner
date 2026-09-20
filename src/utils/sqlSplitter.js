/**
 * Robust SQL Statement Splitter
 * Splits a SQL script into individual statements while respecting:
 * - Single-quoted string literals ('...')
 * - Escaped single quotes ('It''s')
 * - Double-quoted identifiers ("my_table")
 * - Dollar-quoted strings ($$body$$, $tag$body$tag$)
 * - Single-line comments (-- comment)
 * - Multi-line comments (/* comment * /)
 */

export function splitSqlStatements(sql) {
  if (!sql || typeof sql !== 'string') return [];

  const statements = [];
  let current = '';
  let i = 0;
  const len = sql.length;

  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag = null; // null or string like '$$' or '$body$'

  while (i < len) {
    const char = sql[i];
    const nextChar = i + 1 < len ? sql[i + 1] : '';

    // Handle line comments
    if (inLineComment) {
      current += char;
      if (char === '\n') {
        inLineComment = false;
      }
      i++;
      continue;
    }

    // Handle block comments
    if (inBlockComment) {
      current += char;
      if (char === '*' && nextChar === '/') {
        current += nextChar;
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    // Handle dollar-quoted strings ($$...$$ or $tag$...$tag$)
    if (dollarTag !== null) {
      current += char;
      if (char === '$' && sql.startsWith(dollarTag, i)) {
        current += dollarTag.slice(1);
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      i++;
      continue;
    }

    // Handle single quotes
    if (inSingleQuote) {
      current += char;
      if (char === "'") {
        if (nextChar === "'") {
          // Escaped quote: ''
          current += nextChar;
          i += 2;
          continue;
        } else {
          inSingleQuote = false;
        }
      }
      i++;
      continue;
    }

    // Handle double quotes
    if (inDoubleQuote) {
      current += char;
      if (char === '"') {
        inDoubleQuote = false;
      }
      i++;
      continue;
    }

    // Check for comment starts
    if (char === '-' && nextChar === '-') {
      inLineComment = true;
      current += char + nextChar;
      i += 2;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      current += char + nextChar;
      i += 2;
      continue;
    }

    // Check for string starts
    if (char === "'") {
      inSingleQuote = true;
      current += char;
      i++;
      continue;
    }

    if (char === '"') {
      inDoubleQuote = true;
      current += char;
      i++;
      continue;
    }

    // Check for dollar quote start (e.g. $$ or $tag$)
    if (char === '$') {
      const match = sql.slice(i).match(/^\$([a-zA-Z0-9_]*)\$/);
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }

    // Statement terminator
    if (char === ';') {
      const trimmed = current.trim();
      if (trimmed) {
        statements.push(trimmed);
      }
      current = '';
      i++;
      continue;
    }

    current += char;
    i++;
  }

  const remaining = current.trim();
  if (remaining) {
    statements.push(remaining);
  }

  return statements;
}

/**
 * Categorize a SQL statement for UI badges (e.g., SELECT, CREATE, INSERT, UPDATE)
 */
export function getStatementType(sql) {
  if (!sql) return 'QUERY';
  // Strip leading comments and whitespace
  const clean = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  const firstWord = clean.split(/\s+/)[0]?.toUpperCase() || 'QUERY';
  
  if (firstWord === 'CREATE') {
    const secondWord = clean.split(/\s+/)[1]?.toUpperCase();
    return secondWord ? `CREATE ${secondWord}` : 'CREATE';
  }
  if (firstWord === 'DROP') {
    const secondWord = clean.split(/\s+/)[1]?.toUpperCase();
    return secondWord ? `DROP ${secondWord}` : 'DROP';
  }
  if (firstWord === 'ALTER') {
    const secondWord = clean.split(/\s+/)[1]?.toUpperCase();
    return secondWord ? `ALTER ${secondWord}` : 'ALTER';
  }
  return firstWord;
}
