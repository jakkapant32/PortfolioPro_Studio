export function filterBySearch(items, query, fields) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const haystack = fields
      .map((field) => {
        const val = typeof field === 'function' ? field(item) : item[field];
        return val == null ? '' : String(val);
      })
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
