import { PGlite } from '@electric-sql/pglite';
import { splitSqlStatements, getStatementType } from '../utils/sqlSplitter.js';

// Mapping of common PostgreSQL data type OIDs to readable names
const PG_TYPE_MAP = {
  16: 'BOOLEAN',
  17: 'BYTEA',
  18: 'CHAR',
  19: 'NAME',
  20: 'BIGINT',
  21: 'SMALLINT',
  23: 'INTEGER',
  25: 'TEXT',
  114: 'JSON',
  142: 'XML',
  700: 'REAL',
  701: 'DOUBLE PRECISION',
  1042: 'CHAR',
  1043: 'VARCHAR',
  1082: 'DATE',
  1083: 'TIME',
  1114: 'TIMESTAMP',
  1184: 'TIMESTAMPTZ',
  1186: 'INTERVAL',
  1700: 'NUMERIC',
  2950: 'UUID',
  3802: 'JSONB'
};

export class PGliteEngine {
  constructor() {
    this.pg = null;
    this.currentProjectId = null;
    this.isReady = false;
    this.isExecuting = false;
  }

  /**
   * Initialize or switch database instance for a given project ID
   * Uses IndexedDB for browser persistence across reloads
   */
  async initProject(projectId) {
    if (this.currentProjectId === projectId && this.pg && this.isReady) {
      return this.pg;
    }

    if (this.pg) {
      try {
        await this.pg.close();
      } catch (e) {
        console.warn('Error closing previous PGlite instance:', e);
      }
      this.pg = null;
      this.isReady = false;
    }

    this.currentProjectId = projectId;
    const dbName = `idb://pg_runner_db_${projectId}`;

    try {
      this.pg = new PGlite(dbName);
      await this.pg.waitReady;
      this.isReady = true;
      return this.pg;
    } catch (err) {
      console.error('Failed to initialize PGlite with IndexedDB:', err);
      // Fallback to in-memory if IndexedDB fails in private mode
      console.warn('Falling back to in-memory PGlite instance');
      this.pg = new PGlite();
      await this.pg.waitReady;
      this.isReady = true;
      return this.pg;
    }
  }

