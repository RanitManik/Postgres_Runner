const STORAGE_KEY_PROJECTS = 'pg_runner_projects_v2';
const STORAGE_KEY_ACTIVE = 'pg_runner_active_project_v2';

export const STARTER_PROJECTS = [
  {
    id: 'employees_starter',
    name: 'Employees Practice',
    description: 'Basic CREATE, INSERT, and WHERE filtering (Starter)',
    isPreset: true,
    sql: `-- Sample PostgreSQL query (just try it out)
-- Notice: Your data is saved in browser IndexedDB and persists across reloads!

CREATE TABLE IF NOT EXISTS employees (
  age INT,
  name TEXT
);

-- Insert sample employees
INSERT INTO employees VALUES (25, 'Name1');
INSERT INTO employees VALUES (48, 'Name2');

-- 1. View all employees
SELECT * FROM employees;

-- 2. Filter employees between age 40 and 50
SELECT * FROM employees WHERE age > 40 AND age < 50;
`
  },
  {
    id: 'ecommerce_joins',
    name: 'E-Commerce & Joins',
    description: 'Multi-table schemas, foreign keys, INNER/LEFT joins',
    isPreset: true,
    sql: `-- E-Commerce Relational Playground
-- Practice Primary Keys, Foreign Keys, and JOINS

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  city VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  price NUMERIC(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customers(id),
  product_id INT REFERENCES products(id),
  quantity INT DEFAULT 1,
  order_date DATE DEFAULT CURRENT_DATE
);

-- Insert test records
INSERT INTO customers (name, email, city) VALUES
  ('Alice Walker', 'alice@example.com', 'Seattle'),
  ('Bob Vance', 'bob@vancerefrig.com', 'Scranton'),
  ('Carol Danvers', 'carol@marvel.com', 'Boston')
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (title, category, price) VALUES
  ('Mechanical Keyboard', 'Electronics', 129.99),
  ('Ergonomic Mouse', 'Electronics', 59.50),
  ('Standing Desk Mat', 'Office', 35.00),
  ('Noise-Cancelling Headphones', 'Electronics', 249.00)
ON CONFLICT DO NOTHING;

INSERT INTO orders (customer_id, product_id, quantity) VALUES
  (1, 1, 1),
  (1, 2, 2),
  (2, 3, 1),
  (3, 4, 1)
ON CONFLICT DO NOTHING;

-- 1. Complete Orders with Customer and Product Details (INNER JOIN)
SELECT 
  o.id AS order_id,
  c.name AS customer,
  c.city,
  p.title AS product,
  p.price,
  o.quantity,
  (p.price * o.quantity) AS total_amount
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN products p ON o.product_id = p.id;

-- 2. Total spending by each customer (GROUP BY & SUM)
SELECT 
  c.name,
  COUNT(o.id) AS total_orders,
  COALESCE(SUM(p.price * o.quantity), 0) AS total_spent
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
LEFT JOIN products p ON o.product_id = p.id
GROUP BY c.id, c.name
ORDER BY total_spent DESC;
`
  },
  {
    id: 'window_analytics',
    name: 'Window Functions & Analytics',
    description: 'Advanced analytics: RANK, ROW_NUMBER, running totals',
    isPreset: true,
    sql: `-- Window Functions & Modern PostgreSQL Analytics

CREATE TABLE IF NOT EXISTS regional_sales (
  id SERIAL PRIMARY KEY,
  sales_rep VARCHAR(50) NOT NULL,
  region VARCHAR(50) NOT NULL,
  quarter VARCHAR(10) NOT NULL,
  revenue NUMERIC(12, 2) NOT NULL
);

INSERT INTO regional_sales (sales_rep, region, quarter, revenue) VALUES
  ('Sarah Connor', 'North America', 'Q1', 45000.00),
  ('Sarah Connor', 'North America', 'Q2', 52000.00),
  ('John Wick', 'North America', 'Q1', 61000.00),
  ('John Wick', 'North America', 'Q2', 58000.00),
  ('Arthur Pendragon', 'Europe', 'Q1', 39000.00),
  ('Arthur Pendragon', 'Europe', 'Q2', 43000.00),
  ('Lara Croft', 'Europe', 'Q1', 67000.00),
  ('Lara Croft', 'Europe', 'Q2', 72000.00)
ON CONFLICT DO NOTHING;

-- 1. Rep Rank within their Region using RANK()
SELECT 
  sales_rep,
  region,
  quarter,
  revenue,
  RANK() OVER (PARTITION BY region, quarter ORDER BY revenue DESC) AS regional_rank
FROM regional_sales;

-- 2. Running Total of Revenue per Sales Rep
SELECT 
  sales_rep,
  quarter,
  revenue,
  SUM(revenue) OVER (
    PARTITION BY sales_rep 
    ORDER BY quarter 
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS cumulative_revenue
FROM regional_sales;
`
  },
  {
    id: 'jsonb_arrays',
    name: 'JSONB & Postgres Magic',
    description: 'Native JSON documents, arrays, generate_series',
    isPreset: true,
    sql: `-- PostgreSQL JSONB & Modern Superpowers

CREATE TABLE IF NOT EXISTS developer_profiles (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  skills TEXT[],
  metadata JSONB NOT NULL
);

INSERT INTO developer_profiles (username, skills, metadata) VALUES
  ('alex_dev', ARRAY['PostgreSQL', 'TypeScript', 'Docker'], '{"level": "Senior", "experience_years": 7, "preferences": {"theme": "dark", "indent": 2}}'::jsonb),
  ('maya_coder', ARRAY['Python', 'PostgreSQL', 'FastAPI'], '{"level": "Lead", "experience_years": 9, "preferences": {"theme": "light", "indent": 4}}'::jsonb),
  ('leo_sql', ARRAY['PostgreSQL', 'Go', 'Kubernetes'], '{"level": "Mid", "experience_years": 4, "preferences": {"theme": "dark", "indent": 2}}'::jsonb)
ON CONFLICT DO NOTHING;

-- 1. Extract JSONB fields using ->> operator
SELECT 
  username,
  metadata->>'level' AS developer_level,
  (metadata->>'experience_years')::INT AS years,
  metadata->'preferences'->>'theme' AS preferred_theme
FROM developer_profiles;

-- 2. Unnest array elements into individual rows
SELECT 
  username,
  UNNEST(skills) AS individual_skill
FROM developer_profiles;

-- 3. PostgreSQL generate_series to create mock date sequences
SELECT 
  CURRENT_DATE + s AS generated_date,
  ROUND((RANDOM() * 100)::NUMERIC, 2) AS random_metric
FROM GENERATE_SERIES(0, 6) AS s;
`
  },
  {
    id: 'scratchpad',
    name: 'Blank Sandbox',
    description: 'Empty PostgreSQL canvas for your own experiments',
    isPreset: false,
    sql: `-- Blank PostgreSQL Sandbox
-- Type any PostgreSQL code here and press Cmd+Enter / Ctrl+Enter to run!

CREATE TABLE IF NOT EXISTS my_table (
  id SERIAL PRIMARY KEY,
  title TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO my_table (title) VALUES 
  ('First entry'),
  ('Second entry');

SELECT * FROM my_table;
`
  }
];

