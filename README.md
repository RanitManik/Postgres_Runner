# PostgreSQL Runner (Instant In-Browser SQL Playground)

<p align="center">
  <a href="https://postgres-runner.vercel.app">
    <img src="https://img.shields.io/badge/Live%20Demo-postgres--runner.vercel.app-0284c7?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
  </a>
  <img src="https://img.shields.io/badge/PostgreSQL%2016-PGlite%20WASM-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL 16 WASM" />
  <img src="https://img.shields.io/badge/Editor-Monaco%20Editor-007acc?style=for-the-badge&logo=visualstudiocode&logoColor=white" alt="Monaco Editor" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License MIT" />
  <img src="https://img.shields.io/badge/Status-Vibe--Coded%20%2F%20Experimental-orange?style=for-the-badge" alt="Status" />
</p>

> **Live Application**: [https://postgres-runner.vercel.app](https://postgres-runner.vercel.app)

A lightweight, zero-setup, in-browser PostgreSQL 16 playground and SQL workbench powered by **WebAssembly (PGlite)**, **Monaco Editor**, and **IndexedDB**. Execute real PostgreSQL queries, inspect relational schemas, organize code with multi-file tabs, and persist databases locally on your device without setting up Docker, cloud servers, or local services.

---

> [!WARNING]
> ### ⚠️ Project Notice: Vibe-Coded & Not Actively Maintained
> This project was completely **vibe-coded** by [@RanitManik](https://github.com/RanitManik) purely so I could practice, test, and experiment with PostgreSQL without any local installation hassle or managing cloud instances.
> 
> **It is not actively maintained**, is provided "as is", and is not meant for enterprise or production deployments. Feel free to fork it, inspect the code, tweak it, or use it for your own SQL learning and playground experiments!

---

## ✨ Key Features

- **🐘 Authentic PostgreSQL 16 in WASM**: Powered by `@electric-sql/pglite`, running real PostgreSQL client-side in WebAssembly.
- **📁 Multi-File SQL Tabs**: Work on multiple `.sql` files (`schema.sql`, `seed.sql`, `queries.sql`) simultaneously inside the same playground with independent undo/redo history, inline renaming, and zero-layout-shift auto-saving.
- **💾 Persistent Local Storage**: Databases and editor files persist across page reloads using browser IndexedDB and `localStorage`.
- **🗂️ Multi-Playground Manager**: Create, clone, switch, search, and batch-delete separate isolated database sandboxes.
- **⚡ Interactive Schema Explorer**: Live tree introspection of public tables, columns, primary keys, and data types with one-click SQL snippet generators.
- **💻 Monaco Code Editor**: Full-featured VS Code-style editor with SQL syntax highlighting, keyword autocompletion, schema-aware suggestions, and error line markers.
- **📊 Rich Results Canvas**: View tabular query results, execution times, affected row counters, and one-click copy to **CSV** or **JSON**.
- **🪄 SQL Formatter & Dump Export**: Auto-format SQL with `sql-formatter` and download complete SQL database dumps anytime.
- **🌓 Dark & Light Modes**: Seamless dark blue-slate developer workstation theme and a crisp Linear-inspired light theme.
- **🔒 100% Private & Offline-First**: No data or queries ever leave your machine. Runs completely client-side.

---

## ⌨️ Useful Keyboard Shortcuts

| Action | macOS | Windows / Linux |
| :--- | :--- | :--- |
| **Run Query (or Selection)** | <kbd>⌘</kbd> + <kbd>↵ Enter</kbd> | <kbd>Ctrl</kbd> + <kbd>↵ Enter</kbd> |
| **Format SQL** | <kbd>⌥</kbd> + <kbd>⇧</kbd> + <kbd>F</kbd> | <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd> |
| **Scroll File Tabs** | <kbd>Mouse Wheel Up / Down</kbd> or <kbd>←</kbd> / <kbd>→</kbd> | <kbd>Mouse Wheel Up / Down</kbd> or <kbd>←</kbd> / <kbd>→</kbd> |
| **Rename Tab** | <kbd>Double-click tab name</kbd> | <kbd>Double-click tab name</kbd> |

---

## 🛠️ Tech Stack

- **Database Engine**: [PGlite](https://github.com/electric-sql/pglite) (PostgreSQL 16 compiled to WebAssembly)
- **Editor**: [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- **Formatting**: [sql-formatter](https://github.com/sql-formatter-org/sql-formatter)
- **Bundler & Tooling**: [Vite](https://vitejs.dev/)
- **Icons**: [Lucide](https://lucide.dev/)
- **Styling**: Vanilla CSS (High-contrast Design System)

---

## 🚀 Getting Started Locally

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- `npm` or `pnpm`

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/RanitManik/Postgres_Runner.git
   cd Postgres_Runner
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser.

### Building for Production

```bash
npm run build
npm run preview
```

---

## 📄 License

MIT License — feel free to use and adapt for your own experiments.
