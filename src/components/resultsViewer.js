import { showToast } from './toast.js';

export class ResultsViewer {
  constructor(container, onExecuteSnippet, onJumpToLine) {
    this.container = container;
    this.onExecuteSnippet = onExecuteSnippet;
    this.onJumpToLine = onJumpToLine;
    this.currentResult = null;
    this.sortState = {};
    this.filterState = {};
  }

  renderInitialState() {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const runKey = isMac ? '⌘↵' : 'Ctrl+↵';
    const formatKey = isMac ? '⌥⇧F' : 'Alt+Shift+F';

    this.container.innerHTML = `
      <div class="results-empty-canvas">
        <!-- Ghost Table Grid Backdrop -->
        <div class="ghost-table-backdrop" aria-hidden="true">
          <div class="ghost-table-header">
            <div class="ghost-col ghost-col-num">#</div>
            <div class="ghost-col ghost-col-sm">id</div>
            <div class="ghost-col ghost-col-lg">title</div>
            <div class="ghost-col ghost-col-md">status</div>
            <div class="ghost-col ghost-col-lg">created_at</div>
          </div>
          <div class="ghost-table-row">
            <div class="ghost-col ghost-col-num"><span class="ghost-bar w-12"></span></div>
            <div class="ghost-col ghost-col-sm"><span class="ghost-bar w-24"></span></div>
            <div class="ghost-col ghost-col-lg"><span class="ghost-bar w-64"></span></div>
            <div class="ghost-col ghost-col-md"><span class="ghost-bar w-36"></span></div>
            <div class="ghost-col ghost-col-lg"><span class="ghost-bar w-48"></span></div>
          </div>
          <div class="ghost-table-row">
            <div class="ghost-col ghost-col-num"><span class="ghost-bar w-12"></span></div>
            <div class="ghost-col ghost-col-sm"><span class="ghost-bar w-32"></span></div>
            <div class="ghost-col ghost-col-lg"><span class="ghost-bar w-48"></span></div>
            <div class="ghost-col ghost-col-md"><span class="ghost-bar w-28"></span></div>
            <div class="ghost-col ghost-col-lg"><span class="ghost-bar w-56"></span></div>
          </div>
          <div class="ghost-table-row">
            <div class="ghost-col ghost-col-num"><span class="ghost-bar w-12"></span></div>
            <div class="ghost-col ghost-col-sm"><span class="ghost-bar w-20"></span></div>
            <div class="ghost-col ghost-col-lg"><span class="ghost-bar w-56"></span></div>
            <div class="ghost-col ghost-col-md"><span class="ghost-bar w-40"></span></div>
            <div class="ghost-col ghost-col-lg"><span class="ghost-bar w-44"></span></div>
          </div>
          <div class="ghost-table-row">
            <div class="ghost-col ghost-col-num"><span class="ghost-bar w-12"></span></div>
            <div class="ghost-col ghost-col-sm"><span class="ghost-bar w-28"></span></div>
            <div class="ghost-col ghost-col-lg"><span class="ghost-bar w-40"></span></div>
            <div class="ghost-col ghost-col-md"><span class="ghost-bar w-32"></span></div>
            <div class="ghost-col ghost-col-lg"><span class="ghost-bar w-52"></span></div>
          </div>
        </div>

        <!-- Foreground Centered Action Card -->
        <div class="empty-center-card">
          <div class="empty-card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
          </div>

          <div class="empty-card-text">
            <h3 class="empty-card-title">Ready to run queries</h3>
            <p class="empty-card-desc">
              Execute SQL from the editor to inspect live table results.
            </p>
          </div>

          <div class="empty-card-actions">
            <button id="btn-empty-run-query" class="btn-empty-run-primary" type="button" aria-label="Execute SQL Query">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <span>Run Query</span>
              <kbd class="empty-btn-kbd">${runKey}</kbd>
            </button>
          </div>
        </div>
      </div>
    `;

    const runBtn = this.container.querySelector('#btn-empty-run-query');
    if (runBtn && typeof this.onExecuteSnippet === 'function') {
      runBtn.addEventListener('click', () => {
        this.onExecuteSnippet();
      });
    }
  }

  renderLoading() {
    this.container.innerHTML = `
      <div class="results-loading-state">
        <span class="spinner-lg"></span>
        <div class="loading-text-col">
          <span class="loading-title">Executing PostgreSQL query...</span>
          <span class="loading-sub">Processing via in-browser WASM engine</span>
        </div>
      </div>
    `;
  }

