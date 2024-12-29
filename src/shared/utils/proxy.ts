// Regular fetch for non-streaming requests
export async function proxyFetch(url: string, options: RequestInit = {}) {
  console.log("ProxyFetch called with:", { url, options });
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: "PROXY_REQUEST",
        url,
        options,
      },
      (response) => {
        console.log("Got proxy response:", response);
        if (chrome.runtime.lastError) {
          console.error("Chrome runtime error:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        if (!response.ok) {
          console.error("Request failed:", response.error);
          reject(new Error(response.error || "Request failed"));
          return;
        }

        resolve(response.data);
      }
    );
  });
}

// Streaming fetch that returns an async generator
export async function* proxyFetchStream(
  url: string,
  options: RequestInit = {}
) {
  console.log("ProxyFetchStream called with:", { url, options });

  // First check if we should use port
  console.log("Checking if should use port for streaming");
  const portResponse = await new Promise<{ type: string }>(
    (resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "PROXY_REQUEST",
          url,
          options,
        },
        (response) => {
          console.log("Got port check response:", response);
          if (chrome.runtime.lastError) {
            console.error("Chrome runtime error:", chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(response);
        }
      );
    }
  );

  if (portResponse.type !== "USE_PORT") {
    throw new Error("Expected streaming response");
  }

  // Create a port for streaming
  console.log("Creating streaming port");
  const port = chrome.runtime.connect({ name: "proxy-stream" });

  try {
    // Set up promise to handle port errors
    const errorPromise = new Promise<never>((_, reject) => {
      port.onMessage.addListener((msg) => {
        if (msg.error) {
          console.error("Port error:", msg.error);
          reject(new Error(msg.error));
        }
      });
    });

    // Set up async iterator for chunks
    const chunkPromises: Promise<string>[] = [];
    let resolveNext: ((value: string) => void) | null = null;
    let isDone = false;

    port.onMessage.addListener((msg) => {
      console.log("Got port message:", msg);
      if (msg.error) {
        return; // Error will be handled by errorPromise
      }
      if (msg.done) {
        isDone = true;
        if (resolveNext) {
          resolveNext(""); // Resolve with empty string to break the loop
        }
        return;
      }
      if (msg.chunk) {
        if (resolveNext) {
          resolveNext(msg.chunk);
          resolveNext = null;
        } else {
          chunkPromises.push(Promise.resolve(msg.chunk));
        }
      }
    });

    // Start the streaming request
    console.log("Starting streaming request");
    port.postMessage({ url, options });

    // Yield chunks as they arrive
    while (!isDone) {
      if (chunkPromises.length > 0) {
        const chunk = await chunkPromises.shift()!;
        if (chunk) yield chunk;
      } else {
        const nextChunk = new Promise<string>((resolve) => {
          resolveNext = resolve;
        });
        const chunk = await Promise.race([nextChunk, errorPromise]);
        if (chunk) yield chunk;
      }
    }
  } finally {
    console.log("Closing port");
    port.disconnect();
  }
}
