/** Browser stub for Node built-ins / optional server-only packages. */

const empty = {};

export default empty;

export function join(...segments: string[]) {
  return segments.filter(Boolean).join("/");
}

export function dirname(filePath: string) {
  const index = filePath.lastIndexOf("/");
  return index >= 0 ? filePath.slice(0, index) : ".";
}

export function resolve(...segments: string[]) {
  return join(...segments);
}

export function basename(filePath: string) {
  const parts = filePath.split("/");
  return parts[parts.length - 1] ?? "";
}

export function fileURLToPath(url: string | URL) {
  return typeof url === "string" ? url : url.pathname;
}
