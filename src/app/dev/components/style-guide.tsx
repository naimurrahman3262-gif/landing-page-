"use client";

/*
 * Dev-only style guide. Section titles and demo labels are written inline on
 * purpose: this page is a tool for us, not product copy, so it stays out of
 * messages/en.json. Product components still take every string from next-intl.
 */
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Archive,
  FileText,
  History,
  KeyRound,
  LayoutGrid,
  List,
  Moon,
  MoreHorizontal,
  Pencil,
  Receipt,
  Sun,
  Wallet,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/common/badge";
import { CopyButton } from "@/components/common/copy-button";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { Field } from "@/components/common/field";
import { MoneyText } from "@/components/common/money-text";
import { PageHeader } from "@/components/common/page-header";
import { STATUSES, StatusBadge, type Status } from "@/components/common/status-badge";
import { StatTile } from "@/components/common/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { formatAccountId, formatLeverage, formatMoney, formatDate, formatPercent } from "@/lib/format";
import { STYLEGUIDE as S } from "@/mocks/fixtures/styleguide";

const COLOR_GROUPS: { title: string; tokens: string[] }[] = [
  { title: "Surfaces", tokens: ["bg", "surface-1", "surface-2", "surface-3"] },
  { title: "Borders", tokens: ["border", "border-strong", "border-input"] },
  { title: "Text", tokens: ["text-1", "text-2", "text-3", "primary-text"] },
  { title: "Brand", tokens: ["primary", "primary-hover", "primary-active", "primary-soft", "on-primary"] },
  {
    title: "Semantic",
    tokens: [
      "success",
      "success-text",
      "warning",
      "warning-text",
      "danger",
      "danger-text",
      "info",
      "info-text",
    ],
  },
  { title: "Charts", tokens: ["chart-1", "chart-2", "chart-3", "chart-grid"] },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-20 border-t border-border py-10">
      <h2 id={id} className="mb-6 font-display text-xl font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="mb-3 text-sm font-medium text-text-3">{title}</h3>
      {children}
    </div>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <SegmentedControl value={theme} onValueChange={(v) => setTheme(v as "dark" | "light")} aria-label="Theme">
      <SegmentedControlItem value="dark" aria-label="Dark theme">
        <Moon aria-hidden /> Dark
      </SegmentedControlItem>
      <SegmentedControlItem value="light" aria-label="Light theme">
        <Sun aria-hidden /> Light
      </SegmentedControlItem>
    </SegmentedControl>
  );
}

