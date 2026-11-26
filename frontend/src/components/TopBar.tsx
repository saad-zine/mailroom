import { MoonIcon } from '@phosphor-icons/react/dist/csr/Moon';
import { SunIcon } from '@phosphor-icons/react/dist/csr/Sun';

export function TopBar({
  theme,
  onToggleTheme,
  onNavigateHome,
}: {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onNavigateHome: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-[70px] shrink-0 items-center justify-between border-b border-white/10 bg-chrome px-5 text-chrome-foreground sm:px-7">
      <button
        type="button"
        onClick={onNavigateHome}
        aria-label="Mailroom home"
        className="flex cursor-pointer items-center gap-2.5 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <img src="/mailroom-bot-mark.png" alt="" className="size-10 object-contain" aria-hidden="true" />
        <span className="text-[17px] font-bold tracking-[-0.04em]">Mailroom</span>
      </button>
      <button
        type="button"
        onClick={onToggleTheme}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        {theme === 'dark' ? <SunIcon size={19} weight="regular" aria-hidden="true" /> : <MoonIcon size={19} weight="regular" aria-hidden="true" />}
      </button>
    </header>
  );
}
