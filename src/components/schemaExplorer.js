import { insertSnippet } from '../editor/monacoSetup.js';
import { showToast } from './toast.js';

export class SchemaExplorer {
  constructor(container, dbEngine, onSchemaUpdated) {
    this.container = container;
    this.dbEngine = dbEngine;
    this.onSchemaUpdated = onSchemaUpdated;
    this.expandedTables = new Set();
    this.selectedTable = null;
    this.schemaData = { tables: [], views: [] };
    this.searchQuery = '';
  }

  async refresh() {
    try {
      this.schemaData = await this.dbEngine.fetchSchema();
      // By default expand first table if none expanded yet
      if (this.expandedTables.size === 0 && this.schemaData.tables.length > 0) {
        this.expandedTables.add(this.schemaData.tables[0].name);
      }
      this.render();
      if (this.onSchemaUpdated) {
        this.onSchemaUpdated(this.schemaData);
      }
    } catch (err) {
      console.warn('Failed to refresh schema:', err);
      if (!this.container.children.length) {
        this.container.innerHTML = `
          <div style="padding: 16px 12px; text-align: center; color: var(--text-muted); font-size: 11px;">
            <p>Could not inspect schema.</p>
            <button class="btn-schema-template" id="btn-retry-schema" style="margin-top: 8px;">Retry</button>
          </div>
        `;
        const retry = this.container.querySelector('#btn-retry-schema');
        if (retry) retry.addEventListener('click', () => this.refresh());
      }
    }
  }

