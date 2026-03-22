/**
 * Normalizes a phone number to the last 10 digits.
 * Strips all non-digit characters (spaces, dashes, parens, country code prefixes)
 * and returns only the last 10 digits.
 *
 * Examples:
 *   "+91 98765 43210"  -> "9876543210"
 *   "(555) 123-4567"   -> "5551234567"
 *   "0987-654-3210"    -> "9876543210"
 *   "98765 43210"      -> "9876543210"
 */
export function normalizePhoneNumber(phone: string): string {
    const digitsOnly = phone.replace(/\D/g, '');
    // Take the last 10 digits to strip country codes
    return digitsOnly.slice(-10);
}
