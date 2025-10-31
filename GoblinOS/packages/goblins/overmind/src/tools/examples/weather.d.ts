import type { ToolDefinition } from '../interface.js'

export interface WeatherData {
  temperature: number
  conditions: string
  humidity: number
  wind_speed: number
  location: string
}

export const weatherTool: ToolDefinition
