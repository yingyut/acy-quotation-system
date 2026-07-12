import Decimal from 'decimal.js';

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

export type DecimalInput = Decimal.Value;

export function toDecimal(value: DecimalInput): Decimal {
  return new Decimal(value ?? 0);
}

/** Round to 2 decimal places (currency precision), returned as a plain number. */
export function round2(value: DecimalInput): number {
  return toDecimal(value).toDecimalPlaces(2).toNumber();
}

export function formatTHB(value: DecimalInput): string {
  const num = round2(value);
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const THAI_DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const THAI_POSITIONS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

function convertSixDigits(numStr: string): string {
  let result = '';
  const len = numStr.length;
  for (let i = 0; i < len; i++) {
    const digit = Number(numStr[i]);
    const position = len - i - 1; // 0 = units, 1 = tens, ...
    if (digit === 0) continue;

    if (position === 0) {
      // Units place
      if (digit === 1 && len > 1) {
        result += 'เอ็ด';
      } else {
        result += THAI_DIGITS[digit];
      }
    } else if (position === 1) {
      // Tens place
      if (digit === 1) {
        result += 'สิบ';
      } else if (digit === 2) {
        result += 'ยี่สิบ';
      } else {
        result += THAI_DIGITS[digit] + 'สิบ';
      }
    } else {
      result += THAI_DIGITS[digit] + THAI_POSITIONS[position];
    }
  }
  return result;
}

/** Converts an integer (as string, no separators) to Thai words, handling ล้าน (million) groups. */
function convertIntegerToThaiWords(intStr: string): string {
  const cleaned = intStr.replace(/^0+(?=\d)/, '');
  if (cleaned === '0' || cleaned === '') return THAI_DIGITS[0];

  const millionGroups: string[] = [];
  let remaining = cleaned;
  while (remaining.length > 6) {
    millionGroups.unshift(remaining.slice(-6));
    remaining = remaining.slice(0, -6);
  }
  millionGroups.unshift(remaining);

  return millionGroups
    .map((group, idx) => {
      if (group === '' || Number(group) === 0) return '';
      const words = convertSixDigits(group);
      const isLast = idx === millionGroups.length - 1;
      return isLast ? words : words + 'ล้าน';
    })
    .join('');
}

/** Converts a THB amount to Thai baht-text, e.g. 1234.50 -> "หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบสตางค์" */
export function bahtText(amount: DecimalInput): string {
  const d = toDecimal(amount).toDecimalPlaces(2);
  const isNegative = d.isNegative();
  const abs = d.abs();
  const [intPart, decPart = '00'] = abs.toFixed(2).split('.');

  const bahtWords = convertIntegerToThaiWords(intPart);
  const satang = Number(decPart);

  let result = (isNegative ? 'ลบ' : '') + bahtWords + 'บาท';
  if (satang === 0) {
    result += 'ถ้วน';
  } else {
    result += convertSixDigits(String(satang).padStart(2, '0')) + 'สตางค์';
  }
  return result;
}
