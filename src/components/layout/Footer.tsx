export function Footer() {
  return (
    <footer className="border-t border-surface-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <span className="font-display text-lg font-bold text-white">ع</span>
              </div>
              <span className="font-display text-xl font-bold text-surface-900 tracking-tight">
                Awn
              </span>
              <span className="text-sm text-surface-400 font-medium">
                عَوْن
              </span>
            </div>
            <p className="text-sm text-surface-500 max-w-md leading-relaxed">
              A Muslim community built on mutual aid (khidmah). Ask for help or
              lend a hand with anything from janāzah to home repairs, meals to
              Qur&apos;an lessons. Matched in trust, offered as Sadaqah, never
              for a fee.
            </p>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-sm font-semibold text-surface-900 mb-3">
              Community
            </h3>
            <ul className="space-y-2">
              {["How it works", "Ways to help", "When you need a hand", "Trust & safety"].map(
                (item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-surface-500 hover:text-surface-900 transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-surface-900 mb-3">
              Legal
            </h3>
            <ul className="space-y-2">
              {["Privacy Policy", "Terms of Service", "Community Guidelines"].map(
                (item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-surface-500 hover:text-surface-900 transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-surface-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-surface-400">
            &copy; {new Date().getFullYear()} Awn (عَوْن). For the sake of Allah.
          </p>
          <p className="text-xs text-surface-400">
            Serving one another, one good deed at a time.
          </p>
        </div>
      </div>
    </footer>
  );
}
