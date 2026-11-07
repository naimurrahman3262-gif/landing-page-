/**
 * Google "G" mark: the provider's brand asset, required by Google's sign-in
 * branding rules. Its colours are the provider's, not ours, so it's the one
 * place fills are not tokens. Kept outside src/components/ui and /common.
 */
export function GoogleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4.5">
      <path
        fill="rgb(66 133 244)"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"
      />
      <path
        fill="rgb(52 168 83)"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="rgb(251 188 5)" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="rgb(234 67 53)"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9Z"
      />
    </svg>
  );
}
