/**
 * Converts a number or string representation of a number to Arabic numerals.
 * @param num The number or string to convert.
 * @returns A string with Arabic numerals, or an empty string if input is invalid.
 */
export function convertToArabicNumerals(num: number | string | undefined | null): string {
  if (num === undefined || num === null) return '';

  // Convert the number to a string
  const numStr = num.toString();

  // Map each Latin digit to its Arabic equivalent
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return numStr.replace(/\d/g, d => arabicDigits[parseInt(d)]);
}

// TODO: Add date conversion functions if needed later (e.g., isoToNgbDateStruct) 