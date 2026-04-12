export function maskProductPriceInput(value: string) {
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\./g, ',');
  const negative = cleaned.startsWith('-');
  const unsigned = negative ? cleaned.slice(1) : cleaned;
  const [integerPart, ...decimalParts] = unsigned.split(',');
  const decimals = decimalParts.join('').slice(0, 2);
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, '') || integerPart;
  const formatted =
    decimals.length > 0
      ? `${normalizedInteger || '0'},${decimals}`
      : normalizedInteger;

  return negative ? `-${formatted}` : formatted;
}

export function parseProductPrice(value: string) {
  return parseFloat(value.replace(',', '.'));
}

export function formatProductPriceInput(value: number) {
  return value.toFixed(2).replace('.', ',');
}
