export function isEmpty(value) {
  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }

  if (typeof value === "number") {
    return isNaN(value);
  }

  return value === undefined || value === null || removeDoubleWhiteSpaces(value) === "";
}

export function removeDoubleWhiteSpaces(value) {
  return value.replace(/\s+/g, " ").trim();
}

export function formatTotalValue(value) {
  // Remove caracteres não numéricos e formata com vírgula
  return value
    .toString()
    .replace(/[^0-9]/g, "")
    .replace(/(\d{2})$/, ",$1")
    .replace(",", ".");
}
