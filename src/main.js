import './style.css';
import { dbEngine } from './db/pgliteEngine.js';
import { projectStore } from './state/projectStore.js';
import { editorSettings } from './state/editorSettings.js';
import {
  initMonacoEditor,
  getEditorValue,
  setEditorValue,
  getSelectedText,
  formatEditorSql,
  updateSchemaCompletions,
  getMonacoInstance,
  setEditorError,
  clearEditorErrors,
  jumpToEditorLine,
  switchToFileModel,
  resetAllFileModels,
  disposeFileModel
} from './editor/monacoSetup.js';
import { ResultsViewer } from './components/resultsViewer.js';
import { SchemaExplorer } from './components/schemaExplorer.js';
import { cheatSheet } from './components/cheatSheet.js';
import { ProjectManager } from './components/projectManager.js';
import { settingsModal } from './components/settingsModal.js';
import { EditorTabs } from './components/editorTabs.js';
import { showToast } from './components/toast.js';

let resultsViewer = null;
let schemaExplorer = null;
let projectManager = null;
let editorTabs = null;
let saveDebounceTimer = null;

async function initApp() {
  console.log('🚀 Initializing PostgreSQL Runner (Full-Height Layout)...');

  // 1. DOM Elements
  const monacoHost = document.getElementById('monaco-container');
  const resultsHost = document.getElementById('results-container');
  const schemaHost = document.getElementById('schema-tree-container');

  // Header Project Dropdown Elements
  const projectDropdownWrapper = document.getElementById('project-dropdown-wrapper');
  const btnProjectTrigger = document.getElementById('btn-project-trigger');
  const headerActiveProjectName = document.getElementById('header-active-project-name');
  const inputSearchPlaygrounds = document.getElementById('input-search-playgrounds');
  const dropdownPlaygroundsList = document.getElementById('dropdown-playgrounds-list');
  const btnDropdownNewProj = document.getElementById('btn-dropdown-new-proj');
  const btnDropdownManageProj = document.getElementById('btn-dropdown-manage-proj');

  // Header Actions
  const btnRun = document.getElementById('btn-run-query');
  const btnFormat = document.getElementById('btn-format-sql');
  const btnResetDb = document.getElementById('btn-reset-db');
  const btnExport = document.getElementById('btn-export-sql');
  const btnThemeToggle = document.getElementById('btn-theme-toggle');

  // Editor Toolbar Elements
  const btnClear = document.getElementById('btn-clear-editor');
  const btnEditorSettings = document.getElementById('btn-editor-settings');
  const btnQuickWrap = document.getElementById('btn-quick-wrap');
  const btnOpenCheatsheet = document.getElementById('btn-open-cheatsheet');
  const editorTabsBar = document.getElementById('editor-tabs-bar');
  const btnClearResults = document.getElementById('btn-clear-results');

  // Sidebar Actions
  const btnRefreshSchema = document.getElementById('btn-refresh-schema');

  // Footer Elements
  const footerDb = document.getElementById('footer-active-db');
  const footerStatus = document.getElementById('footer-engine-status');

  // 2. Load Active Project
  let activeProject = projectStore.getActiveProject();
  if (headerActiveProjectName) {
    headerActiveProjectName.textContent = activeProject.name;
  }

  // 3. Initialize Results Viewer with snippet runner and line navigation
  resultsViewer = new ResultsViewer(
    resultsHost,
    (sql) => {
      if (sql) {
        setEditorValue(sql);
        executeCode(sql);
      } else {
        const selection = getSelectedText();
        executeCode(selection || getEditorValue());
      }
    },
    (line) => {
      jumpToEditorLine(line);
    }
  );
  resultsViewer.renderInitialState();

  // 4. Initialize Multi-File Editor Tabs Component
  editorTabs = new EditorTabs(editorTabsBar, {
    projectStore,
    onSelectTab: (fileId) => {
      const activeFile = projectStore.setActiveFile(activeProject.id, fileId);
      if (activeFile) {
        switchToFileModel(activeFile.id, activeFile.content, activeFile.name);
        editorTabs.render();
      }
    },
    onCreateTab: () => {
      const newFile = projectStore.createFile(activeProject.id);
      if (newFile) {
        switchToFileModel(newFile.id, newFile.content, newFile.name);
        editorTabs.render();
        showToast(`Created ${newFile.name}`, 'info', 1200);
      }
    },
    onRenameTab: (fileId, newName) => {
      try {
        const renamed = projectStore.renameFile(activeProject.id, fileId, newName);
        editorTabs.render();
        showToast(`Renamed to ${renamed.name}`, 'info', 1200);
      } catch (err) {
        showToast(err.message, 'warning', 2000);
        editorTabs.render();
      }
    },
    onCloseTab: (fileId) => {
      try {
        const res = projectStore.deleteFile(activeProject.id, fileId);
        if (res) {
          disposeFileModel(fileId);
          if (res.wasActive) {
            const nextActiveFile = projectStore.getActiveFile(activeProject.id);
            if (nextActiveFile) {
              switchToFileModel(nextActiveFile.id, nextActiveFile.content, nextActiveFile.name);
            }
          }
          editorTabs.render();
          showToast(`Closed ${res.deletedFile.name}`, 'info', 1200);
        }
      } catch (err) {
        showToast(err.message, 'warning', 2000);
      }
    }
  });

  const initialFiles = projectStore.getProjectFiles(activeProject.id);
  const activeFile = projectStore.getActiveFile(activeProject.id);

  // 5. Initialize Monaco Editor
  initMonacoEditor(monacoHost, activeFile.content, {
    onRun: (codeToRun) => executeCode(codeToRun),
    onChange: (currentVal) => {
      if (editorTabs) editorTabs.setSavingState(true);
      clearTimeout(saveDebounceTimer);
      saveDebounceTimer = setTimeout(() => {
        projectStore.updateActiveFileContent(activeProject.id, currentVal);
        if (editorTabs) editorTabs.setSavingState(false);
      }, 400);
    }
  });

  // Setup initial file models & render tab bar
  resetAllFileModels(initialFiles, activeFile.id);
  editorTabs.render();

  // 6. Wire Editor Toolbar Buttons
  if (btnQuickWrap) {
    btnQuickWrap.addEventListener('click', () => {
      editorSettings.toggleWordWrap();
      showToast(`Word wrap: ${editorSettings.get('wordWrap')}`, 'info', 1500);
    });
  }

  if (btnEditorSettings) {
    btnEditorSettings.addEventListener('click', () => {
      settingsModal.show();
    });
  }

  if (btnOpenCheatsheet) {
    btnOpenCheatsheet.addEventListener('click', () => {
      cheatSheet.showModal();
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (confirm('Clear editor content?')) {
        setEditorValue('');
        showToast('Editor cleared', 'info');
      }
    });
  }

  if (btnClearResults) {
    btnClearResults.addEventListener('click', () => {
      resultsViewer.clear();
      showToast('Results cleared', 'info', 1200);
    });
  }

  // 7. Project Switching Handler
  const handleSwitchProject = async (newProj) => {
    activeProject = newProj;
    if (headerActiveProjectName) {
      headerActiveProjectName.textContent = newProj.name;
    }

    if (projectManager) {
      projectManager.updateActiveTriggerName(newProj.name);
    }

    const files = projectStore.getProjectFiles(newProj.id);
    const targetFile = projectStore.getActiveFile(newProj.id);
    resetAllFileModels(files, targetFile.id);
    if (editorTabs) {
      editorTabs.render();
    }

    if (footerStatus) {
      footerStatus.innerHTML = `<span class="spinner-sm"></span> Switching database...`;
    }

    await dbEngine.initProject(newProj.id);

    if (footerStatus) {
      footerStatus.innerHTML = `<span class="footer-indicator-dot"></span> PostgreSQL 16 Engine: Ready`;
    }
    if (footerDb) {
      footerDb.innerHTML = `DB: <code>pg_runner_db_${newProj.id}</code> (IndexedDB)`;
    }

    if (schemaExplorer) {
      await schemaExplorer.refresh();
    }
    resultsViewer.renderInitialState();
  };

  // 8. Initialize Project Manager & Dropdown
  projectManager = new ProjectManager({
    onProjectSwitched: handleSwitchProject,
    onProjectReset: async () => {
      projectStore.resetProjectToStarter(activeProject.id);
      const files = projectStore.getProjectFiles(activeProject.id);
      const targetFile = projectStore.getActiveFile(activeProject.id);
      resetAllFileModels(files, targetFile.id);
      if (editorTabs) editorTabs.render();
      await dbEngine.resetDatabase();
      if (schemaExplorer) await schemaExplorer.refresh();
      resultsViewer.renderInitialState();
      showToast('Database reset successfully', 'info');
    },
    onProjectUpdated: (p, resetSql) => {
      if (resetSql !== null) {
        setEditorValue(resetSql);
      }
      if (editorTabs) editorTabs.render();
    }
  });

  // Wire custom project dropdown in top navigation
  projectManager.initProjectDropdown({
    wrapper: projectDropdownWrapper,
    triggerBtn: btnProjectTrigger,
    triggerName: headerActiveProjectName,
    searchInput: inputSearchPlaygrounds,
    listContainer: dropdownPlaygroundsList,
    btnNew: btnDropdownNewProj,
    btnManage: btnDropdownManageProj
  });

  // 8. Initialize Database Engine with IndexedDB & Manage Initial Loader
  const initialLoader = document.getElementById('initial-loader');
  const loaderStatusText = document.getElementById('loader-status-text');

  const dismissLoader = () => {
    if (initialLoader && !initialLoader.classList.contains('is-hidden')) {
      initialLoader.classList.add('is-hidden');
      setTimeout(() => {
        if (initialLoader.parentNode) {
          initialLoader.remove();
        }
      }, 400);
    }
  };

  // Safety timer so user is never permanently blocked
  const loaderSafetyTimer = setTimeout(dismissLoader, 7000);

  try {
    if (loaderStatusText) {
      loaderStatusText.textContent = 'Booting PostgreSQL 16 WebAssembly...';
    }
    if (footerStatus) {
      footerStatus.innerHTML = `<span class="spinner-sm"></span> Loading PostgreSQL 16 WASM...`;
    }
    await dbEngine.initProject(activeProject.id);
    if (footerStatus) {
      footerStatus.innerHTML = `<span class="footer-indicator-dot"></span> PostgreSQL 16 Engine: Ready`;
    }
    if (footerDb) {
      footerDb.innerHTML = `DB: <code>pg_runner_db_${activeProject.id}</code> (IndexedDB)`;
    }
  } catch (err) {
    console.error('Failed to init PGlite:', err);
    if (footerStatus) {
      footerStatus.innerHTML = `<span style="color: var(--accent-rose);">●</span> Database Init Error`;
    }
    showToast('Failed to initialize database engine', 'error');
  }

  // 9. Initialize Schema Explorer
  try {
    if (loaderStatusText) {
      loaderStatusText.textContent = 'Introspecting database schemas...';
    }
    schemaExplorer = new SchemaExplorer(schemaHost, dbEngine, (schema) => {
      updateSchemaCompletions(schema);
    });
    await schemaExplorer.refresh();
  } catch (schemaErr) {
    console.warn('Initial schema inspection error:', schemaErr);
  } finally {
    clearTimeout(loaderSafetyTimer);
    dismissLoader();
  }

  // 10. Wire Header Action Buttons
  if (btnRun) {
    btnRun.addEventListener('click', () => {
      const selection = getSelectedText();
      executeCode(selection || getEditorValue());
    });
  }

  if (btnFormat) {
    btnFormat.addEventListener('click', () => {
      formatEditorSql();
      showToast('SQL formatted', 'info');
    });
  }

  if (btnResetDb) {
    btnResetDb.addEventListener('click', () => {
      projectManager.showResetDbConfirmModal(activeProject.name, async () => {
        try {
          await dbEngine.resetDatabase();
          if (schemaExplorer) await schemaExplorer.refresh();
          resultsViewer.renderInitialState();
          showToast(`Reset database for "${activeProject.name}"`, 'success');
        } catch (e) {
          console.error('Reset DB error:', e);
          showToast('Failed to reset database', 'error');
        }
      });
    });
  }

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      const next = editorSettings.toggleTheme();
      showToast(`Switched to ${next === 'modern-light' ? 'Modern Light' : 'Postgres Dark'}`, 'info', 1200);
    });
  }

  if (btnExport) {
    btnExport.addEventListener('click', async () => {
      try {
        showToast('Generating SQL dump...', 'info');
        const dump = await dbEngine.exportSqlDump();
        if (!dump) {
          showToast('No tables found to export', 'warning');
          return;
        }
        const blob = new Blob([dump], { type: 'application/sql;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${activeProject.name.toLowerCase().replace(/\s+/g, '_')}_dump.sql`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('SQL dump downloaded successfully!', 'success');
      } catch (e) {
        console.error('Export error:', e);
        showToast('Export failed', 'error');
      }
    });
  }

  if (btnRefreshSchema) {
    btnRefreshSchema.addEventListener('click', () => {
      if (schemaExplorer) schemaExplorer.refresh();
      showToast('Schema refreshed', 'info');
    });
  }

  // 11. Split Gutter Resizing (Editor/Results & Left Sidebar)
  setupSplitGutter();
  setupSidebarResizing();
  setupSidebarToggle();

  // Resize listener
  window.addEventListener('resize', () => {
    const inst = getMonacoInstance();
    if (inst) inst.layout();
  });

  // Initial layout trigger
  setTimeout(() => {
    const inst = getMonacoInstance();
    if (inst) inst.layout();
  }, 150);
}

/**
 * Execute SQL code block smoothly without flashing
 */
async function executeCode(sql) {
  if (!sql || !sql.trim()) {
    showToast('No SQL statement to run', 'warning');
    return;
  }

  const runBtn = document.getElementById('btn-run-query');
  if (runBtn) {
    runBtn.classList.add('is-running');
  }

  try {
    const result = await dbEngine.executeScript(sql);

    if (result.success) {
      clearEditorErrors();
      resultsViewer.renderResults(result);
      if (schemaExplorer) {
        await schemaExplorer.refresh();
      }
    } else {
      resultsViewer.renderError(result.error, result.totalDuration, async () => {
        await dbEngine.resetDatabase();
        if (schemaExplorer) await schemaExplorer.refresh();
        showToast('Database reset. Re-running query...', 'info');
        executeCode(sql);
      });
      if (result.error && result.error.line) {
        setEditorError(result.error.line, result.error.message);
      }
    }
  } catch (err) {
    resultsViewer.renderError({
      message: err.message || String(err),
      friendlyExplanation: 'An unexpected execution error occurred.',
      hint: 'Please check your connection and query syntax.'
    }, 0);
  } finally {
    if (runBtn) {
      runBtn.classList.remove('is-running');
    }
  }
}

/**
 * Setup draggable split pane gutter
 */
function setupSplitGutter() {
  const gutter = document.getElementById('split-gutter');
  const editorPane = document.getElementById('editor-pane');
  const workspace = document.querySelector('.app-body');

  if (!gutter || !editorPane || !workspace) return;

  let isDragging = false;

  gutter.addEventListener('mousedown', () => {
    isDragging = true;
    gutter.classList.add('is-dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const bounds = workspace.getBoundingClientRect();
    const offsetX = e.clientX - bounds.left;
    const totalWidth = bounds.width;
    const percentage = Math.min(Math.max((offsetX / totalWidth) * 100, 20), 80);
    editorPane.style.flex = `0 0 ${percentage}%`;
    const inst = getMonacoInstance();
    if (inst) inst.layout();
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      gutter.classList.remove('is-dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      const inst = getMonacoInstance();
      if (inst) inst.layout();
    }
  });
}

/**
 * Setup draggable left sidebar gutter with limits and localStorage persistence
 */
function setupSidebarResizing() {
  const gutter = document.getElementById('sidebar-gutter');
  const sidebar = document.getElementById('app-sidebar');
  if (!gutter || !sidebar) return;

  const STORAGE_KEY_SIDEBAR_WIDTH = 'pg_runner_sidebar_width';
  const savedWidth = localStorage.getItem(STORAGE_KEY_SIDEBAR_WIDTH);
  if (savedWidth) {
    const parsed = parseInt(savedWidth, 10);
    if (!isNaN(parsed) && parsed >= 180 && parsed <= 500) {
      sidebar.style.width = `${parsed}px`;
    }
  }

  let isDragging = false;

  gutter.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    gutter.classList.add('is-dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const maxWidth = Math.min(500, Math.floor(window.innerWidth * 0.45));
    const newWidth = Math.min(Math.max(e.clientX, 180), maxWidth);
    sidebar.style.width = `${newWidth}px`;

    const inst = getMonacoInstance();
    if (inst) inst.layout();
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      gutter.classList.remove('is-dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem(STORAGE_KEY_SIDEBAR_WIDTH, parseInt(sidebar.style.width, 10));

      const inst = getMonacoInstance();
      if (inst) inst.layout();
    }
  });
}

/**
 * Setup layout toggle buttons and keyboard shortcut (Cmd+B / Ctrl+B) to collapse/expand Explorer sidebar
 */
function setupSidebarToggle() {
  const appLayout = document.getElementById('app');
  const toggleBtn = document.getElementById('btn-toggle-sidebar');
  const STORAGE_KEY_SIDEBAR_COLLAPSED = 'pg_runner_sidebar_collapsed';

  const updateToggleBtnUI = (collapsed) => {
    if (!toggleBtn) return;
    toggleBtn.classList.toggle('is-collapsed', collapsed);
    const iconClose = toggleBtn.querySelector('.icon-sidebar-close');
    const iconOpen = toggleBtn.querySelector('.icon-sidebar-open');
    if (iconClose && iconOpen) {
      iconClose.style.display = collapsed ? 'none' : 'block';
      iconOpen.style.display = collapsed ? 'block' : 'none';
    }
    toggleBtn.setAttribute(
      'data-tooltip',
      collapsed ? 'Expand Sidebar (Cmd+B)' : 'Collapse Sidebar (Cmd+B)'
    );
  };

  const isCollapsed = localStorage.getItem(STORAGE_KEY_SIDEBAR_COLLAPSED) === 'true';
  if (isCollapsed && appLayout) {
    appLayout.classList.add('sidebar-collapsed');
    updateToggleBtnUI(true);
  } else {
    updateToggleBtnUI(false);
  }

  const toggleSidebar = () => {
    if (!appLayout) return;
    const willCollapse = !appLayout.classList.contains('sidebar-collapsed');
    appLayout.classList.toggle('sidebar-collapsed', willCollapse);
    localStorage.setItem(STORAGE_KEY_SIDEBAR_COLLAPSED, willCollapse ? 'true' : 'false');

    updateToggleBtnUI(willCollapse);

    // Trigger Monaco layout after DOM reflow
    const inst = getMonacoInstance();
    if (inst) {
      setTimeout(() => inst.layout(), 40);
    }
  };

  if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);

  // Global shortcut Cmd+B / Ctrl+B to toggle explorer sidebar
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      toggleSidebar();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
