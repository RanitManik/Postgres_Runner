import { showToast } from './toast.js';

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class EditorTabs {
  constructor(container, {
    projectStore,
    onSelectTab,
    onCreateTab,
    onRenameTab,
    onCloseTab
  } = {}) {
    this.container = container;
    this.projectStore = projectStore;
    this.onSelectTab = onSelectTab;
    this.onCreateTab = onCreateTab;
    this.onRenameTab = onRenameTab;
    this.onCloseTab = onCloseTab;

    this.editingFileId = null;
    this.isSaving = false;
  }

  render() {
    if (!this.container) return;

    const activeProject = this.projectStore.getActiveProject();
    if (!activeProject) {
      this.container.innerHTML = '';
      return;
    }

    const files = this.projectStore.getProjectFiles(activeProject.id);
    const activeFileId = activeProject.activeFileId || files[0]?.id;

    this.container.innerHTML = `
      <div class="editor-tabs-scroll" id="editor-tabs-scroll" tabindex="0" role="tablist" aria-label="SQL Files">
        ${files.map((file) => {
          const isActive = file.id === activeFileId;
          const isEditing = file.id === this.editingFileId;

          return `
            <div class="editor-tab ${isActive ? 'is-active' : ''}" data-file-id="${file.id}" title="${escapeHtml(file.name)}">
              <span class="editor-tab-icon" aria-hidden="true">
                ${isActive && this.isSaving ? `
                  <span class="editor-tab-saving-dot" aria-label="Saving..."></span>
                ` : `
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                `}
              </span>

              ${isEditing ? `
                <input type="text" class="editor-tab-rename-input" data-rename-id="${file.id}" value="${escapeHtml(file.name)}" autocomplete="off" spellcheck="false" />
              ` : `
                <span class="editor-tab-title" data-rename-trigger="${file.id}">${escapeHtml(file.name)}</span>
              `}

              ${files.length > 1 ? `
                <button type="button" class="editor-tab-close" data-close-id="${file.id}" title="Delete ${escapeHtml(file.name)}" aria-label="Close file">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              ` : ''}
            </div>
          `;
        }).join('')}

        <button type="button" class="btn-new-tab" id="btn-new-sql-tab" title="New SQL file" aria-label="New SQL file">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <line x1="8" y1="3" x2="8" y2="13"></line>
            <line x1="3" y1="8" x2="13" y2="8"></line>
          </svg>
        </button>
      </div>
    `;

    this.attachEvents();
    this.scrollActiveTabIntoView();
  }

  attachEvents() {
    const activeProject = this.projectStore.getActiveProject();
    if (!activeProject) return;

    // 1. Tab select on click
    const tabs = this.container.querySelectorAll('.editor-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        if (e.target.closest('.editor-tab-close') || e.target.closest('.editor-tab-rename-input')) {
          return;
        }
        const fileId = tab.dataset.fileId;
        if (fileId && fileId !== activeProject.activeFileId) {
          if (this.onSelectTab) {
            this.onSelectTab(fileId);
          }
        }
      });
    });

    // 2. Tab close on click with explicit confirmation
    const closeBtns = this.container.querySelectorAll('.editor-tab-close');
    closeBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fileId = btn.dataset.closeId;
        const files = this.projectStore.getProjectFiles(activeProject.id);
        const targetFile = files.find(f => f.id === fileId);
        const fileName = targetFile ? targetFile.name : 'this file';

        const confirmed = window.confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`);
        if (!confirmed) return;

        if (fileId && this.onCloseTab) {
          this.onCloseTab(fileId);
        }
      });
    });

    // 3. Double click on title to trigger inline rename
    const titles = this.container.querySelectorAll('[data-rename-trigger]');
    titles.forEach((titleEl) => {
      titleEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const fileId = titleEl.dataset.renameTrigger;
        this.startRenaming(fileId);
      });
    });

    // 4. Rename input handling
    const renameInput = this.container.querySelector('.editor-tab-rename-input');
    if (renameInput) {
      renameInput.focus();
      const dotIdx = renameInput.value.lastIndexOf('.');
      if (dotIdx > 0) {
        renameInput.setSelectionRange(0, dotIdx);
      } else {
        renameInput.select();
      }

      let committed = false;
      const commitRename = () => {
        if (committed) return;
        committed = true;
        const newName = renameInput.value.trim();
        const fileId = renameInput.dataset.renameId;
        this.editingFileId = null;
        if (newName && this.onRenameTab) {
          this.onRenameTab(fileId, newName);
        } else {
          this.render();
        }
      };

      renameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitRename();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          committed = true;
          this.editingFileId = null;
          this.render();
        }
      });

      renameInput.addEventListener('blur', () => {
        commitRename();
      });
    }

    // 5. New file button
    const btnNew = this.container.querySelector('#btn-new-sql-tab');
    if (btnNew) {
      btnNew.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onCreateTab) {
          this.onCreateTab();
        }
      });
    }

    // 6. Scrollable via up/down wheel and arrow keys
    const scrollContainer = this.container.querySelector('#editor-tabs-scroll');
    if (scrollContainer) {
      scrollContainer.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          scrollContainer.scrollLeft += e.deltaY;
        }
      }, { passive: false });

      scrollContainer.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          scrollContainer.scrollLeft += 50;
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          scrollContainer.scrollLeft -= 50;
        }
      });
    }
  }

  startRenaming(fileId) {
    this.editingFileId = fileId;
    this.render();
  }

  setSavingState(isSaving) {
    this.isSaving = isSaving;
    const activeTab = this.container.querySelector('.editor-tab.is-active');
    if (!activeTab) return;
    const iconEl = activeTab.querySelector('.editor-tab-icon');
    if (!iconEl) return;

    if (isSaving) {
      iconEl.innerHTML = `<span class="editor-tab-saving-dot" aria-label="Saving..."></span>`;
    } else {
      iconEl.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      `;
    }
  }

  scrollActiveTabIntoView() {
    const activeTab = this.container.querySelector('.editor-tab.is-active');
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }
}