  renderError(errorObj, totalDuration, onResetDb) {
    const line = errorObj.line;
    const col = errorObj.column;
    const snippet = errorObj.snippet;

    this.container.innerHTML = `
      <div class="results-wrapper">
        <div class="results-header-bar results-header-error">
          <div class="results-meta-left">
            <span class="status-badge-err">Error</span>
            <span class="meta-count">Execution Failed</span>
            <span class="meta-dot">•</span>
            <span class="meta-duration">${totalDuration}ms</span>
            ${line ? `
              <span class="meta-dot">•</span>
              <span class="error-line-badge" id="btn-jump-to-error" title="Click to jump to line ${line} in editor">
                Line ${line}${col ? `:${col}` : ''}
              </span>
            ` : ''}
          </div>
          ${line ? `
            <button class="btn btn-xs btn-secondary" id="btn-jump-editor-action">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              Jump to Line ${line}
            </button>
          ` : ''}
        </div>

        <div class="results-error-banner">
          <div class="error-header">
            <div class="error-title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>Query Execution Error</span>
            </div>
            ${line ? `<span class="duration-tag">Line ${line}${col ? ` : Col ${col}` : ''}</span>` : `<span class="duration-tag">${totalDuration}ms</span>`}
          </div>

          <div class="error-message-box">
            <code>${escapeHtml(errorObj.message)}</code>
          </div>

          ${snippet ? `
            <div class="error-snippet-box">
              <div class="snippet-header">At line ${line}:</div>
              <pre class="snippet-code"><code>${escapeHtml(snippet)}</code></pre>
            </div>
          ` : ''}

          ${errorObj.friendlyExplanation ? `
            <div class="error-beginner-tip">
              <div class="tip-header">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>Diagnostic Recommendation</span>
              </div>
              <p class="tip-text">${escapeHtml(errorObj.friendlyExplanation)}</p>
              ${errorObj.hint ? `<p class="tip-hint">${escapeHtml(errorObj.hint)}</p>` : ''}
            </div>
          ` : ''}

          ${errorObj.message && errorObj.message.includes('already exists') && onResetDb ? `
            <div style="margin-top: 10px;">
              <button class="btn btn-secondary" id="btn-quick-reset-db">
                Reset Database &amp; Re-run
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    const quickResetBtn = this.container.querySelector('#btn-quick-reset-db');
    if (quickResetBtn && onResetDb) {
      quickResetBtn.addEventListener('click', onResetDb);
    }

    const jumpBtn = this.container.querySelector('#btn-jump-editor-action');
    if (jumpBtn && line && this.onJumpToLine) {
      jumpBtn.addEventListener('click', () => this.onJumpToLine(line));
    }
    const jumpBadge = this.container.querySelector('#btn-jump-to-error');
    if (jumpBadge && line && this.onJumpToLine) {
      jumpBadge.addEventListener('click', () => this.onJumpToLine(line));
    }
  }

  renderResults(executionData) {
    this.currentResult = executionData;
    const { results, totalDuration, statementCount } = executionData;

    if (!results || results.length === 0) {
      this.renderInitialState();
      return;
    }

    // Filter results that have output tables (SELECT or RETURNING with fields)
    const tableResults = results
      .map((res, originalIndex) => ({ ...res, originalIndex }))
      .filter(res => res.isSelect || (res.fields && res.fields.length > 0 && res.rows));

    // Case 1: No output tables (e.g. CREATE TABLE, INSERT, UPDATE, DELETE, ALTER, DROP)
    if (tableResults.length === 0) {
      this.renderSuccessNoOutput(executionData);
      return;
    }

    // Case 2: Exactly 1 output table (the 95% standard case)
    if (tableResults.length === 1) {
      this.renderSingleTableOutput(tableResults[0], executionData);
      this.attachEventListeners(tableResults);
      return;
    }

    // Case 3: Multiple output tables (e.g. multiple SELECT statements)
    this.renderMultipleTablesOutput(tableResults, executionData);
    this.attachEventListeners(tableResults);
  }

  renderSuccessNoOutput(executionData) {
    const { results, totalDuration, statementCount } = executionData;
    const totalAffected = results.reduce((acc, r) => acc + (r.affectedRows || 0), 0);

    this.container.innerHTML = `
      <div class="results-wrapper">
        <div class="results-header-bar">
          <div class="results-meta-left">
            <span class="status-badge-ok">Success</span>
            <span class="meta-count"><strong>${statementCount}</strong> ${statementCount === 1 ? 'statement' : 'statements'}</span>
            ${totalAffected > 0 ? `
              <span class="meta-dot">•</span>
              <span class="meta-affected"><strong>${totalAffected}</strong> ${totalAffected === 1 ? 'row' : 'rows'} affected</span>
            ` : ''}
            <span class="meta-dot">•</span>
            <span class="meta-duration">${totalDuration}ms</span>
          </div>
        </div>
      </div>
    `;
  }

