import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Store, Wrench, UserRound, Download, Smartphone } from 'lucide-react';
import { Dialog } from '../../components/ui';
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [help, setHelp] = useState(false),
    [error, setError] = useState('');
  const [installed, setInstalled] = useState(
    () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
  );
  useEffect(() => {
    const available = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', available);
    window.addEventListener('appinstalled', done);
    return () => {
      window.removeEventListener('beforeinstallprompt', available);
      window.removeEventListener('appinstalled', done);
    };
  }, []);
  if (installed) return null;
  return (
    <>
      <div className="container install-app flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Smartphone size={28} />
          <div>
            <strong>Your Apple world. One tap away.</strong>
            <p>Add iPhoneBooking to your home screen.</p>
          </div>
        </div>
        <button
          className="button secondary"
          onClick={async () => {
            if (!prompt) {
              setHelp(true);
              return;
            }
            try {
              await prompt.prompt();
              const choice = await prompt.userChoice;
              if (choice.outcome === 'accepted') setInstalled(true);
              setPrompt(null);
            } catch {
              setError('Installation could not start. Use your browser menu to add this app.');
              setHelp(true);
            }
          }}
        >
          <Download size={16} />
          Install web app
        </button>
      </div>
      <Dialog
        open={help}
        onClose={() => setHelp(false)}
        title="Add iPhoneBooking to your home screen"
      >
        <p>{error || 'Keep your devices, orders and service updates close.'}</p>
        <p>
          <strong>iPhone or iPad:</strong> Open in Safari, tap Share, then Add to Home Screen.
        </p>
        <p>
          <strong>Android or desktop:</strong> Open your browser menu and choose Install app or Add
          to Home screen when available.
        </p>
        <p className="muted">
          An internet connection is required for current prices, checkout and account updates.
        </p>
      </Dialog>
    </>
  );
}
export function MobileNavigation() {
  const { pathname } = useLocation();
  if (
    pathname.startsWith('/products/') ||
    ['/checkout', '/cart', '/confirmation'].some((p) => pathname.startsWith(p))
  )
    return null;
  return (
    <nav className="mobile-app-nav" aria-label="Mobile app navigation">
      {[
        { to: '/', label: 'Home', Icon: Home },
        { to: '/store', label: 'Shop', Icon: Store },
        { to: '/repair', label: 'Care', Icon: Wrench },
        { to: '/account', label: 'Account', Icon: UserRound },
      ].map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} end={to === '/' || to === '/store'}>
          <Icon size={21} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
