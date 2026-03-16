import WebSocket from 'ws'

export function parseCDPMessage(data: WebSocket.Data): any | null {
  try {
    return JSON.parse(data.toString())
  } catch {
    return null
  }
}

export function computeReconnectDelay(reconnectDelay: number, maxReconnectDelay: number, reconnectAttempts: number): number {
  return Math.min(reconnectDelay * Math.pow(2, reconnectAttempts-1), maxReconnectDelay)
}

export async function connectWebSocket(
  url: string,
  timeoutMs: number,
  onMessage: (data: WebSocket.Data) => void,
  onClose: () => void,
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url)
    const timer = setTimeout(() => {
      socket.close()
      reject(new Error('Connection timeout'))
    }, timeoutMs)

    socket.on('open', () => {
      clearTimeout(timer)
      resolve(socket)
    })

    socket.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })

    socket.on('close', onClose)
    socket.on('message', onMessage)
  })
}
