import * as monaco from 'monaco-editor';
import { format as formatSql } from 'sql-formatter';
import { editorSettings } from '../state/editorSettings.js';

// Setup worker environment for Vite / ESM
self.MonacoEnvironment = {
  getWorker: function (_moduleId, label) {
    return new Worker(
      new URL('./editor.worker.js', import.meta.url),
      { type: 'module' }
    );
  }
};

let editorInstance = null;
let schemaCompletionDisposable = null;
let currentSchema = { tables: [] };

// 1. Postgres Dark Theme
monaco.editor.defineTheme('postgres-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: '38bdf8', fontStyle: 'bold' },
    { token: 'keyword.sql', foreground: '38bdf8', fontStyle: 'bold' },
    { token: 'operator.sql', foreground: '93c5fd' },
    { token: 'string.sql', foreground: '86efac' },
    { token: 'number', foreground: 'fde047' },
    { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
    { token: 'predefined.sql', foreground: 'c084fc' },
    { token: 'type.sql', foreground: 'f472b6' }
  ],
  colors: {
    'editor.background': '#090d16',
    'editor.foreground': '#f1f5f9',
    'editorLineNumber.foreground': '#334155',
    'editorLineNumber.activeForeground': '#38bdf8',
    'editor.selectionBackground': '#0284c733',
    'editor.inactiveSelectionBackground': '#0284c71a',
    'editorCursor.foreground': '#38bdf8',
    'editorIndentGuide.background1': '#1e293b',
    'editorIndentGuide.activeBackground1': '#334155',
    'editor.lineHighlightBackground': '#141d2e50',
    'editorWidget.background': '#0f172a',
    'editorWidget.border': '#334155'
  }
});

// 2. Cyberpunk Neon Theme
monaco.editor.defineTheme('cyberpunk-neon', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: '06b6d4', fontStyle: 'bold' },
    { token: 'keyword.sql', foreground: '06b6d4', fontStyle: 'bold' },
    { token: 'operator.sql', foreground: 'f43f5e' },
    { token: 'string.sql', foreground: 'a3e635' },
    { token: 'number', foreground: 'f59e0b' },
    { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
    { token: 'predefined.sql', foreground: 'e879f9' },
    { token: 'type.sql', foreground: 'fb7185' }
  ],
  colors: {
    'editor.background': '#05070d',
    'editor.foreground': '#f8fafc',
    'editorLineNumber.foreground': '#374151',
    'editorLineNumber.activeForeground': '#06b6d4',
    'editor.selectionBackground': '#f43f5e30',
    'editorCursor.foreground': '#06b6d4',
    'editorIndentGuide.background1': '#1f2937',
    'editor.lineHighlightBackground': '#11182740',
    'editorWidget.background': '#0b0f19',
    'editorWidget.border': '#ec4899'
  }
});

// 3. Slate Clean Theme
monaco.editor.defineTheme('slate-clean', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: '60a5fa', fontStyle: 'bold' },
    { token: 'keyword.sql', foreground: '60a5fa', fontStyle: 'bold' },
    { token: 'operator.sql', foreground: '94a3b8' },
    { token: 'string.sql', foreground: '4ade80' },
    { token: 'number', foreground: 'fbbf24' },
    { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
    { token: 'predefined.sql', foreground: 'a78bfa' },
    { token: 'type.sql', foreground: 'f87171' }
  ],
  colors: {
    'editor.background': '#0f172a',
    'editor.foreground': '#e2e8f0',
    'editorLineNumber.foreground': '#475569',
    'editorLineNumber.activeForeground': '#60a5fa',
    'editor.selectionBackground': '#3b82f630',
    'editorCursor.foreground': '#60a5fa',
    'editorIndentGuide.background1': '#1e293b',
    'editor.lineHighlightBackground': '#1e293b60',
    'editorWidget.background': '#1e293b',
    'editorWidget.border': '#334155'
  }
});

