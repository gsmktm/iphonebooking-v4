/* Runs before first paint; shared by the app and its public offline page. */
(() => {
  const key = 'iphonebooking-appearance';
  const valid = (value) => ['light', 'dark', 'system'].includes(value);
  const read = () => {
    try {
      const value = localStorage.getItem(key);
      return valid(value) ? value : 'dark';
    } catch {
      return 'dark';
    }
  };
  let preference = read();
  const system = matchMedia('(prefers-color-scheme: dark)');
  const listeners = new Set();
  const apply = () => {
    const theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    root.style.backgroundColor = theme === 'dark' ? '#071014' : '#faf9f6';
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#071014' : '#faf9f6');
    listeners.forEach((listener) => listener());
  };
  window.iphonebookingAppearance = Object.freeze({
    getSnapshot: () => preference,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setPreference: (value) => {
      if (!valid(value)) return;
      preference = value;
      try {
        localStorage.setItem(key, value);
      } catch {
        /* Private browsing may deny storage. */
      }
      apply();
    },
  });
  system.addEventListener('change', apply);
  window.addEventListener('storage', (event) => {
    if (event.key === key || event.key === null) {
      preference = read();
      apply();
    }
  });
  apply();
})();