  renderSingleTableOutput(tableRes, executionData) {
    const { totalDuration, statementCount } = executionData;
    const rows = tableRes.rows || [];

    this.container.innerHTML = `
      <div class="results-wrapper">
        <div class="results-header-bar">
          <div class="results-meta-left">
            <span class="status-badge-ok">Success</span>
            <span class="meta-count"><strong>${rows.length}</strong> ${rows.length === 1 ? 'row' : 'rows'}</span>
            ${statementCount > 1 ? `
              <span class="meta-dot">•</span>
              <span class="meta-subtle">${statementCount} statements</span>
            ` : ''}
            <span class="meta-dot">•</span>
            <span class="meta-duration">${totalDuration}ms</span>
          </div>

          <div class="statement-metrics">
            <input type="text" class="table-filter-input" data-idx="0" placeholder="Filter rows..." autocomplete="off" />
            <button class="btn-export-tag btn-copy-csv" data-idx="0" title="Copy CSV to clipboard">CSV</button>
            <button class="btn-export-tag btn-copy-json" data-idx="0" title="Copy JSON to clipboard">JSON</button>
          </div>
        </div>

        <div class="statement-table-container single-table-mode" id="table-container-0">
          ${this.renderDataTable(tableRes, 0)}
        </div>
      </div>
    `;
  }

