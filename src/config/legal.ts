/**
 * G1: legal details shown in the footer and on auth pages.
 *
 * These are intentionally `null` until the real values are supplied
 * (open question Q3). The Footer must render nothing for a null field —
 * never a placeholder such as "[add address here]".
 */
export interface LegalConfig {
  registeredName: string | null;
  registeredAddress: string | null;
  licenceNumber: string | null;
  regulator: string | null;
  riskLine: string | null;
  /** Long-form risk disclosure shown in the footer's collapsible section. */
  riskDisclosureFull: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
}

export const LEGAL: LegalConfig = {
  registeredName: null,
  registeredAddress: null,
  licenceNumber: null,
  regulator: null,
  riskLine: null,
  riskDisclosureFull: null,
  supportEmail: null,
  supportPhone: null,
};
