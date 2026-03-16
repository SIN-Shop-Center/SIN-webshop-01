import type { CDPClient, SessionData } from './session-persistence-types'

export async function captureSessionState(client: CDPClient, sessionId: string): Promise<SessionData> {
  const sessionData: SessionData = {
    sessionId,
    timestamp: Date.now(),
    url: '',
    cookies: [],
    localStorage: {},
    sessionStorage: {},
    scrollPosition: { x: 0, y: 0 },
    formData: {},
  }

  try {
    const locationResult = (await client.send('Runtime.evaluate', {
      expression: 'window.location.href',
    })) as { result: { value: string } }
    sessionData.url = locationResult.result.value
  } catch (error) {
    console.warn('[SessionPersistence] Failed to get URL:', error)
  }

  try {
    const cookiesResult = (await client.send('Storage.getCookies', {})) as { cookies: SessionData['cookies'] }
    sessionData.cookies = cookiesResult.cookies || []
  } catch (error) {
    console.warn('[SessionPersistence] Failed to get cookies:', error)
  }

  try {
    const localStorageResult = (await client.send('Runtime.evaluate', {
      expression: 'JSON.stringify(localStorage)',
    })) as { result: { value: string } }
    sessionData.localStorage = JSON.parse(localStorageResult.result.value || '{}')
  } catch (error) {
    console.warn('[SessionPersistence] Failed to get localStorage:', error)
  }

  try {
    const sessionStorageResult = (await client.send('Runtime.evaluate', {
      expression: 'JSON.stringify(sessionStorage)',
    })) as { result: { value: string } }
    sessionData.sessionStorage = JSON.parse(sessionStorageResult.result.value || '{}')
  } catch (error) {
    console.warn('[SessionPersistence] Failed to get sessionStorage:', error)
  }

  try {
    const scrollResult = (await client.send('Runtime.evaluate', {
      expression: 'JSON.stringify({x: window.scrollX, y: window.scrollY})',
    })) as { result: { value: string } }
    sessionData.scrollPosition = JSON.parse(scrollResult.result.value || '{"x":0,"y":0}')
  } catch (error) {
    console.warn('[SessionPersistence] Failed to get scroll position:', error)
  }

  try {
    const formDataResult = (await client.send('Runtime.evaluate', {
      expression: `
        (function() {
          const data = {};
          const inputs = document.querySelectorAll('input, textarea, select');
          inputs.forEach((input, index) => {
            const name = input.name || input.id || 'field_' + index;
            if (input.type !== 'password' && input.type !== 'hidden') {
              data[name] = input.value;
            }
          });
          return JSON.stringify(data);
        })()
      `,
    })) as { result: { value: string } }
    sessionData.formData = JSON.parse(formDataResult.result.value || '{}')
  } catch (error) {
    console.warn('[SessionPersistence] Failed to get form data:', error)
  }

  return sessionData
}

export async function applySessionState(client: CDPClient, sessionData: SessionData): Promise<void> {
  if (sessionData.url) {
    try {
      await client.send('Page.navigate', { url: sessionData.url })
      await new Promise((resolve) => setTimeout(resolve, 2000))
    } catch (error) {
      console.warn('[SessionPersistence] Failed to navigate to URL:', error)
    }
  }

  if (sessionData.cookies.length > 0) {
    try {
      for (const cookie of sessionData.cookies) {
        await client.send('Network.setCookie', {
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          expires: cookie.expires,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
        })
      }
    } catch (error) {
      console.warn('[SessionPersistence] Failed to restore cookies:', error)
    }
  }

  if (Object.keys(sessionData.localStorage).length > 0) {
    try {
      const localStorageScript = Object.entries(sessionData.localStorage)
        .map(([key, value]) => `localStorage.setItem('${key}', '${value.replace(/'/g, "\\'")}');`)
        .join('')

      await client.send('Runtime.evaluate', { expression: localStorageScript })
    } catch (error) {
      console.warn('[SessionPersistence] Failed to restore localStorage:', error)
    }
  }

  if (Object.keys(sessionData.sessionStorage).length > 0) {
    try {
      const sessionStorageScript = Object.entries(sessionData.sessionStorage)
        .map(([key, value]) => `sessionStorage.setItem('${key}', '${value.replace(/'/g, "\\'")}');`)
        .join('')

      await client.send('Runtime.evaluate', { expression: sessionStorageScript })
    } catch (error) {
      console.warn('[SessionPersistence] Failed to restore sessionStorage:', error)
    }
  }

  try {
    await client.send('Runtime.evaluate', {
      expression: `window.scrollTo(${sessionData.scrollPosition.x}, ${sessionData.scrollPosition.y});`,
    })
  } catch (error) {
    console.warn('[SessionPersistence] Failed to restore scroll position:', error)
  }

  if (Object.keys(sessionData.formData).length > 0) {
    try {
      const formDataScript = Object.entries(sessionData.formData)
        .map(([key, value]) => {
          const escapedValue = value.replace(/'/g, "\\'").replace(/"/g, '\\"')
          return `
            (function() {
              const el = document.querySelector('[name="${key}"], [id="${key}"]');
              if (el) el.value = '${escapedValue}';
            })();
          `
        })
        .join('')

      await client.send('Runtime.evaluate', { expression: formDataScript })
    } catch (error) {
      console.warn('[SessionPersistence] Failed to restore form data:', error)
    }
  }
}

export function filterSensitiveSessionData(sessionData: SessionData, excludedFields: string[]): SessionData {
  const filtered: SessionData = {
    ...sessionData,
    cookies: sessionData.cookies.map((cookie) => {
      const isSensitive = excludedFields.some((field) => cookie.name.toLowerCase().includes(field.toLowerCase()))
      return isSensitive ? { ...cookie, value: '[FILTERED]' } : { ...cookie }
    }),
    localStorage: {},
    sessionStorage: {},
    formData: {},
  }

  for (const [key, value] of Object.entries(sessionData.localStorage)) {
    const isSensitive = excludedFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))
    filtered.localStorage[key] = isSensitive ? '[FILTERED]' : value
  }

  for (const [key, value] of Object.entries(sessionData.sessionStorage)) {
    const isSensitive = excludedFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))
    filtered.sessionStorage[key] = isSensitive ? '[FILTERED]' : value
  }

  for (const [key, value] of Object.entries(sessionData.formData)) {
    const isSensitive = excludedFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))
    filtered.formData[key] = isSensitive ? '[FILTERED]' : value
  }

  return filtered
}
