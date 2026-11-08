/**
 * Converts a numeric amount to Indian currency words
 * e.g., 75000 -> "Rupees Seventy-Five Thousand Only"
 * e.g., 125042.50 -> "Rupees One Lakh Twenty-Five Thousand Forty-Two and Fifty Paise Only"
 */
const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertBelowThousand(n: number): string {
  let str = '';
  if (n >= 100) {
    str += ones[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += tens[Math.floor(n / 10)] + ' ';
    n %= 10;
  }
  if (n > 0) {
    str += ones[n] + ' ';
  }
  return str.trim();
}

export function numberToWordsIndian(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Rupees Zero Only';

  const isNegative = amount < 0;
  amount = Math.abs(amount);

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let result = '';

  const crore = Math.floor(rupees / 10000000);
  let rem = rupees % 10000000;

  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;

  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;

  const hundreds = rem;

  if (crore > 0) {
    result += convertBelowThousand(crore) + ' Crore ';
  }
  if (lakh > 0) {
    result += convertBelowThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertBelowThousand(thousand) + ' Thousand ';
  }
  if (hundreds > 0) {
    result += convertBelowThousand(hundreds) + ' ';
  }

  result = (isNegative ? 'Minus ' : '') + 'Rupees ' + result.trim();

  if (paise > 0) {
    result += ' and ' + convertBelowThousand(paise) + ' Paise';
  }

  result += ' Only';

  return result.replace(/\s+/g, ' ').trim();
}
