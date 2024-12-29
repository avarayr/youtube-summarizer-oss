// Listen for install and update events
chrome.runtime.onInstalled.addListener(() => {
  console.log("YouTube Summary Extension installed");
});

// Handle regular (non-streaming) messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_SETTINGS") {
    chrome.storage.sync.get(["apiKey", "selectedProvider"], (result) => {
      sendResponse(result);
    });
    return true; // Will respond asynchronously
  }

  if (request.type === "PROXY_REQUEST") {
    const { url, options } = request;
    console.log("Proxying request to:", url);

    // Check if this is a streaming request
    const isStreaming =
      options?.body && JSON.parse(options.body).stream === true;

    if (isStreaming) {
      // For streaming requests, tell the content script to open a port
      sendResponse({ type: "USE_PORT" });
      return true;
    }

    // Handle regular (non-streaming) requests
    fetch(url, options)
      .then(async (response) => {
        const data = await response.json();
        sendResponse({ ok: response.ok, data });
      })
      .catch((error) => {
        console.error("Proxy request failed:", error);
        sendResponse({ ok: false, error: error.message });
      });

    return true; // Will respond asynchronously
  }
});

// Handle streaming connections
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "proxy-stream") {
    port.onMessage.addListener(async (request) => {
      const { url, options } = request;

      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          // For streaming responses, don't try to parse JSON on error
          port.postMessage({
            error: `Request failed with status ${response.status}`,
          });
          port.disconnect();
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          port.postMessage({ error: "No response body" });
          port.disconnect();
          return;
        }

        // Stream the response chunks
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk
            .split("\n")
            .filter(
              (line) => line.trim() !== "" && line.trim() !== "data: [DONE]"
            );

          for (const line of lines) {
            try {
              const trimmedLine = line.replace(/^data: /, "").trim();
              if (!trimmedLine) continue;

              const parsed = JSON.parse(trimmedLine);
              if (parsed.choices?.[0]?.delta?.content) {
                port.postMessage({ chunk: parsed.choices[0].delta.content });
              }
            } catch (e) {
              console.warn("Failed to parse streaming response line:", e);
            }
          }
        }

        // Signal stream completion
        port.postMessage({ done: true });
        port.disconnect();
      } catch (error: any) {
        // Type assertion for error
        console.error("Streaming request failed:", error);
        port.postMessage({ error: error?.message || "Unknown error occurred" });
        port.disconnect();
      }
    });
  }
});
