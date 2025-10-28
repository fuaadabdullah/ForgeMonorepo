import { formatCost } from '@/lib/utils'
import { CheckCircle, Settings, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { LLMProvider } from '../../../src/types'

// Model metadata for cost/latency tracking
interface ModelMetadata {
  provider: string
  model: string
  inputCostPer1kTokens: number
  outputCostPer1kTokens: number
  avgLatencyMs: number
}

// Known model metadata (approximate costs as of Oct 2025)
const MODEL_METADATA: Record<string, ModelMetadata> = {
  'gpt-4-turbo': {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    inputCostPer1kTokens: 0.01,
    outputCostPer1kTokens: 0.03,
    avgLatencyMs: 2000,
  },
  'gemini-pro': {
    provider: 'gemini',
    model: 'gemini-1.5-pro-latest',
    inputCostPer1kTokens: 0.0035,
    outputCostPer1kTokens: 0.0105,
    avgLatencyMs: 1500,
  },
  'deepseek-chat': {
    provider: 'deepseek',
    model: 'deepseek-chat',
    inputCostPer1kTokens: 0.0014,
    outputCostPer1kTokens: 0.0028,
    avgLatencyMs: 1200,
  },
  'ollama-local': {
    provider: 'ollama',
    model: 'llama3.2',
    inputCostPer1kTokens: 0,
    outputCostPer1kTokens: 0,
    avgLatencyMs: 500,
  },
}

interface ModelStatus {
  name: string
  provider: LLMProvider
  available: boolean
  latency?: number
  cost?: number
  lastChecked?: Date
}

interface ProviderConfig {
  enabled: boolean
  apiKey?: string
  baseURL?: string
  defaultModel?: string
}

export default function ModelsPage() {
  const [models, setModels] = useState<ModelStatus[]>([])
  const [configs, setConfigs] = useState<Record<string, ProviderConfig>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'models' | 'providers'>('models')

  // Initialize with known models
  useEffect(() => {
    const initialModels: ModelStatus[] = Object.values(MODEL_METADATA).map((meta) => ({
      name: meta.model,
      provider: meta.provider as LLMProvider,
      available: false,
      cost: meta.inputCostPer1kTokens + meta.outputCostPer1kTokens,
      latency: meta.avgLatencyMs,
    }))

    // Add Ollama models
    initialModels.push({
      name: 'llama3.1',
      provider: 'ollama' as LLMProvider,
      available: false,
      cost: 0,
      latency: 500,
    })

    setModels(initialModels)

    // Initialize configs
    const initialConfigs: Record<string, ProviderConfig> = {
      openai: { enabled: false, apiKey: '', baseURL: 'https://api.openai.com/v1' },
      gemini: { enabled: false, apiKey: '' },
      deepseek: { enabled: false, apiKey: '', baseURL: 'https://api.deepseek.com' },
      ollama: { enabled: false, baseURL: 'http://localhost:11434', defaultModel: 'llama3.1' },
    }
    setConfigs(initialConfigs)
    setLoading(false)
  }, [])

  const checkModelAvailability = async (model: ModelStatus) => {
    // Simulate API check - in real implementation, this would call the provider
    const isAvailable = Math.random() > 0.3 // 70% success rate for demo
    const latency = model.latency! + (Math.random() - 0.5) * 200

    setModels((prev: ModelStatus[]) =>
      prev.map((m: ModelStatus) =>
        m.name === model.name
          ? { ...m, available: isAvailable, latency: Math.round(latency), lastChecked: new Date() }
          : m
      )
    )
  }

  const updateConfig = (provider: string, key: keyof ProviderConfig, value: string | boolean) => {
    setConfigs((prev: Record<string, ProviderConfig>) => ({
      ...prev,
      [provider]: { ...prev[provider], [key]: value },
    }))
  }

  const saveConfig = (provider: string) => {
    // In real implementation, this would save to backend
    console.log('Saving config for', provider, configs[provider])
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading models...</div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <h2 className="text-2xl font-bold">Model Management</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Tab Navigation */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('models')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'models'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Available Models
            </button>
            <button
              onClick={() => setActiveTab('providers')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'providers'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Provider Configuration
            </button>
          </div>

          {activeTab === 'models' && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {models.map((model) => (
                <div key={model.name} className="rounded-lg border border-border bg-card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">{model.name}</h3>
                    <div
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        model.available
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {model.available ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {model.available ? 'Available' : 'Unavailable'}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground capitalize mb-4">{model.provider}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cost:</span>
                      <span>{model.cost === 0 ? 'Free' : formatCost(model.cost!)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Latency:</span>
                      <span>{model.latency}ms avg</span>
                    </div>
                    {model.lastChecked && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Last checked:</span>
                        <span>{model.lastChecked.toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => checkModelAvailability(model)}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Check Status
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'providers' && (
            <div className="space-y-6">
              {Object.entries(configs).map(([provider, config]) => (
                <div key={provider} className="rounded-lg border border-border bg-card">
                  <div className="border-b border-border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold capitalize">{provider}</h3>
                        <p className="text-sm text-muted-foreground">
                          Configure {provider} provider settings
                        </p>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-sm font-medium">Enabled</span>
                        <input
                          type="checkbox"
                          checked={config.enabled}
                          onChange={(e) => updateConfig(provider, 'enabled', e.target.checked)}
                          className="rounded border border-input"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    {provider !== 'ollama' && (
                      <div>
                        <label
                          htmlFor={`${provider}-api-key`}
                          className="block text-sm font-medium mb-2"
                        >
                          API Key
                        </label>
                        <input
                          id={`${provider}-api-key`}
                          type="password"
                          value={config.apiKey || ''}
                          onChange={(e) => updateConfig(provider, 'apiKey', e.target.value)}
                          placeholder="Enter API key"
                          className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                        />
                      </div>
                    )}

                    {(provider === 'openai' ||
                      provider === 'deepseek' ||
                      provider === 'ollama') && (
                      <div>
                        <label
                          htmlFor={`${provider}-base-url`}
                          className="block text-sm font-medium mb-2"
                        >
                          Base URL
                        </label>
                        <input
                          id={`${provider}-base-url`}
                          type="text"
                          value={config.baseURL || ''}
                          onChange={(e) => updateConfig(provider, 'baseURL', e.target.value)}
                          placeholder="https://api.example.com/v1"
                          className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                        />
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor={`${provider}-default-model`}
                        className="block text-sm font-medium mb-2"
                      >
                        Default Model
                      </label>
                      <select
                        id={`${provider}-default-model`}
                        value={config.defaultModel || ''}
                        onChange={(e) => updateConfig(provider, 'defaultModel', e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                        aria-label={`Select default model for ${provider}`}
                      >
                        <option value="">Select default model</option>
                        {models
                          .filter((m) => m.provider === provider)
                          .map((model) => (
                            <option key={model.name} value={model.name}>
                              {model.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <button
                      onClick={() => saveConfig(provider)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Save Configuration
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
