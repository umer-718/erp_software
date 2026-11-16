
export function parseIntegerQuantity(value, fieldName = "Quantity", options = {}) {
  const {
    allowZero = false,
    allowNegative = false,
  } = options;

  if (
    value === null ||
    value === undefined ||
    value === "" ||
    typeof value === "boolean"
  ) {
    throw new Error(`${fieldName} is required.`);
  }

  const quantity = Number(value);

  if (!Number.isSafeInteger(quantity)) {
    throw new Error(`${fieldName} must be a whole number.`);
  }

  if (!allowNegative && quantity < 0) {
    throw new Error(`${fieldName} cannot be negative.`);
  }

  if (!allowZero && quantity === 0) {
    throw new Error(`${fieldName} must be greater than zero.`);
  }

  return quantity;
}

export function isIntegerQuantity(value) {
  return (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isSafeInteger(Number(value))
  );
}