  renderMultipleTablesOutput(tableResults, executionData) {
    const { totalDuration } = executionData;

    let html = `
      <div class="results-wrapper">
        <div class="results-header-bar">
          <div class="results-meta-left">
            <span class="status-badge-ok">Success</span>
            <span class="meta-count"><strong>${tableResults.length}</strong> result tables</span>
            <span class="meta-dot">•</span>
            <span class="meta-duration">${totalDuration}ms</span>
          </div>
        </div>

        <div class="statements-stream">
    `;

    tableResults.forEach((res, idx) => {
      const rows = res.rows || [];
      html += `
        <div class="statement-card" data-index="${idx}">
          <div class="statement-card-header">
            <div class="statement-title-group">
              <span class="statement-type-pill pill-select">Result #${idx + 1}</span>
              <code class="statement-sql-snippet" title="${escapeHtml(res.sql)}">${escapeHtml(this.truncateSnippet(res.sql))}</code>
            </div>

            <div class="statement-metrics">
              <span class="metric-rows-tag">${rows.length} ${rows.length === 1 ? 'row' : 'rows'}</span>
              <input type="text" class="table-filter-input" data-idx="${idx}" placeholder="Filter results..." autocomplete="off" />
              <button class="btn-export-tag btn-copy-csv" data-idx="${idx}" title="Copy CSV to clipboard">CSV</button>
              <button class="btn-export-tag btn-copy-json" data-idx="${idx}" title="Copy JSON to clipboard">JSON</button>
            </div>
          </div>

          <div class="statement-table-container" id="table-container-${idx}">
            ${this.renderDataTable(res, idx)}
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  }

  renderDataTable(res, idx) {
    const fields = res.fields || [];
    let rows = res.rows || [];

    if (fields.length === 0 && rows.length === 0) {
      return `<div style="padding: 18px 12px; text-align: center; color: var(--text-muted); font-size: 11px;">0 rows returned</div>`;
    }

    const queryFilter = (this.filterState[idx] || '').toLowerCase().trim();
    if (queryFilter) {
      rows = rows.filter(row => {
        return Object.values(row).some(v => String(v ?? '').toLowerCase().includes(queryFilter));
      });
    }

    const sort = this.sortState[idx];
    if (sort && sort.col) {
      rows = [...rows].sort((a, b) => {
        const valA = a[sort.col];
        const valB = b[sort.col];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sort.dir === 'asc' ? valA - valB : valB - valA;
        }
        return sort.dir === 'asc' 
          ? String(valA).localeCompare(String(valB)) 
          : String(valB).localeCompare(String(valA));
      });
    }

    let html = `
      <table class="pg-data-table">
        <thead>
          <tr>
            <th class="col-index">#</th>
    `;

    for (const field of fields) {
      const isSorted = sort && sort.col === field.name;
      const sortArrow = isSorted ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : '';
      html += `
        <th class="col-sortable ${isSorted ? 'is-sorted' : ''}" data-col="${escapeHtml(field.name)}" data-idx="${idx}" title="Sort by ${escapeHtml(field.name)}">
          <div class="th-content">
            <span class="col-name">${escapeHtml(field.name)}${sortArrow}</span>
            <span class="col-type-tag">${escapeHtml(field.dataType || '')}</span>
          </div>
        </th>
      `;
    }

    html += `
          </tr>
        </thead>
        <tbody>
    `;

    if (rows.length === 0) {
      const msg = queryFilter ? `No rows matching "${escapeHtml(queryFilter)}"` : '0 rows returned';
      html += `
        <tr>
          <td colspan="${fields.length + 1}" class="cell-empty-state">${msg}</td>
        </tr>
      `;
    } else {
      rows.forEach((row, rowIdx) => {
        html += `<tr><td class="col-index">${rowIdx + 1}</td>`;
        for (const field of fields) {
          const val = row[field.name];
          html += `<td class="cell-val ${this.getCellTypeClass(val)}" title="${escapeHtml(this.formatCellValue(val))}">${escapeHtml(this.formatCellValue(val))}</td>`;
        }
        html += `</tr>`;
      });
    }

    html += `
        </tbody>
      </table>
    `;

    return html;
  }

  attachEventListeners(results) {
    this.container.querySelectorAll('.col-sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-col');
        const idx = parseInt(th.getAttribute('data-idx'), 10);
        const current = this.sortState[idx];
        let nextDir = 'asc';
        if (current && current.col === col) {
          nextDir = current.dir === 'asc' ? 'desc' : 'asc';
        }
        this.sortState[idx] = { col, dir: nextDir };
        this.updateTable(idx, results);
      });
    });

    this.container.querySelectorAll('.table-filter-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(input.getAttribute('data-idx'), 10);
        this.filterState[idx] = e.target.value;
        this.updateTable(idx, results);
      });
    });

    this.container.querySelectorAll('.btn-copy-csv').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const res = results[idx];
        if (res && res.rows) {
          const csv = this.toCsv(res.fields, res.rows);
          navigator.clipboard.writeText(csv);
          showToast('Copied CSV to clipboard', 'info', 1500);
        }
      });
    });

    this.container.querySelectorAll('.btn-copy-json').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const res = results[idx];
        if (res && res.rows) {
          const json = JSON.stringify(res.rows, null, 2);
          navigator.clipboard.writeText(json);
          showToast('Copied JSON to clipboard', 'info', 1500);
        }
      });
    });
  }

  updateTable(idx, results) {
    const container = this.container.querySelector(`#table-container-${idx}`);
    if (container && results && results[idx]) {
      container.innerHTML = this.renderDataTable(results[idx], idx);
      // Re-bind sort listener for this table
      container.querySelectorAll('.col-sortable').forEach(th => {
        th.addEventListener('click', () => {
          const col = th.getAttribute('data-col');
          const current = this.sortState[idx];
          let nextDir = 'asc';
          if (current && current.col === col) {
            nextDir = current.dir === 'asc' ? 'desc' : 'asc';
          }
          this.sortState[idx] = { col, dir: nextDir };
          this.updateTable(idx, results);
        });
      });
    }
  }

  getPillClass(type) {
    const t = (type || '').toUpperCase();
    if (t === 'SELECT') return 'pill-select';
    if (t === 'INSERT') return 'pill-insert';
    if (t === 'UPDATE') return 'pill-update';
    if (t === 'DELETE') return 'pill-delete';
    if (t === 'CREATE') return 'pill-create';
    if (t === 'DROP' || t === 'ALTER') return 'pill-alter';
    return 'pill-default';
  }

  truncateSnippet(sql) {
    const cleaned = (sql || '').replace(/\s+/g, ' ').trim();
    if (cleaned.length > 70) {
      return cleaned.slice(0, 67) + '...';
    }
    return cleaned;
  }

  formatCellValue(val) {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }

  getCellTypeClass(val) {
    if (val === null || val === undefined) return 'cell-null';
    if (typeof val === 'number') return 'cell-num';
    if (typeof val === 'boolean') return 'cell-bool';
    return '';
  }

  toCsv(fields, rows) {
    if (!rows || rows.length === 0) return '';
    const headers = fields.map(f => `"${String(f.name).replace(/"/g, '""')}"`).join(',');
    const lines = rows.map(r => {
      return fields.map(f => {
        const v = r[f.name];
        if (v === null || v === undefined) return '';
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(',');
    });
    return [headers, ...lines].join('\n');
  }
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
