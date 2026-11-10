// Small helpers for the admin forms: send JSON or a form, and say what went wrong.
export type ApiResult<T = Record<string, unknown>> = { ok: true; data: T } | { ok: false; error: string };

async function read<T>(res: Response): Promise<ApiResult<T>> {
  const data = await res.json().catch(() => ({}));
  if (res.ok) return { ok: true, data: data as T };
  return { ok: false, error: (data as { error?: string }).error || "Something went wrong. Please try again." };
}

export async function sendJson<T = Record<string, unknown>>(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, { method, headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    return await read<T>(res);
  } catch {
    return { ok: false, error: "Couldn't reach the server. Please try again." };
  }
}

export async function sendForm<T = Record<string, unknown>>(url: string, form: FormData): Promise<ApiResult<T>> {
  try {
    return await read<T>(await fetch(url, { method: "POST", body: form }));
  } catch {
    return { ok: false, error: "Couldn't reach the server. Please try again." };
  }
}

export const inputClass = "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm";
export const labelClass = "flex flex-col gap-1 text-xs font-medium text-gray-600";
export const buttonClass = "rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60";
export const quietButtonClass = "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-brand hover:text-brand disabled:opacity-60";
