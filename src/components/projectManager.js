import { projectStore, STARTER_PROJECTS } from '../state/projectStore.js';
import { showToast } from './toast.js';

export class ProjectManager {
  constructor({ onProjectSwitched, onProjectReset, onProjectUpdated }) {
    this.onProjectSwitched = onProjectSwitched;
    this.onProjectReset = onProjectReset;
    this.onProjectUpdated = onProjectUpdated;
    this.dropdownElements = null;
    this.searchQuery = '';
  }

  /**
   * Initialize the unified top navigation project dropdown menu
   */
  initProjectDropdown(elements) {
    this.dropdownElements = elements;
    const { wrapper, triggerBtn, searchInput, listContainer, btnNew, btnManage } = elements;

    if (!wrapper || !triggerBtn) return;

    // Toggle dropdown
    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = wrapper.classList.toggle('is-open');
      triggerBtn.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        if (searchInput) {
          searchInput.value = '';
          this.searchQuery = '';
          this.renderDropdownList();
          setTimeout(() => searchInput.focus(), 50);
        } else {
          this.renderDropdownList();
        }
      }
    });

    // Search filter
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderDropdownList();
      });

      // Prevent closing when clicking inside search input
      searchInput.addEventListener('click', (e) => e.stopPropagation());
    }

    // New project button in dropdown
    if (btnNew) {
      btnNew.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeDropdown();
        this.showNewProjectModal();
      });
    }

    // Manage all button in dropdown
    if (btnManage) {
      btnManage.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeDropdown();
        this.showManageProjectsModal();
      });
    }

    // Outside click to close
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        this.closeDropdown();
      }
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && wrapper.classList.contains('is-open')) {
        this.closeDropdown();
      }
    });

    // Initial render of items
    this.renderDropdownList();
  }

  closeDropdown() {
    if (this.dropdownElements?.wrapper) {
      this.dropdownElements.wrapper.classList.remove('is-open');
      this.dropdownElements.triggerBtn?.setAttribute('aria-expanded', 'false');
    }
  }

  updateActiveTriggerName(name) {
    if (this.dropdownElements?.triggerName) {
      this.dropdownElements.triggerName.textContent = name;
    }
    this.renderDropdownList();
  }

  renderDropdownList() {
    if (!this.dropdownElements?.listContainer) return;
    const { listContainer } = this.dropdownElements;

    const allProjects = projectStore.getAllProjects();
    const activeProject = projectStore.getActiveProject();

    const filtered = allProjects.filter(p => {
      if (!this.searchQuery) return true;
      return p.name.toLowerCase().includes(this.searchQuery) ||
             (p.description && p.description.toLowerCase().includes(this.searchQuery));
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="padding: 14px 10px; text-align: center; color: var(--text-muted); font-size: 11px;">
          No playgrounds matching "${escapeHtml(this.searchQuery)}"
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(p => {
      const isActive = p.id === activeProject.id;
      return `
        <div class="dropdown-playground-item ${isActive ? 'active' : ''}" data-id="${p.id}">
          <div class="dp-item-info">
            <div class="dp-item-name-row">
              <span class="dp-item-name">${escapeHtml(p.name)}</span>
              ${p.isPreset ? '<span class="dp-item-tag">Starter</span>' : ''}
            </div>
            <span class="dp-item-desc">${escapeHtml(p.description || 'PostgreSQL Playground')}</span>
          </div>
          ${isActive ? `
            <span class="dp-item-check" title="Active Playground">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
          ` : ''}
        </div>
      `;
    }).join('');

    // Wire clicks
    listContainer.querySelectorAll('.dropdown-playground-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = item.getAttribute('data-id');
        this.closeDropdown();
        if (id !== activeProject.id) {
          projectStore.setActiveProjectId(id);
          const switched = projectStore.getActiveProject();
          this.updateActiveTriggerName(switched.name);
          showToast(`Switched to "${switched.name}"`, 'info', 1500);
          if (this.onProjectSwitched) {
            this.onProjectSwitched(switched);
          }
        }
      });
    });
  }

  showNewProjectModal() {
    let modal = document.getElementById('project-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'project-modal';
      modal.className = 'modal-backdrop';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: var(--accent-blue);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
            </span>
            <span class="modal-title-text">Create Playground</span>
          </div>
          <button class="modal-close" id="btn-modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="new-proj-name" class="form-label">Playground Name</label>
            <input type="text" id="new-proj-name" class="form-control" placeholder="e.g. Flight Booking, Analytics Demo..." autofocus />
          </div>

          <div class="form-group">
            <label for="new-proj-template" class="form-label">Starter Template</label>
            <select id="new-proj-template" class="form-control form-select-sm">
              <option value="blank">Empty Canvas (Blank)</option>
              <option value="employees_starter">Employees &amp; Filtering (Starter)</option>
              <option value="ecommerce_joins">E-Commerce Orders &amp; Multi-Table Joins</option>
              <option value="window_analytics">Window Functions &amp; Running Totals</option>
              <option value="jsonb_arrays">JSONB Documents &amp; Indexing</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-project">Cancel</button>
          <button class="btn btn-primary" id="btn-confirm-create-project">Create Playground</button>
        </div>
      </div>
    `;

    modal.classList.add('is-open');

    const closeModal = () => modal.classList.remove('is-open');

    modal.querySelector('#btn-modal-close').addEventListener('click', closeModal);
    modal.querySelector('#btn-cancel-project').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    const nameInput = modal.querySelector('#new-proj-name');
    nameInput.focus();

    const handleCreate = () => {
      const templateSelect = modal.querySelector('#new-proj-template');
      const name = nameInput.value.trim() || 'New Playground';
      const templateId = templateSelect.value;

      let initialSql = '';
      if (templateId !== 'blank') {
        const starter = STARTER_PROJECTS.find(s => s.id === templateId);
        if (starter) initialSql = starter.sql;
      }

      const newProj = projectStore.createProject(name, 'Custom PostgreSQL Playground', initialSql);
      closeModal();
      this.updateActiveTriggerName(newProj.name);
      showToast(`Created playground "${newProj.name}"`, 'success');
      if (this.onProjectSwitched) {
        this.onProjectSwitched(newProj);
      }
    };

    modal.querySelector('#btn-confirm-create-project').addEventListener('click', handleCreate);
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleCreate();
    });
  }

  showManageProjectsModal() {
    let modal = document.getElementById('manage-projects-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'manage-projects-modal';
      modal.className = 'modal-backdrop';
      document.body.appendChild(modal);
    }

    const selectedIds = new Set();
    let searchQuery = '';

    const closeModal = () => modal.classList.remove('is-open');

    const renderContent = () => {
      const allProjects = projectStore.getAllProjects();
      const active = projectStore.getActiveProject();
      const totalCount = allProjects.length;

      const filtered = allProjects.filter(p => {
        if (!searchQuery) return true;
        const term = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(term) || (p.description && p.description.toLowerCase().includes(term));
      });

      const canDeleteAny = totalCount > 1;
      const allFilteredSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id));

      modal.innerHTML = `
        <div class="modal-dialog modal-lg">
          <div class="modal-header">
            <div class="manage-header-title">
              <div class="manage-header-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
              </div>
              <span class="modal-title-text">Manage Playgrounds</span>
              <span class="manage-count-badge">${totalCount} total</span>
            </div>
            <button class="modal-close" id="btn-manage-close" aria-label="Close modal">&times;</button>
          </div>

          <div class="modal-body">
            <!-- Search & Batch Actions Toolbar -->
            <div class="manage-toolbar">
              <div class="manage-search-wrapper">
                <svg class="manage-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input 
                  type="text" 
                  class="manage-search-input" 
                  id="manage-search-box" 
                  placeholder="Filter playgrounds..." 
                  value="${escapeHtml(searchQuery)}" 
                  autocomplete="off"
                />
                ${searchQuery ? `
                  <button class="manage-search-clear" id="manage-search-clear" title="Clear filter">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                ` : ''}
              </div>

              <div class="manage-toolbar-actions">
                ${selectedIds.size > 0 ? `
                  <div class="manage-batch-toolbar">
                    <div class="batch-count-badge">
                      <span class="batch-count-num">${selectedIds.size}</span>
                      <span>selected</span>
                    </div>
                    <button class="btn-batch-action btn-batch-delete" id="btn-batch-delete" title="Delete selected playgrounds">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      <span>Delete (${selectedIds.size})</span>
                    </button>
                    <button class="btn-batch-action btn-batch-cancel" id="btn-batch-clear" title="Clear selection">
                      Clear
                    </button>
                  </div>
                ` : `
                  <div class="manage-meta-hint">${filtered.length} playgrounds</div>
                `}
              </div>
            </div>

            <!-- Playgrounds Table/List -->
            <div class="manage-table-container">
              ${filtered.length === 0 ? `
                <div class="manage-empty-state">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-muted); margin-bottom: 6px;">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <p>No playgrounds found matching "${escapeHtml(searchQuery)}"</p>
                </div>
              ` : `
                <div class="manage-table">
                  <!-- Table Header -->
                  <div class="manage-table-header">
                    <div class="manage-cell-check">
                      <label class="custom-checkbox" title="Select all playgrounds">
                        <input type="checkbox" id="manage-select-all" ${allFilteredSelected ? 'checked' : ''} />
                        <span class="checkbox-indicator">
                          <svg viewBox="0 0 16 16" fill="none">
                            <path d="M12.2 4.6L6.5 10.3L3.8 7.6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </span>
                      </label>
                    </div>
                    <div class="manage-th-col manage-th-name">PLAYGROUND NAME</div>
                    <div class="manage-th-col manage-th-actions">ACTIONS</div>
                  </div>

                  <!-- Table Rows -->
                  <div class="manage-table-body">
                  ${filtered.map(p => {
                    const isActive = p.id === active.id;
                    const isSelected = selectedIds.has(p.id);
                    const canDeleteThis = totalCount > 1;

                    return `
                      <div class="manage-row ${isActive ? 'is-active' : ''} ${isSelected ? 'is-selected' : ''}" data-id="${p.id}">
                        <div class="manage-cell-check">
                          <label class="custom-checkbox" title="Select playground">
                            <input 
                              type="checkbox" 
                              class="proj-row-checkbox" 
                              data-id="${p.id}" 
                              ${isSelected ? 'checked' : ''} 
                            />
                            <span class="checkbox-indicator">
                              <svg viewBox="0 0 16 16" fill="none">
                                <path d="M12.2 4.6L6.5 10.3L3.8 7.6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
                              </svg>
                            </span>
                          </label>
                        </div>

                        <div class="manage-cell-content">
                          <span class="manage-playground-icon ${isActive ? 'is-active' : ''}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                            </svg>
                          </span>
                          <span class="manage-playground-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span>
                          ${isActive ? `
                            <span class="badge-active-pill">
                              <span class="pulse-dot"></span>Active
                            </span>
                          ` : ''}
                          ${p.isPreset ? '<span class="badge-preset">Preset</span>' : ''}
                        </div>

                        <div class="manage-cell-actions">
                          ${!isActive ? `
                            <button class="btn-switch-proj" data-id="${p.id}" title="Switch to this playground">
                              Switch
                            </button>
                          ` : `
                            <span class="active-current-pill">Current</span>
                          `}
                          
                          <div class="manage-icon-actions">
                            <button 
                              class="manage-icon-btn btn-dup-proj" 
                              data-id="${p.id}" 
                              title="Duplicate playground"
                              aria-label="Duplicate"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            </button>

                            ${p.isPreset ? `
                              <button 
                                class="manage-icon-btn btn-reset-proj" 
                                data-id="${p.id}" 
                                title="Reset code to original template"
                                aria-label="Reset Code"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                                  <path d="M3 3v5h5"></path>
                                </svg>
                              </button>
                            ` : ''}

                            <button 
                              class="manage-icon-btn manage-icon-danger btn-del-proj" 
                              data-id="${p.id}" 
                              title="${canDeleteThis ? 'Delete playground' : 'Cannot delete the only playground'}"
                              aria-label="Delete"
                              ${canDeleteThis ? '' : 'disabled'}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                  </div>
                </div>
              `}
            </div>
          </div>

          <div class="modal-footer">
            <div style="margin-right: auto; font-size: 11px; color: var(--text-muted);">
              ${selectedIds.size > 0 ? `${selectedIds.size} of ${totalCount} selected` : `${totalCount} playgrounds • Click row to switch`}
            </div>
            <button class="btn btn-secondary" id="btn-manage-done">Close</button>
            <button class="btn btn-primary" id="btn-new-from-manage">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 4px;">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>New Playground</span>
            </button>
          </div>
        </div>
      `;

      // Wire close handlers
      modal.querySelector('#btn-manage-close').addEventListener('click', closeModal);
      modal.querySelector('#btn-manage-done').addEventListener('click', closeModal);

      // Search clear handler
      const searchClearBtn = modal.querySelector('#manage-search-clear');
      if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
          searchQuery = '';
          renderContent();
          const updatedBox = modal.querySelector('#manage-search-box');
          if (updatedBox) updatedBox.focus();
        });
      }

      // Search input handler
      const searchBox = modal.querySelector('#manage-search-box');
      if (searchBox) {
        searchBox.addEventListener('input', (e) => {
          searchQuery = e.target.value;
          renderContent();
          // keep focus
          const updatedBox = modal.querySelector('#manage-search-box');
          if (updatedBox) {
            updatedBox.focus();
            updatedBox.selectionStart = updatedBox.selectionEnd = updatedBox.value.length;
          }
        });
      }

      // Select all checkbox
      const selectAllCheck = modal.querySelector('#manage-select-all');
      if (selectAllCheck) {
        selectAllCheck.addEventListener('change', (e) => {
          if (e.target.checked) {
            filtered.forEach(p => selectedIds.add(p.id));
          } else {
            filtered.forEach(p => selectedIds.delete(p.id));
          }
          renderContent();
        });
      }

      // Row click to switch
      modal.querySelectorAll('.manage-row').forEach(row => {
        row.addEventListener('click', (e) => {
          if (e.target.closest('.manage-cell-check') || e.target.closest('.manage-cell-actions')) {
            return;
          }
          const id = row.getAttribute('data-id');
          if (id !== active.id) {
            projectStore.setActiveProjectId(id);
            const p = projectStore.getActiveProject();
            closeModal();
            this.updateActiveTriggerName(p.name);
            showToast(`Switched to "${p.name}"`, 'info');
            if (this.onProjectSwitched) this.onProjectSwitched(p);
          }
        });
      });

      // Row checkboxes
      modal.querySelectorAll('.proj-row-checkbox').forEach(chk => {
        chk.addEventListener('change', (e) => {
          const id = e.target.getAttribute('data-id');
          if (e.target.checked) {
            selectedIds.add(id);
          } else {
            selectedIds.delete(id);
          }
          renderContent();
        });
      });

      // Batch Delete
      const btnBatchDelete = modal.querySelector('#btn-batch-delete');
      if (btnBatchDelete) {
        btnBatchDelete.addEventListener('click', () => {
          const count = selectedIds.size;
          if (count === 0) return;
          if (allProjects.length - count < 1) {
            alert('Cannot delete all playgrounds. At least one must remain.');
            return;
          }
          if (confirm(`Are you sure you want to delete ${count} selected playground${count > 1 ? 's' : ''}?`)) {
            const res = projectStore.deleteProjects(Array.from(selectedIds));
            selectedIds.clear();
            if (res.wasActive) {
              this.updateActiveTriggerName(res.newActive.name);
              if (this.onProjectSwitched) this.onProjectSwitched(res.newActive);
            }
            showToast(`Deleted ${count} playground${count > 1 ? 's' : ''}`, 'info');
            renderContent();
          }
        });
      }

      // Batch Clear
      const btnBatchClear = modal.querySelector('#btn-batch-clear');
      if (btnBatchClear) {
        btnBatchClear.addEventListener('click', () => {
          selectedIds.clear();
          renderContent();
        });
      }

      // New Playground button
      modal.querySelector('#btn-new-from-manage').addEventListener('click', () => {
        closeModal();
        this.showNewProjectModal();
      });

      // Switch button (Explicit Switch action only!)
      modal.querySelectorAll('.btn-switch-proj').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          projectStore.setActiveProjectId(id);
          const p = projectStore.getActiveProject();
          closeModal();
          this.updateActiveTriggerName(p.name);
          showToast(`Switched to "${p.name}"`, 'info');
          if (this.onProjectSwitched) this.onProjectSwitched(p);
        });
      });

      // Duplicate button (Does NOT auto-switch or close!)
      modal.querySelectorAll('.btn-dup-proj').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const cloned = projectStore.duplicateProject(id, false);
          if (cloned) {
            showToast(`Duplicated into "${cloned.name}"`, 'success');
            renderContent();
          }
        });
      });

      // Delete button (Does NOT auto-switch or close modal!)
      modal.querySelectorAll('.btn-del-proj').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const targetProj = allProjects.find(p => p.id === id);
          const targetName = targetProj ? targetProj.name : 'playground';

          if (allProjects.length <= 1) {
            alert('Cannot delete the only remaining playground.');
            return;
          }

          if (confirm(`Are you sure you want to delete "${targetName}"?`)) {
            const res = projectStore.deleteProject(id);
            selectedIds.delete(id);
            if (res.wasActive) {
              this.updateActiveTriggerName(res.newActive.name);
              if (this.onProjectSwitched) this.onProjectSwitched(res.newActive);
            }
            showToast(`Deleted "${targetName}"`, 'info');
            renderContent();
          }
        });
      });

      // Reset Starter Code (Does NOT auto-switch or close modal!)
      modal.querySelectorAll('.btn-reset-proj').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const targetProj = allProjects.find(p => p.id === id);
          const targetName = targetProj ? targetProj.name : 'playground';

          if (confirm(`Reset editor SQL to the starter template for "${targetName}"?`)) {
            const resetSql = projectStore.resetProjectToStarter(id);
            if (id === active.id && this.onProjectUpdated) {
              this.onProjectUpdated(active, resetSql);
            }
            showToast(`Reset code for "${targetName}"`, 'success');
            renderContent();
          }
        });
      });
    };

    renderContent();
    modal.classList.add('is-open');

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  showResetDbConfirmModal(projectName, onConfirm) {
    let modal = document.getElementById('reset-db-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'reset-db-modal';
      modal.className = 'modal-backdrop';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: var(--accent-rose);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </span>
            <span class="modal-title-text text-danger">Reset Playground Database?</span>
          </div>
          <button class="modal-close" id="btn-reset-db-close">&times;</button>
        </div>
        <div class="modal-body">
          <p>This will drop all tables, views, and data inside <strong>${escapeHtml(projectName)}</strong>.</p>
          <p style="margin-top: 8px; font-size: 11px; color: var(--text-muted);">
            Your editor SQL query will remain untouched so you can re-run and rebuild your tables anytime.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-reset-db">Cancel</button>
          <button class="btn btn-danger" id="btn-confirm-reset-db">Yes, Reset Database</button>
        </div>
      </div>
    `;

    modal.classList.add('is-open');
    const closeModal = () => modal.classList.remove('is-open');

    modal.querySelector('#btn-reset-db-close').addEventListener('click', closeModal);
    modal.querySelector('#btn-cancel-reset-db').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    modal.querySelector('#btn-confirm-reset-db').addEventListener('click', async () => {
      closeModal();
      if (onConfirm) await onConfirm();
    });
  }
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
