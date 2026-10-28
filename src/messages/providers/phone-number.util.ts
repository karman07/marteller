// Fast2SMS's 'numbers' param (both SMS and WhatsApp) wants a bare
// 10-digit Indian mobile number, no country code or separators — strips a
// leading +91/91/0 and any formatting, and rejects anything that doesn't
// reduce to exactly 10 digits starting 6-9 (the valid Indian mobile prefix
// range).
export function normalizeIndianMobileNumber(raw: string): string | null {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);

  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}
