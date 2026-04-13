export function maskProductPriceInput(value: string) {
  const digits = value.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  const normalized = digits.padStart(3, '0');
  const integerPart = normalized.slice(0, -2).replace(/^0+(?=\d)/, '') || '0';
  const decimalPart = normalized.slice(-2);
  const formattedInteger = Number(integerPart).toLocaleString('pt-BR');

  return `${formattedInteger},${decimalPart}`;
}

export function parseProductPrice(value: string) {
  return parseFloat(value.replace(/\./g, '').replace(',', '.'));
}

export function formatProductPriceInput(value: number) {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
