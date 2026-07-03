const onlyCpfDigits = (value) => String(value ?? '').replace(/\D/g, '').slice(0, 11);

const formatCpf = (value) => {
  const digits = onlyCpfDigits(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const maskCpfForList = (value) => {
  const digits = onlyCpfDigits(value);
  return digits.length === 11 ? `***.***.***-${digits.slice(-2)}` : '—';
};

const bindCpfInput = (input) => {
  input.addEventListener('input', () => {
    input.value = formatCpf(input.value);
  });
};

export { bindCpfInput, formatCpf, maskCpfForList, onlyCpfDigits };