export function StyleGuide() {
  const [range, setRange] = useState("30d");
  const [view, setView] = useState("grid");
  const [amount, setAmount] = useState("20");
  const amountError =
    Number(amount) < 50 ? "Below the $50.00 minimum for USDT (TRC20). Enter $50.00 or more." : undefined;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 md:px-6 lg:px-8">
      <div className="sticky top-0 z-40 -mx-4 mb-2 flex items-center justify-between gap-4 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <p className="font-display font-bold">Component library</p>
        <ThemeToggle />
      </div>

      <main>
        <PageHeader
          className="mt-8"
          title="Style guide"
          subtitle="Every shared component and state. Development only."
          actions={
            <>
              <Button variant="outline">Secondary action</Button>
              <Button>Primary action</Button>
            </>
          }
        />

        {/* ---------------- Foundations ---------------- */}
        <Section id="colour" title="Colour tokens">
          <div className="grid gap-6 md:grid-cols-2">
            {COLOR_GROUPS.map((group) => (
              <Sub key={group.title} title={group.title}>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {group.tokens.map((token) => (
                    <li key={token} className="overflow-hidden rounded-md border border-border">
                      <div className="h-12" style={{ background: `var(--${token})` }} />
                      <p className="truncate bg-surface-1 px-2 py-1.5 font-mono text-xs text-text-2">
                        --{token}
                      </p>
                    </li>
                  ))}
                </ul>
              </Sub>
            ))}
          </div>
        </Section>

        <Section id="type" title="Typography">
          <div className="grid gap-4">
            <p className="font-display text-4xl font-bold tracking-tight">Display 36 · Satoshi Bold</p>
            <p className="font-display text-3xl font-bold tracking-tight">Page title 30 · Satoshi Bold</p>
            <p className="font-display text-xl font-bold">Section 20 · Satoshi Bold</p>
            <p className="font-display text-base font-medium">Label 16 · Satoshi Medium</p>
            <p className="text-base">
              Body 16 · Inter Regular. Clients manage MT5 accounts, deposit and withdraw.
            </p>
            <p className="text-sm text-text-2">Body small 14 · Inter, secondary text</p>
            <p className="text-xs text-text-3">Caption 12 · Inter, tertiary text</p>
            <Card padding="sm" className="max-w-sm">
              <p className="mb-2 text-xs text-text-3">Tabular figures (Satoshi tnum) align in columns</p>
              <div className="grid font-display tabular">
                {[S.balance, S.wallet, S.moneyIn, S.openPnl].map((n) => (
                  <span key={n} className="text-right">
                    {formatMoney(n)}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        </Section>

        <Section id="radius" title="Radius & elevation">
          <div className="flex flex-wrap gap-4">
            {(["sm", "md", "lg", "xl"] as const).map((r) => (
              <div
                key={r}
                className="grid size-24 place-content-center border border-border-strong bg-surface-2 text-xs text-text-2"
                style={{ borderRadius: `var(--radius-${r})` }}
              >
                radius-{r}
              </div>
            ))}
            <div className="grid size-24 place-content-center rounded-lg bg-surface-2 text-xs text-text-2 shadow-1">
              shadow-1
            </div>
            <div className="grid size-24 place-content-center rounded-lg bg-surface-2 text-xs text-text-2 shadow-2">
              shadow-2
            </div>
          </div>
        </Section>

        <Section id="format" title="Formatters (src/lib/format.ts)">
          <dl className="grid gap-x-8 gap-y-2 font-mono text-sm sm:grid-cols-2">
            {[
              ["formatMoney(75919.7)", formatMoney(S.balance)],
              ["formatMoney(-159203.22)", formatMoney(S.negativeBalance)],
              ["formatMoney(250, sign: always)", formatMoney(S.moneyIn, "USD", { sign: "always" })],
              ["formatMoney(95000, 'USC')", formatMoney(S.centBalance, "USC")],
              [
                "formatDate(…, 'datetime', Asia/Dhaka)",
                formatDate(S.syncedAt, "datetime", { timeZone: "Asia/Dhaka" }),
              ],
              ["formatAccountId(137481)", formatAccountId(S.login)],
              ["formatLeverage(500)", formatLeverage(S.leverage)],
              ["formatPercent(2.4, sign: always)", formatPercent(S.equityDelta, { sign: "always" })],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-border py-1.5">
                <dt className="text-text-3">{k}</dt>
                <dd className="text-text-1">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>

        {/* ---------------- Actions ---------------- */}
        <Section id="buttons" title="Buttons">
          <Sub title="Variants">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Deposit $250.00</Button>
              <Button variant="secondary">Withdraw</Button>
              <Button variant="outline">Transfer</Button>
              <Button variant="ghost">Cancel</Button>
              <Button variant="danger">Archive account</Button>
              <Button variant="link">View all</Button>
            </div>
          </Sub>
          <Sub title="Sizes & icons">
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg">
                <ArrowDownToLine aria-hidden /> Large
              </Button>
              <Button>
                <ArrowDownToLine aria-hidden /> Default (44px)
              </Button>
              <Button size="sm" variant="outline">
                Small (desktop only)
              </Button>
              <Button size="icon" variant="outline" aria-label="Transfer">
                <ArrowLeftRight aria-hidden />
              </Button>
              <Button size="icon-sm" variant="ghost" aria-label="More actions">
                <MoreHorizontal aria-hidden />
              </Button>
            </div>
          </Sub>
          <Sub title="States">
            <div className="flex flex-wrap items-center gap-3">
              <Button loading>Confirm transfer</Button>
              <Button disabled>Disabled</Button>
              <Tooltip content="Nothing to withdraw: free margin is $0.00.">
                <Button variant="secondary" softDisabled>
                  <ArrowUpFromLine aria-hidden /> Withdraw
                </Button>
              </Tooltip>
              <span className="text-xs text-text-3">← disabled with reason (hover, focus or tap)</span>
            </div>
          </Sub>
        </Section>

        {/* ---------------- Data display ---------------- */}
        <Section id="money" title="Money">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Sub title="Balance (xl)">
              <MoneyText amount={S.balance} size="xl" />
            </Sub>
            <Sub title="Cent account">
              <MoneyText amount={S.centBalance} currency="USC" size="lg" />
            </Sub>
            <Sub title="Direction: in / out">
              <div className="grid gap-1">
                <MoneyText amount={S.moneyIn} tone="direction" />
                <MoneyText amount={S.moneyOut} tone="direction" />
              </div>
            </Sub>
            <Sub title="Rejected (voided)">
              <MoneyText amount={S.rejectedDeposit} tone="direction" voided />
            </Sub>
          </div>
        </Section>

        <Section id="status" title="Status badges (single vocabulary)">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STATUSES) as Status[]).map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </div>
          <div className="h-6" />
          <Sub title="Labels (not statuses)">
            <div className="flex flex-wrap gap-2">
              <Badge>Standard</Badge>
              <Badge>Cent</Badge>
              <Badge variant="outline">Campaign</Badge>
              <Badge variant="brand">Default</Badge>
              <Badge variant="brand">New</Badge>
            </div>
          </Sub>
        </Section>

        <Section id="stat" title="Stat tiles">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Total equity"
              value={<MoneyText amount={S.equity} size="lg" />}
              delta={S.equityDelta}
              syncedAt={S.syncedAt}
            />
            <StatTile
              label="Open P/L"
              value={<MoneyText amount={S.openPnl} size="lg" tone="direction" />}
              delta={S.pnlDelta}
              syncedAt={S.syncedAt}
            />
            <StatTile label="Wallet balance" state="loading" />
            <StatTile
              label="Total balance"
              state="error"
              errorAction={
                <Button size="sm" variant="link">
                  Retry
                </Button>
              }
            />
          </div>
        </Section>

        <Section id="cards" title="Cards">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Default card</CardTitle>
                  <CardDescription>surface-1 + border</CardDescription>
                </div>
                <StatusBadge status="active" />
              </CardHeader>
              <MoneyText amount={S.balance} size="lg" />
            </Card>
            <Card interactive tabIndex={0} aria-label="Interactive card example">
              <CardTitle>Interactive</CardTitle>
              <CardDescription>Hover/focus shows a stronger border</CardDescription>
            </Card>
            <Card tone="selected">
              <CardTitle>Selected</CardTitle>
              <CardDescription>Filled tint + cyan border, never just hover</CardDescription>
            </Card>
          </div>
        </Section>

        {/* ---------------- Forms ---------------- */}
        <Section id="forms" title="Form controls">
          <div className="grid gap-6 md:grid-cols-2">
            <Field id="sg-email" label="Email" required hint="We'll send a 6-digit code to this address.">
              {(a) => <Input type="email" placeholder="you@example.com" autoComplete="email" {...a} />}
            </Field>
            <Field id="sg-amount" label="Amount" required error={amountError}>
              {(a) => (
                <Input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  {...a}
                />
              )}
            </Field>
            <Field id="sg-locked" label="Legal name" hint="Verified by KYC. Contact support to change.">
              {(a) => <Input readOnly value="Verified name" {...a} />}
            </Field>
            <Field id="sg-disabled" label="Disabled">
              {(a) => <Input disabled value="Not editable" {...a} />}
            </Field>
            <Field id="sg-country" label="Country">
              {(a) => (
                <Select>
                  <SelectTrigger {...a}>
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent>
                    {S.countries.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
            <div className="grid content-start gap-4">
              <div className="flex items-center gap-3">
                <Checkbox id="sg-terms" />
                <Label htmlFor="sg-terms">I accept the terms</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch id="sg-sound" defaultChecked />
                <Label htmlFor="sg-sound">Sound</Label>
              </div>
              <RadioGroup defaultValue="master" aria-label="Password type" className="flex gap-6">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="master" id="sg-master" />
                  <Label htmlFor="sg-master">Master</Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="investor" id="sg-investor" />
                  <Label htmlFor="sg-investor">Investor</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <div className="h-8" />
          <Sub title="Segmented controls">
            <div className="flex flex-wrap gap-4">
              <SegmentedControl value={range} onValueChange={setRange} aria-label="Date range">
                {["7d", "30d", "90d"].map((r) => (
                  <SegmentedControlItem key={r} value={r}>
                    {r.toUpperCase()}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
              <SegmentedControl value={view} onValueChange={setView} aria-label="View">
                <SegmentedControlItem value="grid" aria-label="Grid view">
                  <LayoutGrid aria-hidden />
                </SegmentedControlItem>
                <SegmentedControlItem value="table" aria-label="Table view">
                  <List aria-hidden />
                </SegmentedControlItem>
              </SegmentedControl>
            </div>
          </Sub>
        </Section>

        <Section id="tabs" title="Tabs">
          <Tabs defaultValue="live">
            <TabsList aria-label="Account type">
              <TabsTrigger value="live">Live</TabsTrigger>
              <TabsTrigger value="demo">Demo</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
            <TabsContent value="live">
              <p className="text-sm text-text-2">Live accounts panel</p>
            </TabsContent>
            <TabsContent value="demo">
              <p className="text-sm text-text-2">Demo accounts panel</p>
            </TabsContent>
            <TabsContent value="archived">
              <p className="text-sm text-text-2">Archived accounts panel</p>
            </TabsContent>
          </Tabs>
        </Section>

        {/* ---------------- Overlays ---------------- */}
        <Section id="overlays" title="Overlays">
          <div className="flex flex-wrap gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Dialog (scrolling body)</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change leverage</DialogTitle>
                  <DialogDescription>
                    {formatAccountId(S.login)} · current {formatLeverage(S.leverage)}
                  </DialogDescription>
                </DialogHeader>
                <DialogBody>
                  <RadioGroup aria-label="New leverage" className="mb-4">
                    {S.leverageOptions.map((l) => (
                      <div key={l} className="flex items-center gap-3">
                        <RadioGroupItem value={String(l)} id={`lev-${l}`} />
                        <Label htmlFor={`lev-${l}`}>{formatLeverage(l)}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {S.longTerms.map((c) => (
                    <p key={c} className="mb-3 text-sm text-text-2">
                      {c}. The body scrolls inside the dialog; the page behind never scrolls.
                    </p>
                  ))}
                </DialogBody>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Cancel</Button>
                  </DialogClose>
                  <Button>Change leverage</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Sheet (right)</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Transaction details</SheetTitle>
                  <SheetDescription>
                    {formatDate(S.syncedAt, "datetime", { timeZone: "Asia/Dhaka" })}
                  </SheetDescription>
                </SheetHeader>
                <SheetBody className="grid content-start gap-4">
                  <MoneyText amount={S.moneyIn} tone="direction" size="xl" />
                  <StatusBadge status="approved" />
                </SheetBody>
                <SheetFooter>
                  <Button variant="outline" block>
                    <Receipt aria-hidden /> Download receipt
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Sheet (bottom, mobile pickers)</Button>
              </SheetTrigger>
              <SheetContent side="bottom">
                <SheetHeader>
                  <SheetTitle>Choose account</SheetTitle>
                </SheetHeader>
                <SheetBody>
                  <Card tone="selected" padding="sm" className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Wallet aria-hidden className="size-4 text-text-2" /> Wallet
                    </span>
                    <MoneyText amount={S.wallet} size="sm" />
                  </Card>
                </SheetBody>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Account actions">
                  <MoreHorizontal aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Manage</DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <Pencil aria-hidden /> Rename label
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <ArrowLeftRight aria-hidden /> Change leverage
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <KeyRound aria-hidden /> Change MT5 password
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>View</DropdownMenuLabel>
                <DropdownMenuItem>
                  <FileText aria-hidden /> Account details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <History aria-hidden /> Positions & history
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="danger">
                  <Archive aria-hidden /> Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Popover</Button>
              </PopoverTrigger>
              <PopoverContent>
                <p className="font-display font-bold">Free margin</p>
                <p className="mt-1 text-sm text-text-2">
                  Equity minus used margin. This is what you can withdraw.
                </p>
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              onClick={() =>
                toast.success("Transfer complete", { description: "Your balances are updated." })
              }
            >
              Toast: success
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast.error("Withdrawal not submitted", {
                  description: "Check your connection and try again.",
                })
              }
            >
              Toast: error
            </Button>
          </div>
        </Section>

        {/* ---------------- Feedback ---------------- */}
        <Section id="states" title="Empty, error & loading states">
          <div className="grid gap-4 md:grid-cols-2">
            <EmptyState
              icon={History}
              title={`No open positions on ${formatAccountId(S.login)}`}
              description="Positions you open in MT5 appear here within a few seconds."
              action={<Button variant="outline">Download platform</Button>}
            />
            <ErrorState
              title="We couldn't load your accounts"
              description="This is usually temporary. Try again in a moment."
              onRetry={() => toast("Retrying…")}
            />
            <ErrorState
              compact
              title="Transactions are unavailable"
              description="Other parts of the page still work."
              onRetry={() => toast("Retrying…")}
            />
            <Card className="grid gap-3" aria-busy>
              <span className="sr-only">Loading</span>
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </Card>
          </div>
        </Section>

        <Section id="misc" title="Utilities">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1 rounded-md border border-border bg-surface-1 py-1 pr-1 pl-3 font-display text-sm">
              {formatAccountId(S.login)}
              <CopyButton value={String(S.login)} label="Copy account ID" />
            </span>
            <CopyButton value={S.referralLink} label="Copy referral link" showText variant="outline" />
          </div>
        </Section>
      </main>
    </div>
  );
}
