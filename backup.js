// Versioned backups contain only portable user settings, never search queries.
globalThis.RsearchBackup = {
  create(engines, settings) {
    return { format: 'rsearch', version: 1, engines, settings: {
      pageShortcut: settings.pageShortcut === undefined ? RsearchShortcut.defaultValue : settings.pageShortcut,
      rememberQuery: settings.rememberQuery !== false
    } };
  },
  parse(value) {
    if (Array.isArray(value)) return { engines: value };
    if (!value || value.format !== 'rsearch' || value.version !== 1 || !Array.isArray(value.engines)) {
      throw Error('Expected an engine list or a supported rsearch backup.');
    }
    const settings = value.settings;
    if (!settings || typeof settings.rememberQuery !== 'boolean') throw Error('Invalid search preferences in backup.');
    const key = settings.pageShortcut;
    if (key !== null && (!key || typeof key.key !== 'string' || !key.key || key.key.length > 32 ||
        ['Tab', 'Escape', 'Control', 'Alt', 'Shift', 'Meta', 'Dead', 'Unidentified'].includes(key.key) ||
        ['ctrl', 'alt', 'shift', 'meta'].some(name => typeof key[name] !== 'boolean'))) {
      throw Error('Invalid page shortcut in backup.');
    }
    return { engines: value.engines, rememberQuery: settings.rememberQuery,
      pageShortcut: key === null ? null : { key: key.key, ctrl: key.ctrl, alt: key.alt, shift: key.shift, meta: key.meta } };
  }
};
