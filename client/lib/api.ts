const API_BASE = "/api";
const TOKEN_KEY = "selfistar_token";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

type ApiOptions = RequestInit & {
  auth?: boolean;
};

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  const isFormData = options.body instanceof FormData;
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options.auth) {
    const token = getStoredToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    const body = (
      isJson
        ? await response.json().catch(() => ({ message: "Request failed" }))
        : { message: await response.text().catch(() => "Request failed") }
    ) as {
      message?: string;
      issues?: Array<{ path?: string; message?: string }>;
    };
    const issues = body.issues?.map((issue) => issue.message).filter(Boolean);
    const message = issues && issues.length > 0 ? issues.join(", ") : body.message ?? "Request failed";
    throw new Error(message);
  }

  if (!isJson) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Expected JSON from ${API_BASE}${path} but received non-JSON response${
        text.startsWith("<!doctype") ? " (HTML page)" : ""
      }.`,
    );
  }

  return response.json() as Promise<T>;
}

export function mediaUrlFromToken(token: string) {
  return `${API_BASE}/selfies/access/${token}`;
}
