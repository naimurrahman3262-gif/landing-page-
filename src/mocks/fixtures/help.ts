import type { Article, Ticket } from "@/lib/api/schemas";

/** Help centre articles (mock content). */
export const ARTICLES: Article[] = [
  {
    slug: "how-to-deposit",
    title: "How to deposit",
    category: "Deposits",
    summary: "Choose where the money goes, pick a method, then enter the amount.",
    body: [
      "Open Funds → Deposit. Choose your wallet or a trading account as the destination.",
      "Pick a payment method. We show methods available in your country first; use “Show all methods” to see the rest. Each method lists its processing time, fee and limits.",
      "Enter the amount and check the review: fee, exchange rate, what you'll receive and the processing time.",
      "Follow the payment instructions. The status page updates on its own, and you'll get a notification when the money arrives.",
    ],
    updatedAt: "2026-10-12T09:00:00Z",
    popular: true,
  },
  {
    slug: "withdrawal-rejected",
    title: "Why was my withdrawal rejected?",
    category: "Withdrawals",
    summary: "Common reasons and how to fix each one.",
    body: [
      "The rejection reason is shown on the transaction itself, under its status. Use “Fix and retry” to start a new withdrawal with the details filled in.",
      "Below the minimum: each method has its own minimum, shown when you choose it (USDT (TRC20) is $10.00).",
      "Name mismatch: bank accounts and wallets must be in your own name, exactly as on your verified ID.",
      "Expired documents: upload a new proof of address in Account → Verification.",
    ],
    updatedAt: "2026-10-28T09:00:00Z",
    popular: true,
  },
  {
    slug: "withdrawable-amount",
    title: "How much can I withdraw?",
    category: "Withdrawals",
    summary: "You can withdraw your free margin, excluding credit and open profit.",
    body: [
      "From a trading account you can withdraw up to your free margin, minus any credit (bonus), and never more than your balance.",
      "Profit on open trades isn't withdrawable until you close them. Margin used by open trades isn't available either.",
      "The amount you can withdraw is shown next to each account when you choose where to withdraw from.",
    ],
    updatedAt: "2026-09-02T09:00:00Z",
    popular: false,
  },
  {
    slug: "verify-identity",
    title: "Verifying your identity",
    category: "Verification",
    summary: "What to upload, and how to get it approved first time.",
    body: [
      "We need a government ID (front and back), a proof of address issued in the last 3 months, and a selfie.",
      "Photos must show all four corners, be in focus and have no glare. PDF is accepted for proof of address.",
      "Reviews usually take under 24 hours. You'll get a notification either way.",
    ],
    updatedAt: "2026-08-20T09:00:00Z",
    popular: true,
  },
  {
    slug: "two-step-verification",
    title: "Turning on two-step verification",
    category: "Security",
    summary: "Protect your account with an authenticator app.",
    body: [
      "Go to Account → Security and choose “Turn on”. Scan the QR code with an authenticator app (Google Authenticator, Authy, 1Password…).",
      "Enter the 6-digit code to confirm, then save your backup codes somewhere safe. Each backup code works once.",
      "With two-step verification on, we'll ask for a code when you sign in and before sensitive actions like withdrawals.",
    ],
    updatedAt: "2026-07-14T09:00:00Z",
    popular: false,
  },
  {
    slug: "connect-mt5",
    title: "Connecting to MetaTrader 5",
    category: "Trading",
    summary: "Log in to MT5 with your account number, password and server.",
    body: [
      "Download MT5 from Trading → Platforms.",
      "In MT5, choose File → Login to trade account (or Settings → New account on mobile).",
      "Enter your login, your master password and the server shown on the account's details page.",
    ],
    updatedAt: "2026-06-30T09:00:00Z",
    popular: true,
  },
  {
    slug: "change-leverage",
    title: "Changing leverage",
    category: "Trading",
    summary: "Close open positions first, then choose a new leverage.",
    body: [
      "Leverage can only be changed when the account has no open positions.",
      "Open the account's ⋯ menu and choose Change leverage. You'll confirm with a code.",
      "Higher leverage increases both gains and losses from small price moves.",
    ],
    updatedAt: "2026-05-11T09:00:00Z",
    popular: false,
  },
];

export const ARTICLE_CATEGORIES = ["Deposits", "Withdrawals", "Verification", "Security", "Trading"];

export function seedTickets(now: number): Ticket[] {
  const ago = (h: number) => new Date(now - h * 3_600_000).toISOString();
  return [
    {
      id: "tk_48120",
      number: 48120,
      subject: "Leverage change on MT5 · 137481",
      category: "trading",
      status: "awaitingReply",
      login: 137481,
      transactionId: null,
      createdAt: ago(30),
      updatedAt: ago(26),
      messages: [
        {
          id: "m1",
          author: "client",
          authorName: "Rahim Chowdhury",
          body: "I'd like to change leverage on MT5 · 137481 from 1:500 to 1:200, but the option is blocked.",
          at: ago(30),
          attachments: [],
        },
        {
          id: "m2",
          author: "support",
          authorName: "Nadia · WinproFX Support",
          body: "Hi Rahim, leverage can only be changed when the account has no open positions. You currently have an XAUUSD position open. Once it's closed, you can change leverage from the account's ⋯ menu. Would you like us to do anything else?",
          at: ago(26),
          attachments: [],
        },
      ],
    },
    {
      id: "tk_47755",
      number: 47755,
      subject: "Deposit not credited",
      category: "deposit",
      status: "closed",
      login: null,
      transactionId: null,
      createdAt: ago(24 * 21),
      updatedAt: ago(24 * 20),
      messages: [
        {
          id: "m1",
          author: "client",
          authorName: "Rahim Chowdhury",
          body: "My USDT deposit from this morning isn't showing yet.",
          at: ago(24 * 21),
          attachments: [{ name: "tx-hash.png", size: 182_000 }],
        },
        {
          id: "m2",
          author: "support",
          authorName: "Arif · WinproFX Support",
          body: "Thanks for the screenshot. The network needed extra confirmations; it's now credited to your wallet. Closing this ticket. Reply if anything else comes up.",
          at: ago(24 * 20),
          attachments: [],
        },
      ],
    },
  ];
}
