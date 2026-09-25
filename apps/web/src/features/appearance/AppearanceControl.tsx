import { useId, useSyncExternalStore } from 'react';
import { SunMoon } from 'lucide-react';
import { t } from '../../app/i18n';

type Appearance = 'light' | 'dark' | 'system';
declare global {
  interface Window {
    iphonebookingAppearance: {
      getSnapshot: () => Appearance;
      subscribe: (listener: () => void) => () => void;
      setPreference: (value: Appearance) => void;
    };
  }
}
export function AppearanceControl() {
  const id = useId();
  const store = window.iphonebookingAppearance;
  const preference = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return (
    <div className="appearance-control">
      <SunMoon size={16} aria-hidden="true" />
      <label htmlFor={id} className="sr-only">
        {t('appearance')}
      </label>
      <select
        id={id}
        value={preference}
        onChange={(event) => store.setPreference(event.target.value as Appearance)}
      >
        <option value="dark">{t('darkMode')}</option>
        <option value="light">{t('lightMode')}</option>
        <option value="system">{t('systemMode')}</option>
      </select>
    </div>
  );
}
