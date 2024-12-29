import React, { useState, useCallback, useEffect } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { extractSubtitles } from "../utils/subtitles";
import { generateSummary } from "../utils/ai";
import type { AIProvider } from "../../shared/config";
import { providers } from "../../shared/config";
import { SettingsPanel } from "../../shared/components/SettingsPanel";
import { ChatPanel } from "../../shared/components/ChatPanel";

export const SummaryButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [streamedText, setStreamedText] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(
    null
  );
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Load initial settings on mount
  useEffect(() => {
    chrome.storage.sync.get(
      ["apiKey", "selectedProvider", "selectedModel"],
      (result) => {
        setApiKey(result.apiKey || null);
        setSelectedProvider(result.selectedProvider || providers[0]);
        setSelectedModel(
          result.selectedModel ||
            result.selectedProvider?.model ||
            providers[0].model
        );
      }
    );

    // Listen for changes to settings
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.apiKey) {
        setApiKey(changes.apiKey.newValue || null);
      }
      if (changes.selectedProvider) {
        setSelectedProvider(changes.selectedProvider.newValue || providers[0]);
      }
      if (changes.selectedModel) {
        setSelectedModel(
          changes.selectedModel.newValue ||
            changes.selectedProvider?.newValue?.model ||
            providers[0].model
        );
      }
    });
  }, []);

  // Reset summary when URL changes
  useEffect(() => {
    const resetState = () => {
      setStreamedText("");
      setError(null);
      setIsLoading(false);
      setShowSettings(false);
    };

    // Listen for YouTube's navigation events
    const handleNavigation = (e: Event) => {
      if (e.type === "yt-navigate-finish") {
        resetState();
      }
    };

    // YouTube uses a custom event for navigation
    document.addEventListener("yt-navigate-finish", handleNavigation);

    return () => {
      document.removeEventListener("yt-navigate-finish", handleNavigation);
    };
  }, []);

  const handleToken = useCallback((token: string) => {
    setStreamedText((prev) => prev + token);
  }, []);

  const renderMarkdown = useCallback((text: string) => {
    const rawHtml = marked(text) as string;
    const cleanHtml = DOMPurify.sanitize(rawHtml);
    return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
  }, []);

  const handleSummarize = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setStreamedText("");

      const subtitles = await extractSubtitles();
      if (!subtitles) {
        throw new Error("Could not extract subtitles from this video");
      }

      if (!selectedProvider) {
        throw new Error("Please select an AI provider in settings");
      }

      if (!selectedProvider.isLocal && !apiKey) {
        throw new Error("Please configure your API key in settings");
      }

      const providerWithModel = {
        ...selectedProvider,
        model: selectedModel || selectedProvider.model,
        apiKey: apiKey || "",
      };

      for await (const token of generateSummary(subtitles, providerWithModel)) {
        setStreamedText((prev) => prev + token);
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      setError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );
      setStreamedText("");
    } finally {
      setIsLoading(false);
    }
  };

  if (streamedText) {
    return (
      <div className="yt-summary-container">
        <div className="summary-header">
          <h3>Video Summary</h3>
          <button onClick={() => setStreamedText("")} className="close-button">
            ×
          </button>
        </div>
        <div className="summary-content">
          {renderMarkdown(streamedText)}
          {selectedProvider && (
            <ChatPanel summary={streamedText} provider={selectedProvider} />
          )}
        </div>
      </div>
    );
  }

  if (showSettings) {
    return (
      <SettingsPanel
        onClose={() => setShowSettings(false)}
        showHeader={true}
        onProviderChange={setSelectedProvider}
        onModelChange={setSelectedModel}
      />
    );
  }

  return (
    <div className="yt-summary-container">
      {error ? <div className="error-message">{error}</div> : null}
      <div className="button-container">
        <button
          onClick={handleSummarize}
          disabled={
            isLoading ||
            !selectedProvider ||
            (!selectedProvider.isLocal && !apiKey)
          }
          className="summarize-button"
        >
          {isLoading ? "Summarizing..." : "Summarize"}
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="settings-button"
        >
          ⚙️
        </button>
      </div>
    </div>
  );
};
