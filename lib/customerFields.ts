export type CustomerAddressFields = {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  complement: string;
};

type AddressFieldKey = keyof CustomerAddressFields;

const ADDRESS_FIELD_META: { key: AddressFieldKey; label: string }[] = [
  { key: 'street', label: 'Rua' },
  { key: 'number', label: 'Numero' },
  { key: 'neighborhood', label: 'Bairro' },
  { key: 'city', label: 'Cidade' },
  { key: 'complement', label: 'Complemento' },
];

function trimValue(value?: string | null) {
  return value?.trim() ?? '';
}

export function createEmptyCustomerAddress(): CustomerAddressFields {
  return {
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    complement: '',
  };
}

export function getPhoneDigits(value?: string | null) {
  return (value ?? '').replace(/\D/g, '').slice(0, 11);
}

export function formatCustomerPhone(value?: string | null): string | null {
  const digits = getPhoneDigits(value);

  if (!digits) {
    return null;
  }

  if (digits.length <= 2) {
    return `(${digits}`;
  }

  const areaCode = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (digits.length <= 6) {
    return `(${areaCode}) ${rest}`;
  }

  if (digits.length <= 10) {
    return `(${areaCode}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }

  return `(${areaCode}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

export function maskCustomerPhoneInput(value: string) {
  return formatCustomerPhone(value) ?? '';
}

export function validateCustomerPhone(value: string): string | null {
  const digits = getPhoneDigits(value);

  if (!digits) {
    return null;
  }

  if (digits.length < 10) {
    return 'Use telefone fixo com DDD (10 digitos) ou celular com DDD (11 digitos).';
  }

  if (digits.length > 11) {
    return 'O telefone aceita no maximo 11 digitos com DDD.';
  }

  return null;
}

export function serializeCustomerPhone(value: string): string | null {
  const digits = getPhoneDigits(value);
  return digits || null;
}

export function parseCustomerAddress(value?: string | null): CustomerAddressFields {
  const raw = trimValue(value);
  const empty = createEmptyCustomerAddress();

  if (!raw) {
    return empty;
  }

  const result = createEmptyCustomerAddress();
  let matchedFields = 0;

  for (const line of raw.split(/\r?\n/)) {
    const trimmedLine = trimValue(line);

    if (!trimmedLine) {
      continue;
    }

    const matchedField = ADDRESS_FIELD_META.find(({ label }) =>
      trimmedLine.toLowerCase().startsWith(`${label.toLowerCase()}:`)
    );

    if (!matchedField) {
      continue;
    }

    result[matchedField.key] = trimValue(
      trimmedLine.slice(matchedField.label.length + 1)
    );
    matchedFields += 1;
  }

  if (matchedFields > 0) {
    return result;
  }

  return {
    ...empty,
    street: raw,
  };
}

export function serializeCustomerAddress(
  value: CustomerAddressFields
): string | null {
  const lines = ADDRESS_FIELD_META.map(({ key, label }) => {
    const fieldValue = trimValue(value[key]);
    return fieldValue ? `${label}: ${fieldValue}` : null;
  }).filter((line): line is string => line != null);

  return lines.length > 0 ? lines.join('\n') : null;
}

export function formatCustomerAddress(value?: string | null): string | null {
  const raw = trimValue(value);

  if (!raw) {
    return null;
  }

  const address = parseCustomerAddress(raw);
  const hasStructuredValues = Object.values(address).some(Boolean);

  if (!hasStructuredValues) {
    return null;
  }

  const lineOne =
    address.street && address.number
      ? `${address.street}, ${address.number}`
      : address.street || address.number;
  const region = [address.neighborhood, address.city].filter(Boolean).join(' - ');
  const complement = address.complement ? `Compl.: ${address.complement}` : '';

  return [lineOne, region, complement].filter(Boolean).join(' | ');
}
