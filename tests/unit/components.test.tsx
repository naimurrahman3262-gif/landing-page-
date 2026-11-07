import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MoneyText } from "@/components/common/money-text";
import { StatTile } from "@/components/common/stat-tile";
import { STATUSES, StatusBadge, type Status } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { MINUS } from "@/lib/format";
import messages from "../../messages/en.json";
import { renderWithProviders } from "../render";

describe("MoneyText", () => {
  it("shows direction with sign and the money-in colour", () => {
    renderWithProviders(<MoneyText amount={250} tone="direction" />);
    const el = screen.getByText("+$250.00");
    expect(el).toHaveClass("text-money-in");
  });

  it("keeps outgoing money in the default text colour (direction, not status)", () => {
    renderWithProviders(<MoneyText amount={-1240} tone="direction" />);
    expect(screen.getByText(`${MINUS}$1,240.00`)).toHaveClass("text-money-out");
  });

  it("mutes and strikes through a rejected amount, with screen-reader text (old green +$1.04 bug)", () => {
    renderWithProviders(<MoneyText amount={1.04} tone="direction" voided />);
    const el = screen.getByText(/\+\$1\.04/);
    expect(el).toHaveClass("line-through", "text-text-3");
    expect(el).not.toHaveClass("text-money-in");
    expect(el).toHaveTextContent("(not completed)");
  });

  it("shows cent balances with a USD equivalent", () => {
    renderWithProviders(<MoneyText amount={95000} currency="USC" />);
    expect(screen.getByText("95,000 USC")).toBeInTheDocument();
    expect(screen.getByText("≈ $950.00")).toBeInTheDocument();
  });
});

describe("StatusBadge", () => {
  it.each(Object.keys(STATUSES) as Status[])("%s has a text label and an icon", (status) => {
    const { container } = renderWithProviders(<StatusBadge status={status} />);
    expect(screen.getByText(messages.status[status])).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

describe("StatTile", () => {
  it("shows the sync time in the user's time zone", () => {
    renderWithProviders(<StatTile label="Total equity" value="x" syncedAt="2026-11-07T08:32:00Z" />);
    expect(screen.getByText("Synced 14:32")).toBeInTheDocument();
  });

  it("is busy and value-less while loading", () => {
    const { container } = renderWithProviders(<StatTile label="Wallet" value="never" state="loading" />);
    expect(screen.queryByText("never")).toBeNull();
    expect(container.firstChild).toHaveAttribute("aria-busy", "true");
  });
});

describe("Button", () => {
  it("blocks repeat submits while loading", async () => {
    const onClick = vi.fn();
    renderWithProviders(
      <Button loading onClick={onClick}>
        Confirm transfer
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Confirm transfer" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("softDisabled stays focusable but ignores clicks", async () => {
    const onClick = vi.fn();
    renderWithProviders(
      <Button softDisabled onClick={onClick}>
        Withdraw
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Withdraw" });
    await userEvent.tab();
    expect(btn).toHaveFocus();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
    expect(btn).toHaveAttribute("aria-disabled", "true");
  });
});
