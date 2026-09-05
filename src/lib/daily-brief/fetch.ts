/** fetch with a timeout, throwing a readable error on non-2xx responses. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`${new URL(url).hostname} responded ${res.status}`);
  }

  return res;
}