class ProjectStore {
  constructor() {
    this.projects = this.loadProjects();
    this.activeProjectId = this.loadActiveProjectId();
  }

  loadProjects() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse projects from localStorage:', e);
    }
    // Default fallback
    this.saveProjects(STARTER_PROJECTS);
    return [...STARTER_PROJECTS];
  }

  saveProjects(projects) {
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save projects to localStorage:', e);
    }
  }

  loadActiveProjectId() {
    const active = localStorage.getItem(STORAGE_KEY_ACTIVE);
    if (active && this.projects.some(p => p.id === active)) {
      return active;
    }
    return this.projects[0]?.id || 'employees_starter';
  }

  setActiveProjectId(id) {
    if (this.projects.some(p => p.id === id)) {
      this.activeProjectId = id;
      localStorage.setItem(STORAGE_KEY_ACTIVE, id);
    }
  }

  getActiveProject() {
    return this.projects.find(p => p.id === this.activeProjectId) || this.projects[0];
  }

  getAllProjects() {
    return [...this.projects];
  }

  updateProjectSql(id, sql) {
    const project = this.projects.find(p => p.id === id);
    if (project) {
      project.sql = sql;
      project.updatedAt = Date.now();
      this.saveProjects(this.projects);
    }
  }

  createProject(name, description = '', initialSql = '') {
    const id = 'proj_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const newProject = {
      id,
      name: name || 'Untitled Playground',
      description: description || 'Custom PostgreSQL sandbox',
      isPreset: false,
      sql: initialSql || `-- ${name}\n\nSELECT 'Hello, PostgreSQL!' AS welcome;\n`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.projects.push(newProject);
    this.saveProjects(this.projects);
    this.setActiveProjectId(id);
    return newProject;
  }

  renameProject(id, newName) {
    const project = this.projects.find(p => p.id === id);
    if (project) {
      project.name = newName;
      project.updatedAt = Date.now();
      this.saveProjects(this.projects);
    }
  }

  duplicateProject(id, activate = false) {
    const source = this.projects.find(p => p.id === id);
    if (!source) return null;

    const newId = 'proj_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const clone = {
      ...source,
      id: newId,
      name: `${source.name} (Copy)`,
      isPreset: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.projects.push(clone);
    this.saveProjects(this.projects);
    if (activate) {
      this.setActiveProjectId(newId);
    }
    return clone;
  }

  deleteProject(id) {
    if (this.projects.length <= 1) {
      throw new Error('Cannot delete the only remaining project.');
    }
    const idx = this.projects.findIndex(p => p.id === id);
    if (idx !== -1) {
      const wasActive = this.activeProjectId === id;
      this.projects.splice(idx, 1);
      this.saveProjects(this.projects);
      if (wasActive) {
        this.setActiveProjectId(this.projects[0].id);
        return { wasActive: true, newActive: this.projects[0] };
      }
      return { wasActive: false, newActive: this.getActiveProject() };
    }
    return { wasActive: false, newActive: this.getActiveProject() };
  }

  deleteProjects(ids) {
    const idSet = new Set(ids);
    if (this.projects.length - idSet.size < 1) {
      throw new Error('Cannot delete all playgrounds. At least one must remain.');
    }
    const wasActive = idSet.has(this.activeProjectId);
    this.projects = this.projects.filter(p => !idSet.has(p.id));
    this.saveProjects(this.projects);
    if (wasActive) {
      this.setActiveProjectId(this.projects[0].id);
      return { wasActive: true, newActive: this.projects[0] };
    }
    return { wasActive: false, newActive: this.getActiveProject() };
  }

  resetProjectToStarter(id) {
    const starter = STARTER_PROJECTS.find(s => s.id === id);
    const project = this.projects.find(p => p.id === id);
    if (starter && project) {
      project.sql = starter.sql;
      project.updatedAt = Date.now();
      this.saveProjects(this.projects);
      return project.sql;
    }
    return null;
  }
}

export const projectStore = new ProjectStore();
