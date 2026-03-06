export function stableKey(parts) {
  return parts.filter(Boolean).join("|");
}