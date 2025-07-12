export function isEmpty(value) {
  return value === undefined || value === null || removeDoubleWhiteSpaces(value) === "";
}

export function removeDoubleWhiteSpaces(value) {
  return value.replace(/\s+/g, " ").trim();
}
