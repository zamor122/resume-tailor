"use client";

import { useState, useEffect } from "react";
import { MODEL_CONFIGS, parseModelKey, DEFAULT_MODEL } from "@/app/config/models-client";
import { ModelConfig } from "@/app/types/model";

interface ModelSelectorProps {
  selectedModel?: string;
  onModelChange?: (modelKey: string) => void;
  sessionId?: string | null;
}

export default function ModelSelector({
  selectedModel,
  onModelChange,
  sessionId,
}: ModelSelectorProps) {
  const [currentModel, setCurrentModel] = useState(selectedModel || DEFAULT_MODEL);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (selectedModel) {
      setCurrentModel(selectedModel);
    }
  }, [selectedModel]);

  const handleModelChange = async (modelKey: string) => {
    setCurrentModel(modelKey);
    setIsUpdating(true);

    // Update session preferences if sessionId is provided
    if (sessionId) {
      try {
        const response = await fetch("/api/mcp/session-manager", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            sessionId,
            data: {
              preferences: {
                modelPreferences: {
                  defaultModel: modelKey,
                },
              },
            },
          }),
        });

        if (!response.ok) {
          console.error("Failed to update session model preference");
        }
      } catch (error) {
        console.error("Error updating model preference:", error);
      }
    }

    onModelChange?.(modelKey);
    setIsUpdating(false);
  };

  const currentConfig = currentModel ? MODEL_CONFIGS[currentModel] : undefined;
  const { provider } = currentModel ? parseModelKey(currentModel) : { provider: '' };

  // Group models by provider
  const modelsByProvider: Record<string, ModelConfig[]> = {};
  Object.values(MODEL_CONFIGS).forEach((config) => {
    if (!modelsByProvider[config.provider]) {
      modelsByProvider[config.provider] = [];
    }
    modelsByProvider[config.provider].push(config);
  });

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-semibold text-gray-300 mb-2 block">
          AI Model
        </label>
        <select
          value={currentModel || DEFAULT_MODEL}
          onChange={(e) => handleModelChange(e.target.value)}
          disabled={isUpdating}
          className="w-full px-3 py-2 rounded-lg bg-white/5 text-gray-300 border border-white/10 
                     focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {Object.entries(modelsByProvider).map(([providerName, models]) => (
            <optgroup key={providerName} label={providerName.toUpperCase()}>
              {models.map((model) => {
                const modelKey = `${model.provider}:${model.modelId}`;
                return (
                  <option key={modelKey} value={modelKey}>
                    {model.name}
                    {model.freeTierLimit ? ` (${model.freeTierLimit})` : ""}
                  </option>
                );
              })}
            </optgroup>
          ))}
        </select>
      </div>

      {currentConfig && (
        <div className="text-xs text-gray-400 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Provider:</span>
            <span className="capitalize">{currentConfig.provider}</span>
          </div>
          {currentConfig.freeTierLimit && (
            <div className="flex items-center gap-2">
              <span className="font-semibold">Free Tier:</span>
              <span>{currentConfig.freeTierLimit}</span>
            </div>
          )}
          {currentConfig.description && (
            <div className="text-gray-500 italic mt-1">
              {currentConfig.description}
            </div>
          )}
        </div>
      )}

      {isUpdating && (
        <div className="text-xs text-primary animate-pulse">
          Updating model preference...
        </div>
      )}
    </div>
  );
}

