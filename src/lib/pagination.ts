export function getPageParam(
  value: string | string[] | undefined,
  pageSize = 20,
) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Math.max(1, Number.parseInt(raw ?? "1", 10) || 1);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function buildQuery(
  params: Record<string, string | undefined>,
  overrides: Record<string, string | undefined> = {},
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...overrides })) {
    if (value) query.set(key, value);
  }
  const suffix = query.toString();
  return suffix ? `?${suffix}` : "";
}
