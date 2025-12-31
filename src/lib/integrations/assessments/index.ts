/**
 * Assessment Integration Connectors
 *
 * Exports all assessment platform connectors and the registry
 */

export * from './base'
export * from './webhook'
export * from './kandi'

import { assessmentConnectorRegistry } from './base'
import { webhookConnector } from './webhook'
import { kandiConnector } from './kandi'

// Register all connectors
assessmentConnectorRegistry.register(webhookConnector)
assessmentConnectorRegistry.register(kandiConnector)

/**
 * Initialize all connectors with configuration from the database
 */
export async function initializeConnectors(configs: Record<string, Record<string, string>>) {
  const connectors = assessmentConnectorRegistry.getAll()

  for (const connector of connectors) {
    const config = configs[connector.name]
    if (config) {
      connector.initialize(config)
    }
  }
}

/**
 * Get connector by platform name
 */
export function getConnector(platform: string) {
  return assessmentConnectorRegistry.get(platform)
}

/**
 * Get all configured connectors
 */
export function getConfiguredConnectors() {
  return assessmentConnectorRegistry.getConfigured()
}

/**
 * Get connectors that support a specific assessment type
 */
export function getConnectorsForType(type: string) {
  return assessmentConnectorRegistry.getSupportingType(type)
}
