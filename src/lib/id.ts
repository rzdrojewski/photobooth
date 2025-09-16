export function makeId() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${ts}-${id}`;
}