  /**
   * Execute SQL script with multi-statement support
   */
  async executeScript(sql) {
    if (!this.pg || !this.isReady) {
      throw new Error('Database is not initialized yet. Please wait...');
    }

    const trimmedSql = (sql || '').trim();
    if (!trimmedSql) {
      return {
        success: true,
        statements: [],
        results: [],
        totalDuration: 0,
        isEmpty: true
      };
    }

    const statements = splitSqlStatements(trimmedSql);
    this.isExecuting = true;
    const startTime = performance.now();

    try {
      // Execute through PGlite's multi-statement exec
      const execResults = await this.pg.exec(trimmedSql);
      const totalDuration = Math.round((performance.now() - startTime) * 100) / 100;

      // Match each statement with its result
      const parsedResults = statements.map((stmt, idx) => {
        const rawRes = execResults[idx] || { rows: [], affectedRows: 0, fields: [] };
        const stmtType = getStatementType(stmt);

        // Map column data types
        const fields = (rawRes.fields || []).map((f) => ({
          name: f.name,
          dataTypeID: f.dataTypeID,
          dataType: PG_TYPE_MAP[f.dataTypeID] || 'UNKNOWN'
        }));

        const isSelect = stmtType === 'SELECT' || (rawRes.rows && rawRes.rows.length > 0 && fields.length > 0);

        return {
          statementIndex: idx,
          sql: stmt,
          type: stmtType,
          isSelect,
          rows: rawRes.rows || [],
          fields,
          affectedRows: rawRes.affectedRows ?? 0,
          rowCount: rawRes.rows ? rawRes.rows.length : 0
        };
      });

      return {
        success: true,
        statements,
        results: parsedResults,
        totalDuration,
        statementCount: statements.length
      };
    } catch (error) {
      const totalDuration = Math.round((performance.now() - startTime) * 100) / 100;
      const diagnosis = this.analyzeError(error, trimmedSql);

      return {
        success: false,
        error: {
          message: error.message || String(error),
          line: diagnosis.line,
          column: diagnosis.column,
          position: error.position,
          snippet: diagnosis.snippet,
          code: error.code,
          hint: diagnosis.hint,
          friendlyExplanation: diagnosis.friendlyExplanation
        },
        totalDuration
      };
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Introspect user tables, columns, and data counts in the public schema
   */
  async fetchSchema() {
    if (!this.pg || !this.isReady) return { tables: [], views: [] };

    try {
      // 1. Get all user tables and views
      const tablesRes = await this.pg.query(`
        SELECT 
          table_name,
          table_type
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);

      const tablesList = tablesRes.rows || [];
      const tables = [];
      const views = [];

      // 2. Fetch columns and row counts for each table
      for (const t of tablesList) {
        const tableName = t.table_name;
        const isView = t.table_type === 'VIEW';

        // Fetch columns with primary key information
        const columnsRes = await this.pg.query(`
          SELECT 
            c.column_name, 
            c.data_type, 
            c.is_nullable, 
            c.column_default,
            (
              SELECT count(*) > 0
              FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
              WHERE tc.constraint_type = 'PRIMARY KEY'
                AND tc.table_name = c.table_name
                AND kcu.column_name = c.column_name
            ) AS is_primary
          FROM information_schema.columns c
          WHERE c.table_schema = 'public' AND c.table_name = $1
          ORDER BY c.ordinal_position;
        `, [tableName]);

        // Get row count
        let rowCount = 0;
        try {
          // Quote table name to prevent SQL injection in internal query
          const countRes = await this.pg.query(`SELECT COUNT(*) as cnt FROM "${tableName.replace(/"/g, '""')}";`);
          rowCount = parseInt(countRes.rows[0]?.cnt || 0, 10);
        } catch (cntErr) {
          rowCount = 0;
        }

        const tableItem = {
          name: tableName,
          type: t.table_type,
          rowCount,
          columns: (columnsRes.rows || []).map((col) => ({
            name: col.column_name,
            dataType: col.data_type,
            isNullable: col.is_nullable === 'YES',
            defaultValue: col.column_default,
            isPrimary: Boolean(col.is_primary)
          }))
        };

        if (isView) {
          views.push(tableItem);
        } else {
          tables.push(tableItem);
        }
      }

      return { tables, views };
    } catch (err) {
      console.warn('Error inspecting schema:', err);
      return { tables: [], views: [] };
    }
  }

  /**
   * Reset the current database by dropping all tables, views, and sequences in public schema
   */
  async resetDatabase() {
    if (!this.pg || !this.isReady) return false;

    const resetSql = `
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS "public"."' || r.tablename || '" CASCADE';
        END LOOP;
        FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
          EXECUTE 'DROP SEQUENCE IF EXISTS "public"."' || r.sequence_name || '" CASCADE';
        END LOOP;
        FOR r IN (SELECT table_name FROM information_schema.views WHERE table_schema = 'public') LOOP
          EXECUTE 'DROP VIEW IF EXISTS "public"."' || r.table_name || '" CASCADE';
        END LOOP;
      END $$;
    `;

    await this.pg.exec(resetSql);
    return true;
  }

  /**
   * Export all tables in the current project as a SQL script with CREATE TABLE and INSERT statements
   */
  async exportSqlDump() {
    if (!this.pg || !this.isReady) return '';

    const schema = await this.fetchSchema();
    let dump = `-- PostgreSQL Runner Database Export\n-- Generated on: ${new Date().toISOString()}\n\n`;

    for (const table of schema.tables) {
      dump += `-- Table: ${table.name}\n`;
      const colDefs = table.columns.map(c => {
        let def = `  "${c.name}" ${c.dataType.toUpperCase()}`;
        if (c.isPrimary) def += ' PRIMARY KEY';
        else if (!c.isNullable) def += ' NOT NULL';
        if (c.defaultValue) def += ` DEFAULT ${c.defaultValue}`;
        return def;
      }).join(',\n');

      dump += `CREATE TABLE IF NOT EXISTS "${table.name}" (\n${colDefs}\n);\n\n`;

      // Fetch all rows
      try {
        const rowsRes = await this.pg.query(`SELECT * FROM "${table.name.replace(/"/g, '""')}";`);
        if (rowsRes.rows && rowsRes.rows.length > 0) {
          const colNames = table.columns.map(c => `"${c.name}"`).join(', ');
          dump += `INSERT INTO "${table.name}" (${colNames}) VALUES\n`;
          const valueRows = rowsRes.rows.map(row => {
            const vals = table.columns.map(c => {
              const val = row[c.name];
              if (val === null || val === undefined) return 'NULL';
              if (typeof val === 'number') return val;
              if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
              if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
              return `'${String(val).replace(/'/g, "''")}'`;
            }).join(', ');
            return `  (${vals})`;
          });
          dump += valueRows.join(',\n') + ';\n\n';
        }
      } catch (e) {
        console.warn('Dump rows error:', e);
      }
    }

    return dump;
  }

  /**
   * Beginner-friendly error analyzer
   */
  analyzeError(error, sql) {
    const msg = error.message || String(error);
    let friendlyExplanation = '';
    let hint = '';
    let line = null;
    let column = null;
    let snippet = '';

    // Check for line indicator in error message
    const lineMatch = msg.match(/LINE (\d+):/i) || msg.match(/at line (\d+)/i) || msg.match(/line (\d+)/i);
    if (lineMatch) {
      line = parseInt(lineMatch[1], 10);
    }

    // Check if error has character offset or position
    const charMatch = msg.match(/character (\d+)/i) || msg.match(/at position (\d+)/i);
    const rawPos = error.position || (charMatch ? parseInt(charMatch[1], 10) : null);
    if (!line && rawPos && sql) {
      const pos = parseInt(rawPos, 10);
      if (!isNaN(pos) && pos > 0) {
        const textBefore = sql.substring(0, pos - 1);
        const splitLines = textBefore.split('\n');
        line = splitLines.length;
        column = splitLines[splitLines.length - 1].length + 1;
      }
    }

    // If syntax error at end of input, point to the last non-empty line of the query
    if (!line && msg.includes('syntax error at end of input') && sql) {
      const lines = sql.split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim()) {
          line = i + 1;
          break;
        }
      }
    }

    // Extract snippet of code at line
    if (line && sql) {
      const sqlLines = sql.split('\n');
      if (line <= sqlLines.length) {
        snippet = sqlLines[line - 1].trim();
      }
    }

    if (msg.includes('already exists')) {
      const relationMatch = msg.match(/relation "([^"]+)" already exists/);
      const name = relationMatch ? relationMatch[1] : 'this object';
      friendlyExplanation = `The table or object "${name}" is already in your database. Remember: your data is persistently saved in your browser!`;
      hint = `To recreate it, add IF NOT EXISTS (e.g. CREATE TABLE IF NOT EXISTS ${name} ...), drop it first with DROP TABLE ${name};, or click "Reset DB" in the top bar.`;
    } else if (msg.includes('does not exist')) {
      const relationMatch = msg.match(/relation "([^"]+)" does not exist/);
      const name = relationMatch ? relationMatch[1] : 'the table';
      friendlyExplanation = `PostgreSQL could not find "${name}". It might not have been created yet, or the spelling/capitalization is different.`;
      hint = `Make sure you ran the CREATE TABLE statement for "${name}" first, or check the Schema Explorer in the left sidebar to see all available tables.`;
    } else if (msg.includes('column') && msg.includes('does not exist')) {
      friendlyExplanation = `The column name you referenced does not exist in the specified table.`;
      hint = `Check for typos or look up the table's column names in the Schema Explorer on the left.`;
    } else if (msg.includes('syntax error at end of input')) {
      friendlyExplanation = `PostgreSQL reached the end of your SQL statement unexpectedly. This usually happens when a query was cut short, or is missing a closing token.`;
      hint = `Check the end of your query to ensure all expressions, clauses, or parentheses are fully completed.`;
    } else if (msg.includes('syntax error')) {
      friendlyExplanation = `PostgreSQL encountered a syntax error at line ${line || 1}.`;
      hint = `Look out for: missing semicolons (;) between statements, missing commas between columns, or unmatched parentheses.`;
    } else if (msg.includes('duplicate key value violates unique constraint')) {
      friendlyExplanation = `You tried to insert a row with an ID or value that already exists in a PRIMARY KEY or UNIQUE column.`;
      hint = `Use a different unique value, or use ON CONFLICT DO UPDATE / DO NOTHING.`;
    } else if (msg.includes('null value in column') && msg.includes('violates not-null constraint')) {
      friendlyExplanation = `A required column was left empty or set to NULL.`;
      hint = `Provide a non-null value for this column when inserting or updating rows.`;
    } else {
      friendlyExplanation = `An error occurred while executing the SQL statement.`;
      hint = `Review the error message above for specific details from PostgreSQL.`;
    }

    return { friendlyExplanation, hint, line, column, snippet };
  }
}

export const dbEngine = new PGliteEngine();
