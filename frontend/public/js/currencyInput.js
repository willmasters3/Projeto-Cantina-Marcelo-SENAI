const formatCentsDigits = (digits) => {
  if (!digits) return '';

  const normalizedDigits = digits.replace(/^0+(?=\d)/, '') || '0';
  const paddedDigits = normalizedDigits.padStart(3, '0');
  const integerPart = paddedDigits.slice(0, -2);
  const centsPart = paddedDigits.slice(-2);
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${groupedInteger},${centsPart}`;
};

const normalizeDigits = (digits) => digits.replace(/^0+(?=\d)/, '');

const setInputDigits = (input, digits) => {
  const normalizedDigits = normalizeDigits(digits);
  input.dataset.currencyDigits = normalizedDigits;
  input.value = formatCentsDigits(normalizedDigits);
  input.setSelectionRange(input.value.length, input.value.length);
};

const getInputDigits = (input) => {
  const storedDigits = input.dataset.currencyDigits || '';
  if (input.value === formatCentsDigits(storedDigits)) return storedDigits;
  return normalizeDigits(input.value.replace(/\D/g, ''));
};

const formatCurrencyInputValue = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return formatCentsDigits(digits);
};

const decimalToFormattedCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) return '';

  const cents = Math.round((numericValue + Number.EPSILON) * 100);
  return formatCentsDigits(String(cents));
};

const setCurrencyInputDecimalValue = (input, value) => {
  const formattedValue = decimalToFormattedCurrency(value);
  setInputDigits(input, formattedValue.replace(/\D/g, ''));
};

const formattedCurrencyToDecimal = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return null;

  const normalizedDigits = digits.replace(/^0+(?=\d)/, '') || '0';
  const paddedDigits = normalizedDigits.padStart(3, '0');
  const integerPart = paddedDigits.slice(0, -2).replace(/^0+(?=\d)/, '') || '0';
  return `${integerPart}.${paddedDigits.slice(-2)}`;
};

const formatBRLCurrency = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
}).format(Number(value) || 0);

const bindCurrencyInput = (input) => {
  input.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const navigationKeys = [
      'Tab',
      'Enter',
      'Escape',
      'ArrowLeft',
      'ArrowRight',
      'Home',
      'End'
    ];
    if (navigationKeys.includes(event.key)) return;

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      const hasFullSelection = input.selectionStart === 0
        && input.selectionEnd === input.value.length;
      const digits = hasFullSelection ? '' : getInputDigits(input).slice(0, -1);
      setInputDigits(input, digits);
      return;
    }

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      const hasFullSelection = input.selectionStart === 0
        && input.selectionEnd === input.value.length;
      const currentDigits = hasFullSelection ? '' : getInputDigits(input);
      setInputDigits(input, `${currentDigits}${event.key}`);
      return;
    }

    if (event.key.length === 1 && !/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  });

  input.addEventListener('paste', (event) => {
    event.preventDefault();
    const clipboardText = event.clipboardData?.getData('text') || '';
    const pastedDigits = clipboardText.replace(/\D/g, '');
    const hasFullSelection = input.selectionStart === 0
      && input.selectionEnd === input.value.length;
    const currentDigits = hasFullSelection ? '' : getInputDigits(input);
    setInputDigits(input, `${currentDigits}${pastedDigits}`);
  });

  input.addEventListener('input', (event) => {
    if (event.inputType?.startsWith('delete')) {
      setInputDigits(input, (input.dataset.currencyDigits || '').slice(0, -1));
      return;
    }
    setInputDigits(input, input.value.replace(/\D/g, ''));
  });
};

export {
  bindCurrencyInput,
  decimalToFormattedCurrency,
  formatBRLCurrency,
  formatCurrencyInputValue,
  formattedCurrencyToDecimal,
  setCurrencyInputDecimalValue
};
