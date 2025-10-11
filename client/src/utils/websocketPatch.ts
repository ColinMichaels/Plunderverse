// WebSocket Patch to fix undefined port in fallback URLs
// This patches the native WebSocket constructor to handle URLs with undefined ports

export function patchWebSocket() {
  // Only patch if we're in a browser environment
  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
    console.log('[WebSocketPatch] Not in browser environment, skipping patch');
    return;
  }

  // Store the original WebSocket constructor
  const OriginalWebSocket = window.WebSocket;
  
  // Create a patched WebSocket constructor
  const PatchedWebSocket = function(url: string | URL, protocols?: string | string[]) {
    let fixedUrl = url.toString();
    
    // Check if URL contains "localhost:undefined" and fix it
    if (fixedUrl.includes('localhost:undefined')) {
      // Use port 5000 as the default fallback port
      const defaultPort = '5000';
      fixedUrl = fixedUrl.replace('localhost:undefined', `localhost:${defaultPort}`);
      console.warn(`[WebSocketPatch] Fixed undefined port in URL: ${url} -> ${fixedUrl}`);
    }
    
    // Check for other undefined port patterns (e.g., ":undefined")
    const portUndefinedPattern = /:undefined/g;
    if (portUndefinedPattern.test(fixedUrl)) {
      // Determine the default port based on the protocol
      const isSecure = fixedUrl.startsWith('wss://');
      const defaultPort = isSecure ? '443' : '80';
      
      // However, for local development, we should use 5000
      if (fixedUrl.includes('localhost') || fixedUrl.includes('127.0.0.1')) {
        fixedUrl = fixedUrl.replace(/:undefined/g, ':5000');
      } else {
        fixedUrl = fixedUrl.replace(/:undefined/g, `:${defaultPort}`);
      }
      
      console.warn(`[WebSocketPatch] Fixed undefined port in URL: ${url} -> ${fixedUrl}`);
    }
    
    // Validate the URL before creating the WebSocket
    try {
      new URL(fixedUrl); // This will throw if the URL is invalid
    } catch (error) {
      console.error(`[WebSocketPatch] Invalid URL after fix attempt: ${fixedUrl}`, error);
      // If the URL is still invalid, try one more fix by ensuring it has a valid structure
      if (fixedUrl.includes('?token=')) {
        // Extract the token and rebuild the URL
        const tokenMatch = fixedUrl.match(/\?token=([^&]+)/);
        if (tokenMatch) {
          const token = tokenMatch[1];
          const protocol = fixedUrl.startsWith('wss') ? 'wss' : 'ws';
          fixedUrl = `${protocol}://localhost:5000/?token=${token}`;
          console.warn(`[WebSocketPatch] Rebuilt URL with token: ${fixedUrl}`);
        }
      }
    }
    
    // Create the WebSocket with the fixed URL
    try {
      if (protocols) {
        return new OriginalWebSocket(fixedUrl, protocols);
      } else {
        return new OriginalWebSocket(fixedUrl);
      }
    } catch (error) {
      console.error('[WebSocketPatch] Failed to create WebSocket:', error);
      console.error('[WebSocketPatch] Attempted URL:', fixedUrl);
      console.error('[WebSocketPatch] Original URL:', url);
      throw error;
    }
  } as any;
  
  // Copy static properties and methods from the original WebSocket
  Object.setPrototypeOf(PatchedWebSocket, OriginalWebSocket);
  PatchedWebSocket.prototype = OriginalWebSocket.prototype;
  
  // Copy static constants
  PatchedWebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  PatchedWebSocket.OPEN = OriginalWebSocket.OPEN;
  PatchedWebSocket.CLOSING = OriginalWebSocket.CLOSING;
  PatchedWebSocket.CLOSED = OriginalWebSocket.CLOSED;
  
  // Replace the global WebSocket with our patched version
  (window as any).WebSocket = PatchedWebSocket;
  
  console.log('[WebSocketPatch] WebSocket constructor has been patched to fix undefined ports');
}

// Auto-apply the patch if this module is imported
patchWebSocket();