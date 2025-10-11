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
      if (fixedUrl.includes('?token=') || fixedUrl.includes('?deviceId=')) {
        // Try to extract the path and query from the URL
        try {
          // Parse what we can from the malformed URL
          const urlParts = fixedUrl.match(/(wss?):\/\/([^\/]+)(\/[^?]*)?(.*)?/);
          if (urlParts) {
            const protocol = urlParts[1] || 'ws';
            const host = urlParts[2] || 'localhost:5000';
            const path = urlParts[3] || '/ws/sync'; // Default to /ws/sync if no path found
            const query = urlParts[4] || '';
            
            // Ensure host has port 5000 for localhost
            const finalHost = host.includes('localhost') && !host.includes(':') 
              ? `${host}:5000` 
              : host.replace(':undefined', ':5000');
            
            fixedUrl = `${protocol}://${finalHost}${path}${query}`;
            console.warn(`[WebSocketPatch] Rebuilt URL preserving path: ${fixedUrl}`);
          } else {
            // Fallback if regex doesn't match
            const protocol = fixedUrl.startsWith('wss') ? 'wss' : 'ws';
            const queryMatch = fixedUrl.match(/\?(.+)/);
            const query = queryMatch ? queryMatch[0] : '';
            fixedUrl = `${protocol}://localhost:5000/ws/sync${query}`;
            console.warn(`[WebSocketPatch] Fallback URL rebuild: ${fixedUrl}`);
          }
        } catch (err) {
          console.error(`[WebSocketPatch] Error parsing URL parts:`, err);
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