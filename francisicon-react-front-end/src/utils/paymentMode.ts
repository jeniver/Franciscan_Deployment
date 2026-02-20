export const PAYMENT_MODE_OPTIONS = [
  { label: 'Cash', code: 1 },
  { label: 'Cheque', code: 2 },
  { label: 'TT', code: 3 },
  { label: 'Others', code: 4 },
] as const;

type PaymentModeOption = (typeof PAYMENT_MODE_OPTIONS)[number];

export function paymentModeToCode(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const hit = PAYMENT_MODE_OPTIONS.find((option) => option.code === value);
    return hit ? hit.code : 1;
  }

  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return 1;

  const hit = PAYMENT_MODE_OPTIONS.find((option) => option.label.toLowerCase() === normalized);
  if (hit) return hit.code;

  if (normalized === 'bank transfer') return 3;
  if (normalized === 'credit card' || normalized === 'other') return 4;

  const numeric = Number(normalized);
  if (Number.isFinite(numeric)) {
    const byCode = PAYMENT_MODE_OPTIONS.find((option) => option.code === numeric);
    return byCode ? byCode.code : 1;
  }

  return 4;
}

export function paymentModeToLabel(value: unknown): PaymentModeOption['label'] {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return PAYMENT_MODE_OPTIONS.find((option) => option.code === value)?.label || 'Cash';
  }

  const normalized = String(value ?? '').trim();
  if (!normalized) return 'Cash';

  const byLabel = PAYMENT_MODE_OPTIONS.find(
    (option) => option.label.toLowerCase() === normalized.toLowerCase()
  );
  if (byLabel) return byLabel.label;

  if (normalized.toLowerCase() === 'bank transfer') return 'TT';
  if (normalized.toLowerCase() === 'credit card' || normalized.toLowerCase() === 'other') return 'Others';

  const numeric = Number(normalized);
  if (Number.isFinite(numeric)) {
    return PAYMENT_MODE_OPTIONS.find((option) => option.code === numeric)?.label || 'Cash';
  }

  return 'Others';
}
