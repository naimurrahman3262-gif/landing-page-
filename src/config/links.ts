/**
 * External links. `null` = not supplied yet (open question); the UI hides
 * the link rather than pointing somewhere invented.
 */
export const LINKS = {
  privacy: null as string | null,
  terms: null as string | null,
  riskDisclosure: null as string | null,
  partnerPortal: null as string | null,
  appStore: null as string | null,
  googlePlay: null as string | null,
  leverageTerms: null as string | null,
  /** MT5 web terminal; until supplied, "Trade" opens Platforms. */
  webTerminal: null as string | null,
};

/**
 * MT5 downloads (brief §6.4). Until WinproFX-branded installers are supplied
 * (open question), these are MetaQuotes' official generic builds; clients pick
 * the WinproFX server when they log in. `null` hides the platform.
 */
export const MT5_DOWNLOADS = {
  windows: "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe" as string | null,
  macos: "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/MetaTrader5.pkg.zip" as
    string | null,
  ios: "https://apps.apple.com/app/metatrader-5/id413251709" as string | null,
  android: "https://play.google.com/store/apps/details?id=net.metaquotes.metatrader5" as string | null,
  web: LINKS.webTerminal,
};
