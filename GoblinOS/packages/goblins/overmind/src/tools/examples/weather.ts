/**
 * Weather Tool - Example External HTTP API Integration
 *
 * Demonstrates:
 * - External HTTP API calls
 * - Error handling for network failures
 * - Response parsing and formatting
 * - Parameter validation with enums
 *
 * @module tools/examples/weather
 */

import type { ToolDefinition } from '../interface.js'

/**
 * Weather API response structure (example)
 */
interface WeatherData {
  temperature: number
  conditions: string
  humidity: number
  wind_speed: number
  location: string
}

/**
 * Fetch weather data from external API
 *
 * NOTE: This is a mock implementation for demonstration.
 * In production, replace with actual weather API (OpenWeatherMap, WeatherAPI, etc.)
 */
async function fetchWeatherData(
  location: string,
  units: 'celsius' | 'fahrenheit'
): Promise<WeatherData> {
  // Mock implementation - replace with actual API call
  // Example: const response = await fetch(`https://api.weather.com/v1/current?location=${location}&units=${units}`);

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100))

  // Mock data
  return {
    temperature: units === 'celsius' ? 22 : 72,
    conditions: 'Partly cloudy',
    humidity: 65,
    wind_speed: units === 'celsius' ? 15 : 9,
    location,
  }
}

/**
 * Weather tool definition
 *
 * Allows LLM to fetch current weather conditions for a location
 */
export const weatherTool: ToolDefinition = {
  name: 'get_weather',
  description:
    'Get current weather conditions for a specified location. Returns temperature, conditions, humidity, and wind speed.',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'The city and country (e.g., "San Francisco, USA" or "London, UK")',
      },
      units: {
        type: 'string',
        description: 'Temperature units to use',
        enum: ['celsius', 'fahrenheit'],
      },
    },
    required: ['location'],
  },
  handler: async (args) => {
    try {
      const location = args.location as string
      const units = (args.units as 'celsius' | 'fahrenheit') || 'celsius'

      const data = await fetchWeatherData(location, units)

      return JSON.stringify({
        location: data.location,
        temperature: `${data.temperature}°${units === 'celsius' ? 'C' : 'F'}`,
        conditions: data.conditions,
        humidity: `${data.humidity}%`,
        wind_speed: `${data.wind_speed} ${units === 'celsius' ? 'km/h' : 'mph'}`,
      })
    } catch (error) {
      return JSON.stringify({
        error: 'Failed to fetch weather data',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  },
}

/**
 * Example usage:
 *
 * const messages = [
 *   { role: 'user', content: 'What\'s the weather in Tokyo?' }
 * ];
 *
 * const result = await toolEnabledChat(
 *   { messages, tools: [weatherTool] },
 *   chatFn
 * );
 *
 * // LLM will:
 * // 1. Recognize need for weather data
 * // 2. Call get_weather tool with location="Tokyo, Japan"
 * // 3. Receive weather data
 * // 4. Format natural response: "It's currently 22°C and partly cloudy in Tokyo..."
 */
