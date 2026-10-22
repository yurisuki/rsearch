globalThis.RsearchShortcut = {
  defaultValue: { key: '.', ctrl: false, alt: false, shift: false, meta: false },
  fromEvent(event) {
    return { key: event.key.length === 1 ? event.key.toLowerCase() : event.key,
      ctrl: event.ctrlKey, alt: event.altKey, shift: event.shiftKey, meta: event.metaKey };
  },
  matches(event, shortcut) {
    if (!shortcut || event.repeat || event.isComposing || event.key === 'Dead' || event.getModifierState?.('AltGraph')) return false;
    const pressed = this.fromEvent(event);
    return ['key', 'ctrl', 'alt', 'shift', 'meta'].every(key => pressed[key] === shortcut[key]);
  },
  label(shortcut) {
    if (!shortcut) return 'Disabled';
    return [shortcut.ctrl && 'Ctrl', shortcut.alt && 'Alt', shortcut.shift && 'Shift', shortcut.meta && 'Meta', shortcut.key === ' ' ? 'Space' : shortcut.key].filter(Boolean).join(' + ');
  },
  isEditing(event) {
    return document.designMode === 'on' || event.composedPath().some(node =>
      node.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName || '') ||
      node.getAttribute?.('role') === 'textbox');
  }
};
