import { editorSettings, DEFAULT_SETTINGS } from '../state/editorSettings.js';
import { showToast } from './toast.js';

export class SettingsModal {
  constructor() {
    this.modal = null;
  }

  show() {
    this.modal = document.getElementById('settings-modal');
    if (!this.modal) {
      this.modal = document.createElement('div');
      this.modal.id = 'settings-modal';
      this.modal.className = 'modal-backdrop';
      document.body.appendChild(this.modal);
    }

    const current = editorSettings.getAll();

    this.modal.innerHTML = `
      <div class="settings-modal-dialog">
        <div class="settings-header">
          <span class="settings-title">Editor Preferences</span>
          <button class="modal-close" id="btn-close-settings">&times;</button>
        </div>

        <div class="settings-body">
          <!-- Font Size -->
          <div class="preference-item">
            <div class="pref-label-group">
              <span class="pref-title">Font Size</span>
              <span class="pref-caption">Editor text size in pixels</span>
            </div>
            <div class="font-scale-group" style="padding: 2px 4px;">
              <button class="btn-scale-step" id="btn-modal-dec-font" style="width: 24px; height: 24px;">-</button>
              <span class="font-scale-indicator" id="modal-font-val" style="font-size: 11px; padding: 0 8px;">${current.fontSize}px</span>
              <button class="btn-scale-step" id="btn-modal-inc-font" style="width: 24px; height: 24px;">+</button>
            </div>
          </div>

          <!-- Theme -->
          <div class="preference-item">
            <div class="pref-label-group">
              <span class="pref-title">Theme</span>
              <span class="pref-caption">Syntax highlight palette</span>
            </div>
            <select id="setting-theme" class="form-select-sm">
              <option value="postgres-dark" ${current.theme === 'postgres-dark' ? 'selected' : ''}>Dark</option>
              <option value="modern-light" ${current.theme === 'modern-light' ? 'selected' : ''}>Light</option>
              <option value="cyberpunk-neon" ${current.theme === 'cyberpunk-neon' ? 'selected' : ''}>Cyberpunk</option>
              <option value="slate-clean" ${current.theme === 'slate-clean' ? 'selected' : ''}>Slate</option>
            </select>
          </div>

          <!-- Word Wrap -->
          <div class="preference-item">
            <div class="pref-label-group">
              <span class="pref-title">Word Wrap</span>
              <span class="pref-caption">Soft-wrap long lines</span>
            </div>
            <label class="toggle-switch-ui">
              <input type="checkbox" id="setting-word-wrap" ${current.wordWrap === 'on' ? 'checked' : ''} />
              <span class="toggle-track"></span>
            </label>
          </div>

          <!-- Autocomplete / Suggestions -->
          <div class="preference-item">
            <div class="pref-label-group">
              <span class="pref-title">SQL Suggestions</span>
              <span class="pref-caption">Popup keyword and schema autocompletions</span>
            </div>
            <label class="toggle-switch-ui">
              <input type="checkbox" id="setting-autocomplete" ${current.autocomplete !== false ? 'checked' : ''} />
              <span class="toggle-track"></span>
            </label>
          </div>

          <!-- Minimap -->
          <div class="preference-item">
            <div class="pref-label-group">
              <span class="pref-title">Minimap</span>
              <span class="pref-caption">Mini overview scrollbar</span>
            </div>
            <label class="toggle-switch-ui">
              <input type="checkbox" id="setting-minimap" ${current.minimap ? 'checked' : ''} />
              <span class="toggle-track"></span>
            </label>
          </div>

          <!-- Tab Size -->
          <div class="preference-item">
            <div class="pref-label-group">
              <span class="pref-title">Tab Size</span>
              <span class="pref-caption">Spaces per indent</span>
            </div>
            <select id="setting-tab-size" class="form-select-sm">
              <option value="2" ${current.tabSize === 2 ? 'selected' : ''}>2 spaces</option>
              <option value="4" ${current.tabSize === 4 ? 'selected' : ''}>4 spaces</option>
            </select>
          </div>

          <!-- Font Family -->
          <div class="preference-item">
            <div class="pref-label-group">
              <span class="pref-title">Font Family</span>
              <span class="pref-caption">Monospace font family</span>
            </div>
            <select id="setting-font-family" class="form-select-sm">
              <option value="'JetBrains Mono', monospace" ${current.fontFamily.includes('JetBrains') ? 'selected' : ''}>JetBrains Mono</option>
              <option value="'Fira Code', monospace" ${current.fontFamily.includes('Fira Code') ? 'selected' : ''}>Fira Code</option>
              <option value="Menlo, Monaco, monospace" ${current.fontFamily.includes('Menlo') ? 'selected' : ''}>Menlo / Monaco</option>
            </select>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-reset-settings">Reset</button>
          <button class="btn btn-primary" id="btn-done-settings">Done</button>
        </div>
      </div>
    `;

    this.modal.classList.add('is-open');

    const closeModal = () => this.modal.classList.remove('is-open');

    this.modal.querySelector('#btn-close-settings').addEventListener('click', closeModal);
    this.modal.querySelector('#btn-done-settings').addEventListener('click', closeModal);
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) closeModal();
    });

    const fontVal = this.modal.querySelector('#modal-font-val');
    this.modal.querySelector('#btn-modal-dec-font').addEventListener('click', () => {
      editorSettings.decreaseFontSize();
      fontVal.textContent = `${editorSettings.get('fontSize')}px`;
    });
    this.modal.querySelector('#btn-modal-inc-font').addEventListener('click', () => {
      editorSettings.increaseFontSize();
      fontVal.textContent = `${editorSettings.get('fontSize')}px`;
    });

    this.modal.querySelector('#setting-theme').addEventListener('change', (e) => {
      editorSettings.set('theme', e.target.value);
    });

    this.modal.querySelector('#setting-word-wrap').addEventListener('change', (e) => {
      editorSettings.set('wordWrap', e.target.checked ? 'on' : 'off');
    });

    this.modal.querySelector('#setting-autocomplete').addEventListener('change', (e) => {
      editorSettings.set('autocomplete', e.target.checked);
    });

    this.modal.querySelector('#setting-minimap').addEventListener('change', (e) => {
      editorSettings.set('minimap', e.target.checked);
    });

    this.modal.querySelector('#setting-tab-size').addEventListener('change', (e) => {
      editorSettings.set('tabSize', parseInt(e.target.value, 10));
    });

    this.modal.querySelector('#setting-font-family').addEventListener('change', (e) => {
      editorSettings.set('fontFamily', e.target.value);
    });

    this.modal.querySelector('#btn-reset-settings').addEventListener('click', () => {
      editorSettings.update(DEFAULT_SETTINGS);
      closeModal();
      showToast('Reset to defaults', 'info', 1500);
      this.show();
    });
  }
}

export const settingsModal = new SettingsModal();
