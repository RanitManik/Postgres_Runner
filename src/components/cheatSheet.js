import { insertSnippet } from '../editor/monacoSetup.js';
import { showToast } from './toast.js';

export const CHEAT_SHEET_ITEMS = [
  {
    category: 'DDL (Tables & Constraints)',
    items: [
      {
        title: 'Create Table with PK & Check',
        desc: 'Primary key, unique constraint, check constraint',
        sql: `CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  age INT CHECK (age >= 18),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
      },
      {
        title: 'Add Column to Table',
        desc: 'Alter table column definition',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(100);`
      },
      {
        title: 'Drop Table Cascade',
        desc: 'Drop table and dependent constraints',
        sql: `DROP TABLE IF EXISTS users CASCADE;`
      }
    ]
  },
  {
    category: 'DML (Mutations)',
    items: [
      {
        title: 'Batch Insert Values',
        desc: 'Insert multiple records in one statement',
        sql: `INSERT INTO users (username, age) VALUES
  ('charlie', 28),
  ('david', 35),
  ('eva', 22);`
      },
      {
        title: 'Insert with RETURNING',
        desc: 'Return generated serial IDs immediately',
        sql: `INSERT INTO users (username, age) 
VALUES ('frank', 31) 
RETURNING id, username, created_at;`
      },
      {
        title: 'Update with Condition',
        desc: 'Modify rows matching filter',
        sql: `UPDATE users 
SET age = age + 1 
WHERE username = 'charlie';`
      },
      {
        title: 'Delete Rows',
        desc: 'Remove matching records',
        sql: `DELETE FROM users 
WHERE age < 20;`
      }
    ]
  },
  {
    category: 'Advanced PostgreSQL Powers',
    items: [
      {
        title: 'JSONB Query & Extraction',
        desc: 'Query JSON document keys and values',
        sql: `SELECT 
  id, 
  data->>'category' AS category,
  data->'tags' AS tags
FROM products
WHERE data->>'in_stock' = 'true';`
      },
      {
        title: 'Window Function (Running Total)',
        desc: 'Running total and row numbering',
        sql: `SELECT 
  id, 
  amount,
  SUM(amount) OVER (ORDER BY id) AS running_total,
  RANK() OVER (ORDER BY amount DESC) AS rank
FROM transactions;`
      },
      {
        title: 'Generate Series (Mock Data)',
        desc: 'Generate rows dynamically',
        sql: `SELECT 
  s AS id, 
  'User ' || s AS username,
  (s * 10) AS value
FROM GENERATE_SERIES(1, 10) AS s;`
      }
    ]
  }
];

export class CheatSheet {
  constructor(container) {
    this.container = container;
  }

  showModal() {
    let modal = document.getElementById('cheatsheet-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'cheatsheet-modal';
      modal.className = 'modal-backdrop';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: var(--accent-blue);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </span>
            <span class="modal-title-text">PostgreSQL Reference Guide &amp; Snippets</span>
          </div>
          <button class="modal-close" id="btn-cheatsheet-close">&times;</button>
        </div>
        <div class="modal-body" id="cheatsheet-modal-body">
          ${CHEAT_SHEET_ITEMS.map(cat => `
            <div class="cs-category-group">
              <div class="cs-category-title">${escapeHtml(cat.category)}</div>
              ${cat.items.map(item => `
                <div class="cs-snippet-card">
                  <div class="cs-snippet-top">
                    <span class="cs-snippet-name">${escapeHtml(item.title)}</span>
                    <button class="btn-cs-insert" data-sql="${escapeHtml(item.sql)}" title="Insert snippet into editor">
                      + Insert
                    </button>
                  </div>
                  <pre class="cs-snippet-pre"><code>${escapeHtml(item.sql)}</code></pre>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cheatsheet-done">Close</button>
        </div>
      </div>
    `;

    modal.classList.add('is-open');

    const closeModal = () => modal.classList.remove('is-open');

    modal.querySelector('#btn-cheatsheet-close').addEventListener('click', closeModal);
    modal.querySelector('#btn-cheatsheet-done').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    modal.querySelectorAll('.btn-cs-insert').forEach(btn => {
      btn.addEventListener('click', () => {
        const sql = btn.getAttribute('data-sql');
        insertSnippet(`\n${sql}\n`);
        closeModal();
        showToast('Snippet inserted into query', 'info', 1500);
      });
    });
  }
}

export const cheatSheet = new CheatSheet(null);

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
