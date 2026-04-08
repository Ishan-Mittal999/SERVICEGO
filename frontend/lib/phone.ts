export const getDigitsOnly = (value: string) => String(value || "").replace(/\D/g, "");

export const normalizeIndianPhone = (value: string) => {
  const digits = getDigitsOnly(value);

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }

  return digits;
};

export const sanitizeIndianPhoneInput = (value: string, maxLength = 10) => {
  return normalizeIndianPhone(value).slice(0, maxLength);
};

export const isValidIndianMobile = (value: string) => {
  return /^\d{10}$/.test(normalizeIndianPhone(value));
};
