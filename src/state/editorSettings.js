const STORAGE_KEY_SETTINGS = 'pg_runner_editor_settings_v1';

export const DEFAULT_SETTINGS = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, 'Courier New', monospace",
  tabSize: 2,
  wordWrap: 'on',
  minimap: false,
  lineNumbers: 'on',
  theme: 'postgres-dark',
  autocomplete: true
};

class EditorSettingsManager {
  constructor() {
    this.settings = this.loadSettings();
    this.listeners = new Set();
  }

  loadSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load editor settings:', e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save editor settings:', e);
    }
  }

  get(key) {
    return this.settings[key];
  }

  getAll() {
    return { ...this.settings };
  }

  set(key, value) {
    this.settings[key] = value;
    this.saveSettings();
    this.notify(key, value);
  }

  update(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    for (const [key, value] of Object.entries(newSettings)) {
      this.notify(key, value);
    }
  }

  increaseFontSize() {
    const current = this.settings.fontSize || 14;
    if (current < 26) {
      this.set('fontSize', current + 1);
    }
  }

  decreaseFontSize() {
    const current = this.settings.fontSize || 14;
    if (current > 10) {
      this.set('fontSize', current - 1);
    }
  }

  toggleWordWrap() {
    const current = this.settings.wordWrap === 'on' ? 'off' : 'on';
    this.set('wordWrap', current);
  }

  toggleMinimap() {
    const current = !this.settings.minimap;
    this.set('minimap', current);
  }

  onChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  toggleTheme() {
    const current = this.settings.theme || 'postgres-dark';
    const next = current === 'modern-light' ? 'postgres-dark' : 'modern-light';
    this.set('theme', next);
    return next;
  }

  notify(key, value) {
    if (key === 'theme') {
      applyThemeToDOM(value);
    }
    for (const cb of this.listeners) {
      try {
        cb(key, value, this.settings);
      } catch (e) {
        console.error('Settings listener error:', e);
      }
    }
  }
}

export function applyThemeToDOM(themeName) {
  const theme = themeName || editorSettings.get('theme') || 'postgres-dark';
  document.documentElement.setAttribute('data-theme', theme);
  const sunIcon = document.getElementById('theme-icon-sun');
  const moonIcon = document.getElementById('theme-icon-moon');
  if (sunIcon && moonIcon) {
    if (theme === 'modern-light') {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    }
  }
}

export const editorSettings = new EditorSettingsManager();

// Apply theme on script load
applyThemeToDOM(editorSettings.get('theme'));
