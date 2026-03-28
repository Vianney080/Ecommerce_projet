/**
 * Pagination compacte : première / dernière page, fenêtre autour de la page courante, « … » entre les trous.
 * Ex. 100 pages, page 50 → 1 … 48 49 50 51 52 … 100
 */
export function buildPaginationItems(
  currentPage: number,
  totalPages: number,
  delta = 2
): Array<number | "ellipsis"> {
  if (totalPages < 1) return [];
  const c = Math.min(Math.max(1, currentPage), totalPages);
  const range: number[] = [];

  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || (i >= c - delta && i <= c + delta)) {
      range.push(i);
    }
  }

  const out: Array<number | "ellipsis"> = [];
  let prev: number | undefined;

  for (const i of range) {
    if (prev !== undefined) {
      if (i - prev === 2) {
        out.push(prev + 1);
      } else if (i - prev > 1) {
        out.push("ellipsis");
      }
    }
    out.push(i);
    prev = i;
  }

  return out;
}
