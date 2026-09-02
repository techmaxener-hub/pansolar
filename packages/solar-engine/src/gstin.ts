const GSTIN_FORMAT = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const CHECKSUM_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Validates a GSTIN's structural format and its trailing checksum digit
 * (the mod-36 algorithm CBIC uses), so vendor/wholesaler onboarding rejects
 * typos before an order is placed rather than at invoicing time.
 */
export function validateGstin(gstin: string): { valid: boolean; reason?: string } {
  const normalized = gstin.trim().toUpperCase();

  if (!GSTIN_FORMAT.test(normalized)) {
    return { valid: false, reason: 'GSTIN does not match the 15-character CBIC format.' };
  }

  const payload = normalized.slice(0, 14);
  const providedChecksum = normalized[14];

  let factor = 2;
  let sum = 0;
  for (let i = payload.length - 1; i >= 0; i--) {
    const code = CHECKSUM_CHARS.indexOf(payload[i] as string);
    let addend = factor * code;
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / 36) + (addend % 36);
    sum += addend;
  }
  const expectedChecksum = CHECKSUM_CHARS[(36 - (sum % 36)) % 36];

  if (expectedChecksum !== providedChecksum) {
    return { valid: false, reason: 'GSTIN checksum digit is invalid.' };
  }

  return { valid: true };
}

export function extractStateCodeFromGstin(gstin: string): string {
  return gstin.trim().slice(0, 2);
}