// 4. Modern Light Theme (Clean Startup Aesthetic)
monaco.editor.defineTheme('postgres-light', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: '0284c7', fontStyle: 'bold' },
    { token: 'keyword.sql', foreground: '0284c7', fontStyle: 'bold' },
    { token: 'operator.sql', foreground: '2563eb' },
    { token: 'string.sql', foreground: '16a34a' },
    { token: 'number', foreground: 'd97706' },
    { token: 'comment', foreground: '94a3b8', fontStyle: 'italic' },
    { token: 'predefined.sql', foreground: '7c3aed' },
    { token: 'type.sql', foreground: 'db2777' }
  ],
  colors: {
    'editor.background': '#f8fafc',
    'editor.foreground': '#0f172a',
    'editorLineNumber.foreground': '#94a3b8',
    'editorLineNumber.activeForeground': '#0284c7',
    'editor.selectionBackground': '#bae6fd66',
    'editorCursor.foreground': '#0284c7',
    'editorIndentGuide.background1': '#e2e8f0',
    'editorIndentGuide.activeBackground1': '#cbd5e1',
    'editor.lineHighlightBackground': '#f1f5f990',
    'editorWidget.background': '#ffffff',
    'editorWidget.border': '#e2e8f0'
  }
});

const PG_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
  'CREATE', 'TABLE', 'ALTER', 'DROP', 'TRUNCATE', 'JOIN', 'INNER JOIN', 'LEFT JOIN',
  'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN', 'ON', 'AND', 'OR', 'NOT', 'IN', 'IS NULL',
  'IS NOT NULL', 'LIKE', 'ILIKE', 'BETWEEN', 'GROUP BY', 'HAVING', 'ORDER BY',
  'ASC', 'DESC', 'LIMIT', 'OFFSET', 'DISTINCT', 'AS', 'CASE', 'WHEN', 'THEN',
  'ELSE', 'END', 'UNION', 'ALL', 'EXISTS', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  'COALESCE', 'NULLIF', 'GENERATE_SERIES', 'UNNEST', 'PRIMARY KEY', 'FOREIGN KEY',
  'REFERENCES', 'CHECK', 'UNIQUE', 'DEFAULT', 'SERIAL', 'BIGSERIAL', 'INT', 'INTEGER',
  'BIGINT', 'SMALLINT', 'TEXT', 'VARCHAR', 'BOOLEAN', 'NUMERIC', 'DECIMAL', 'DATE',
  'TIMESTAMP', 'TIMESTAMPTZ', 'INTERVAL', 'JSONB', 'JSON', 'ARRAY', 'RETURNING',
  'ON CONFLICT', 'DO NOTHING', 'DO UPDATE', 'CASCADE', 'RESTRICT', 'ROW_NUMBER',
  'RANK', 'DENSE_RANK', 'OVER', 'PARTITION BY', 'WINDOW', 'EXPLAIN', 'ANALYZE'
];

function registerCompletions() {
  if (schemaCompletionDisposable) {
    schemaCompletionDisposable.dispose();
  }

  schemaCompletionDisposable = monaco.languages.registerCompletionItemProvider('sql', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      const suggestions = [];

      for (const kw of PG_KEYWORDS) {
        suggestions.push({
          label: kw,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: kw,
          range
        });
      }

      if (currentSchema && currentSchema.tables) {
        for (const table of currentSchema.tables) {
          suggestions.push({
            label: table.name,
            kind: monaco.languages.CompletionItemKind.Class,
            detail: `Table (${table.rowCount} rows)`,
            insertText: table.name,
            range
          });

          for (const col of table.columns || []) {
            suggestions.push({
              label: `${col.name}`,
              kind: monaco.languages.CompletionItemKind.Field,
              detail: `${table.name}.${col.name} (${col.dataType})`,
              insertText: col.name,
              range
            });
          }
        }
      }

      return { suggestions };
    }
  });
}

/**
 * Initialize Monaco Editor with settings from editorSettings store
 */
