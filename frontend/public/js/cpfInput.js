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

const calculateCpfDigit = (cpfBase, factor) => {
  const total = [...cpfBase].reduce(
    (sum, digit, index) => sum + Number(digit) * (factor - index),
    0
  );
  const remainder = (total * 10) % 11;
  return remainder === 10 ? 0 : remainder;
};

const isValidCpf = (value) => {
  const cpf = onlyCpfDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const firstDigit = calculateCpfDigit(cpf.slice(0, 9), 10);
  const secondDigit = calculateCpfDigit(cpf.slice(0, 10), 11);
  return firstDigit === Number(cpf[9]) && secondDigit === Number(cpf[10]);
};

const bindCpfInput = (input) => {
  input.addEventListener('input', () => {
    input.value = formatCpf(input.value);
  });
};

export { bindCpfInput, formatCpf, isValidCpf, maskCpfForList, onlyCpfDigits };