  render() {
    const { tables, views } = this.schemaData;
    const totalCount = tables.length + views.length;

    const filterTerm = this.searchQuery.toLowerCase().trim();
    const filteredTables = tables.filter(t => t.name.toLowerCase().includes(filterTerm));
    const filteredViews = views.filter(v => v.name.toLowerCase().includes(filterTerm));

    let html = `
      <div class="schema-browser-wrapper">
        <div class="schema-search-box">
          <svg class="schema-search-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            class="schema-filter-input" 
            id="schema-search-box" 
            placeholder="Filter tables &amp; views..." 
            value="${escapeHtml(this.searchQuery)}" 
            autocomplete="off"
            spellcheck="false"
          />
          ${this.searchQuery ? `<button class="schema-clear-btn" id="btn-clear-search">&times;</button>` : ''}
        </div>

        <div class="schema-tree-scroll">
    `;

    if (totalCount === 0) {
      html += `
        <div class="schema-empty-card">
          <div class="empty-icon-subtle">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
          </div>
          <h4>No tables yet</h4>
          <p>Run your <code>CREATE TABLE</code> SQL in the editor to view schema live.</p>
          <button class="btn-schema-template" id="btn-quick-create-table">
            + Sample Schema
          </button>
        </div>
      `;
    } else if (filteredTables.length === 0 && filteredViews.length === 0) {
      html += `
        <div style="padding: 20px 10px; text-align: center; color: var(--text-muted); font-size: 11px;">
          No tables matching "${escapeHtml(this.searchQuery)}"
        </div>
      `;
    } else {
      if (filteredTables.length > 0) {
        html += `
          <div class="tree-group">
            <div class="tree-group-header">
              <span>TABLES</span>
              <span class="tree-group-count">${filteredTables.length}</span>
            </div>
        `;

        for (const table of filteredTables) {
          const isExpanded = this.expandedTables.has(table.name);
          const isSelected = this.selectedTable === table.name;
          html += `
            <div class="tree-table-item ${isExpanded ? 'is-expanded' : ''} ${isSelected ? 'is-selected' : ''}" data-table="${escapeHtml(table.name)}">
              <div class="table-node-bar" data-table="${escapeHtml(table.name)}">
                <span class="tree-arrow">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </span>
                <span class="table-node-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="9" y1="21" x2="9" y2="9"></line>
                  </svg>
                </span>
                <span class="table-node-name">${escapeHtml(table.name)}</span>
                <span class="table-row-count">${table.rowCount}</span>

                <div class="table-actions-hover">
                  <button class="btn-mini-query" data-table="${escapeHtml(table.name)}" title="Query SELECT * FROM ${escapeHtml(table.name)}">
                    SELECT
                  </button>
                </div>
              </div>

              <div class="columns-subtree">
                ${table.columns.map(col => `
                  <div class="col-leaf-item" data-col="${escapeHtml(col.name)}" title="Click to insert '${escapeHtml(col.name)}' into editor">
                    ${col.isPrimary ? `
                      <span class="col-key-glyph" title="Primary Key">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <circle cx="7.5" cy="15.5" r="5.5"></circle>
                          <path d="M11.5 11.5L22 1"></path>
                          <path d="M18 5l2 2"></path>
                        </svg>
                      </span>
                    ` : `
                      <span class="col-bullet">•</span>
                    `}
                    <span class="col-title ${col.isPrimary ? 'is-pk' : ''}">${escapeHtml(col.name)}</span>
                    <span class="col-type-label ${this.getTypeClass(col.dataType)}">${escapeHtml(col.dataType)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }

        html += `</div>`;
      }

      if (filteredViews.length > 0) {
        html += `
          <div class="tree-group">
            <div class="tree-group-header">
              <span>VIEWS</span>
              <span class="tree-group-count">${filteredViews.length}</span>
            </div>
        `;

        for (const view of filteredViews) {
          const isExpanded = this.expandedTables.has(view.name);
          const isSelected = this.selectedTable === view.name;
          html += `
            <div class="tree-table-item ${isExpanded ? 'is-expanded' : ''} ${isSelected ? 'is-selected' : ''}" data-table="${escapeHtml(view.name)}">
              <div class="table-node-bar" data-table="${escapeHtml(view.name)}">
                <span class="tree-arrow">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </span>
                <span class="view-node-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </span>
                <span class="table-node-name">${escapeHtml(view.name)}</span>
                <span class="table-row-count">view</span>

                <div class="table-actions-hover">
                  <button class="btn-mini-query" data-table="${escapeHtml(view.name)}" title="Query view ${escapeHtml(view.name)}">
                    SELECT
                  </button>
                </div>
              </div>

              <div class="columns-subtree">
                ${view.columns.map(col => `
                  <div class="col-leaf-item" data-col="${escapeHtml(col.name)}" title="Click to insert '${escapeHtml(col.name)}' into editor">
                    <span class="col-bullet">•</span>
                    <span class="col-title">${escapeHtml(col.name)}</span>
                    <span class="col-type-label">${escapeHtml(col.dataType)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }

        html += `</div>`;
      }
    }

    html += `
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  attachEventListeners() {
    const searchBox = this.container.querySelector('#schema-search-box');
    if (searchBox) {
      searchBox.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render();
        const reBox = this.container.querySelector('#schema-search-box');
        if (reBox) {
          reBox.focus();
          reBox.setSelectionRange(reBox.value.length, reBox.value.length);
        }
      });
    }

    const clearBtn = this.container.querySelector('#btn-clear-search');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.searchQuery = '';
        this.render();
      });
    }

    // Toggle expand/collapse smoothly using DOM class without full re-render
    this.container.querySelectorAll('.table-node-bar').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('.btn-mini-query')) return;
        const tableName = header.getAttribute('data-table');
        const treeItem = header.closest('.tree-table-item');

        if (this.expandedTables.has(tableName)) {
          this.expandedTables.delete(tableName);
          treeItem?.classList.remove('is-expanded');
        } else {
          this.expandedTables.add(tableName);
          treeItem?.classList.add('is-expanded');
        }

        // Update selected table
        this.selectedTable = tableName;
        this.container.querySelectorAll('.tree-table-item').forEach(el => {
          el.classList.toggle('is-selected', el.getAttribute('data-table') === tableName);
        });
      });
    });

    // Click column leaf to insert column name directly into query
    this.container.querySelectorAll('.col-leaf-item').forEach(leaf => {
      leaf.addEventListener('click', (e) => {
        e.stopPropagation();
        const colName = leaf.getAttribute('data-col');
        if (colName) {
          insertSnippet(`"${colName}"`);
          showToast(`Inserted column "${colName}"`, 'info', 1200);
        }
      });
    });

    // Mini SELECT button
    this.container.querySelectorAll('.btn-mini-query').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tableName = btn.getAttribute('data-table');
        insertSnippet(`\n-- Query table: ${tableName}\nSELECT * FROM "${tableName}" LIMIT 50;\n`);
        showToast(`Inserted SELECT for "${tableName}"`, 'info', 1400);
      });
    });

    // Quick starter schema generator
    const quickCreateBtn = this.container.querySelector('#btn-quick-create-table');
    if (quickCreateBtn) {
      quickCreateBtn.addEventListener('click', () => {
        insertSnippet(`\n-- Sample PostgreSQL table\nCREATE TABLE IF NOT EXISTS demo_items (\n  id SERIAL PRIMARY KEY,\n  title TEXT NOT NULL,\n  status VARCHAR(20) DEFAULT 'pending',\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\nINSERT INTO demo_items (title, status) VALUES\n  ('First Task', 'completed'),\n  ('Second Task', 'pending');\n\nSELECT * FROM demo_items;\n`);
        showToast('Inserted starter schema', 'info', 1500);
      });
    }
  }

  getTypeClass(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('int') || t.includes('serial') || t.includes('numeric') || t.includes('real') || t.includes('decimal')) return 'type-numeric';
    if (t.includes('char') || t.includes('text') || t.includes('varchar')) return 'type-string';
    if (t.includes('bool')) return 'type-boolean';
    if (t.includes('time') || t.includes('date')) return 'type-date';
    if (t.includes('json')) return 'type-json';
    return '';
  }
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
