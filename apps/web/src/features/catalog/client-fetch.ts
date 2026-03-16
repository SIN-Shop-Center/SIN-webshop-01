import { REQUEST_TIMEOUT_MS } from './client-constants'

export async function fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    return await fetch(input, {
      ...init,
      keepalive: true,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutHandle)
  }
}
