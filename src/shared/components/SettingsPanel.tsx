import React, { useState, useCallback, useEffect } from "react";
import type { AIProvider } from "../config";
import { providers } from "../config";
import { ModelSelect } from "./ModelSelect";
import { fetchModels } from "../../content/utils/ai";

interface AIModel {
  id: string;
  name?: string;
}

interface SettingsPanelProps {
  onClose?: () => void;
  showHeader?: boolean;
  className?: string;
  onProviderChange?: (provider: AIProvider) => void;
  onModelChange?: (model: string) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  onClose,
  showHeader = true,
  className = "",
  onProviderChange,
  onModelChange,
}) => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(
    null
  );
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [customBaseUrl, setCustomBaseUrl] = useState<string>("");
  const [customModel, setCustomModel] = useState<string>("");

  const handleFetchModels = useCallback(
    async (provider: AIProvider, key: string) => {
      if (!provider.supportsModelList) return;

      setIsLoadingModels(true);
      setModelError(null);
      try {
        const models = await fetchModels(provider, key, customBaseUrl);
        setAvailableModels(models);
        if (models.length > 0) {
          setSelectedModel(models[0].id);
          chrome.storage.sync.set({ selectedModel: models[0].id });
          onModelChange?.(models[0].id);
        }
      } catch (error) {
        console.error("Error fetching models:", error);
        setModelError("Failed to fetch available models");
        setAvailableModels([]);
        // Use provider's default model when fetch fails
        setSelectedModel(provider.model);
        chrome.storage.sync.set({ selectedModel: provider.model });
        onModelChange?.(provider.model);
      } finally {
        setIsLoadingModels(false);
      }
    },
    [onModelChange, customBaseUrl]
  );

  // Load saved settings
  useEffect(() => {
    chrome.storage.sync.get(
      [
        "apiKey",
        "selectedProvider",
        "selectedModel",
        "customBaseUrl",
        "customModel",
      ],
      (result) => {
        const provider = result.selectedProvider || providers[0];
        const model = result.selectedModel || provider.model;
        const savedCustomBaseUrl = result.customBaseUrl || "";
        const savedCustomModel = result.customModel || "";

        setSelectedProvider(provider);
        setApiKey(result.apiKey || null);
        setSelectedModel(model);
        setCustomBaseUrl(savedCustomBaseUrl);
        setCustomModel(savedCustomModel);

        // Notify parent components
        onProviderChange?.(provider);
        onModelChange?.(model);

        // Only show API key error for non-local providers
        if (!result.apiKey && !provider.isLocal) {
          setApiKeyError("Please set your API key in the extension settings");
        }

        // If it's a local provider with model list support or Google AI, try to fetch models
        if (
          (provider.isLocal && provider.supportsModelList) ||
          provider.name === "Google AI"
        ) {
          handleFetchModels(provider, result.apiKey || "");
        }
      }
    );
  }, [onProviderChange, onModelChange, handleFetchModels]);

  const handleProviderChange = (provider: AIProvider) => {
    setSelectedProvider(provider);

    // Reset model-related state when changing providers
    setSelectedModel(provider.model);
    setAvailableModels([]);
    setModelError(null);

    // Clear API key error if switching to a local provider
    if (provider.isLocal) {
      setApiKeyError(null);
    } else if (!apiKey) {
      setApiKeyError("Please set your API key in the extension settings");
    }

    // Save provider and related settings
    chrome.storage.sync.set({
      selectedProvider: provider,
      selectedModel: provider.model,
    });

    // Notify parent components
    onProviderChange?.(provider);
    onModelChange?.(provider.model);

    // If the provider supports model listing, fetch models
    // For local providers, we don't require an API key
    if (provider.supportsModelList && (provider.isLocal || apiKey)) {
      handleFetchModels(provider, apiKey || "");
    }
  };

  const handleBaseUrlChange = (url: string) => {
    setCustomBaseUrl(url);
    chrome.storage.sync.set({ customBaseUrl: url });

    // If we have a provider and API key, try to fetch models with the new base URL
    if (selectedProvider?.supportsModelList && apiKey) {
      handleFetchModels(selectedProvider, apiKey);
    }
  };

  const handleCustomModelChange = (model: string) => {
    setCustomModel(model);
    setSelectedModel(model);
    chrome.storage.sync.set({
      customModel: model,
      selectedModel: model,
    });
    onModelChange?.(model);
  };

  return (
    <div className={`yt-summary-container ${className}`}>
      {showHeader && (
        <div className="settings-header">
          <h3>AI Provider Settings</h3>
          {onClose && (
            <button onClick={onClose} className="close-button">
              ×
            </button>
          )}
        </div>
      )}
      <div className="settings-content">
        <div className="settings-section">
          <label htmlFor="apiKey">API Key</label>
          <input
            type="password"
            id="apiKey"
            placeholder="Enter your API key"
            className="api-key-input"
            value={apiKey || ""}
            onChange={(e) => {
              const newKey = e.target.value.trim();
              chrome.storage.sync.set({ apiKey: newKey });
              setApiKey(newKey);
              if (!newKey) {
                setApiKeyError("Please set your API key");
              } else {
                setApiKeyError(null);
                if (selectedProvider?.supportsModelList) {
                  handleFetchModels(selectedProvider, newKey);
                }
              }
            }}
          />
        </div>
        <div className="settings-section">
          <label>AI Provider</label>
          {providers.map((provider) => (
            <div
              key={provider.name}
              className={`provider-option ${
                selectedProvider?.name === provider.name ? "selected" : ""
              }`}
              onClick={() => handleProviderChange(provider)}
            >
              {provider.name}
            </div>
          ))}
        </div>

        {selectedProvider?.isLocal && (
          <div className="settings-section">
            <label htmlFor="baseUrl">Base URL</label>
            <input
              type="text"
              id="baseUrl"
              placeholder={selectedProvider.defaultBaseUrl || "Enter base URL"}
              className="base-url-input"
              value={customBaseUrl}
              onChange={(e) => handleBaseUrlChange(e.target.value.trim())}
            />
            <div className="help-text">
              Default: {selectedProvider.defaultBaseUrl || "None"}
            </div>
          </div>
        )}

        {selectedProvider?.requiresModelInput ? (
          <div className="settings-section">
            <label htmlFor="customModel">Model Name</label>
            <input
              type="text"
              id="customModel"
              placeholder="Enter model name"
              className="model-input"
              value={customModel}
              onChange={(e) => handleCustomModelChange(e.target.value.trim())}
            />
          </div>
        ) : (
          selectedProvider &&
          availableModels.length > 0 && (
            <ModelSelect
              provider={selectedProvider}
              models={availableModels}
              selectedModel={selectedModel}
              isLoading={isLoadingModels}
              onChange={(modelId) => {
                setSelectedModel(modelId);
                chrome.storage.sync.set({ selectedModel: modelId });
                onModelChange?.(modelId);
              }}
            />
          )
        )}

        {apiKeyError && <div className="error-message">{apiKeyError}</div>}
        {modelError && <div className="warning-message">{modelError}</div>}
      </div>
    </div>
  );
};