export function initMonacoEditor(container, initialValue, { onRun, onChange } = {}) {
  registerCompletions();

  const settings = editorSettings.getAll();

  const resolveMonacoTheme = (t) => (t === 'modern-light' ? 'postgres-light' : (t || 'postgres-dark'));

  editorInstance = monaco.editor.create(container, {
    value: initialValue || '',
    language: 'sql',
    theme: resolveMonacoTheme(settings.theme),
    fontSize: settings.fontSize || 14,
    fontFamily: settings.fontFamily,
    fontLigatures: true,
    tabSize: settings.tabSize || 2,
    insertSpaces: true,
    wordWrap: settings.wordWrap || 'on',
    automaticLayout: true,
    minimap: { enabled: Boolean(settings.minimap) },
    scrollBeyondLastLine: false,
    lineNumbers: settings.lineNumbers || 'on',
    renderLineHighlight: 'all',
    bracketPairColorization: { enabled: true },
    suggestOnTriggerCharacters: true,
    quickSuggestions: true,
    padding: { top: 14, bottom: 14 }
  });

  // Cmd+Enter or Ctrl+Enter to execute
  editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    if (onRun) {
      const selection = getSelectedText();
      onRun(selection || getEditorValue());
    }
  });

  // Track changes
  editorInstance.onDidChangeModelContent(() => {
    clearEditorErrors();
    if (onChange) {
      onChange(getEditorValue());
    }
  });

  // Listen to settings store changes
  editorSettings.onChange((key, value) => {
    if (!editorInstance) return;
    if (key === 'fontSize') {
      editorInstance.updateOptions({ fontSize: value });
    } else if (key === 'minimap') {
      editorInstance.updateOptions({ minimap: { enabled: value } });
    } else if (key === 'wordWrap') {
      editorInstance.updateOptions({ wordWrap: value });
    } else if (key === 'tabSize') {
      editorInstance.updateOptions({ tabSize: value });
    } else if (key === 'lineNumbers') {
      editorInstance.updateOptions({ lineNumbers: value });
    } else if (key === 'fontFamily') {
      editorInstance.updateOptions({ fontFamily: value });
    } else if (key === 'theme') {
      monaco.editor.setTheme(resolveMonacoTheme(value));
    }
  });

  return editorInstance;
}

export function getEditorValue() {
  return editorInstance ? editorInstance.getValue() : '';
}

export function setEditorValue(val) {
  if (editorInstance) {
    editorInstance.setValue(val);
  }
}

export function getSelectedText() {
  if (!editorInstance) return '';
  const selection = editorInstance.getSelection();
  if (selection && !selection.isEmpty()) {
    return editorInstance.getModel().getValueInRange(selection);
  }
  return '';
}

export function formatEditorSql() {
  if (!editorInstance) return;
  const current = getEditorValue();
  try {
    const formatted = formatSql(current, {
      language: 'postgresql',
      tabWidth: 2,
      useTabs: false,
      keywordCase: 'upper',
      linesBetweenQueries: 2
    });
    setEditorValue(formatted);
  } catch (err) {
    console.warn('Could not format SQL:', err);
  }
}

export function insertSnippet(snippet) {
  if (!editorInstance) return;
  const selection = editorInstance.getSelection();
  const op = {
    range: selection,
    text: snippet + '\n',
    forceMoveMarkers: true
  };
  editorInstance.executeEdits('snippet-insert', [op]);
  editorInstance.focus();
}

export function updateSchemaCompletions(schema) {
  currentSchema = schema || { tables: [] };
}

export function getMonacoInstance() {
  return editorInstance;
}

export function setEditorError(line, message) {
  if (!editorInstance) return;
  const model = editorInstance.getModel();
  if (!model) return;

  const targetLine = parseInt(line, 10);
  if (isNaN(targetLine) || targetLine <= 0) return;

  const maxLine = model.getLineCount();
  const clampedLine = Math.min(targetLine, maxLine);
  const maxCol = model.getLineMaxColumn(clampedLine);

  monaco.editor.setModelMarkers(model, 'sql-runner', [
    {
      startLineNumber: clampedLine,
      startColumn: 1,
      endLineNumber: clampedLine,
      endColumn: maxCol,
      message: message || 'Query execution error',
      severity: monaco.MarkerSeverity.Error
    }
  ]);

  editorInstance.revealLineInCenter(clampedLine);
}

export function clearEditorErrors() {
  if (!editorInstance) return;
  const model = editorInstance.getModel();
  if (!model) return;
  monaco.editor.setModelMarkers(model, 'sql-runner', []);
}

export function jumpToEditorLine(line) {
  if (!editorInstance) return;
  const model = editorInstance.getModel();
  if (!model) return;
  const targetLine = parseInt(line, 10);
  if (isNaN(targetLine) || targetLine <= 0) return;
  const maxLine = model.getLineCount();
  const clampedLine = Math.min(Math.max(1, targetLine), maxLine);
  editorInstance.revealLineInCenter(clampedLine);
  editorInstance.setPosition({ lineNumber: clampedLine, column: 1 });
  editorInstance.focus();
}
