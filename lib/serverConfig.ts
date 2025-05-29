/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Represents the server-side configuration for the application.
 * In a real-world scenario, this data would be securely managed and accessed via a backend API.
 */
export interface ServerConfig {
  // The percentage markup to be added to the AI inference cost.
  // For example, a value of 0.2 means a 20% markup.
  adminMarkupPercentage: number;

  // Alby API key for payment verification or other backend interactions.
  // IMPORTANT: This should be kept secret on a server and not exposed to the client.
  // Example: 'YOUR_ALBY_API_KEY' (store securely in environment variables on the server)
  albyApiKey?: string;

  // Specifies the preferred Lightning integration method.
  // 'alby_api' -  Use Alby's cloud APIs for invoice generation and payment verification.
  // 'lndhub' - Connect to a self-hosted or managed LNDHub instance.
  lightningIntegrationMethod: 'alby_api' | 'lndhub';

  // If using LNDHub, connection details might be needed here.
  // lndHubUrl?: string;
  // lndHubLogin?: string;
  // lndHubPassword?: string;

  // Endpoint for your backend that can securely use Alby API key to check invoice status
  // Example: '/api/check-invoice'
  paymentVerificationEndpoint?: string;
}

/**
 * Placeholder for server configuration.
 * In a deployed application, these values would be loaded from environment variables
 * or a secure configuration management system on the server-side.
 */
export const getServerConfig = (): ServerConfig => {
  // These are default/example values.
  // In a real application, the backend would provide these.
  const config: ServerConfig = {
    adminMarkupPercentage: 0.15, // Default to 15% markup
    albyApiKey: process.env.ALBY_API_KEY || undefined, // Example of loading from env var
    lightningIntegrationMethod: 'alby_api',
    paymentVerificationEndpoint: '/api/check-invoice', // Example endpoint
  };

  // Simulate loading from environment variables (which won't actually work client-side like this)
  // but demonstrates intent for a backend.
  if (typeof process !== 'undefined' && process.env.ADMIN_MARKUP_PERCENTAGE) {
    const markup = parseFloat(process.env.ADMIN_MARKUP_PERCENTAGE);
    if (!isNaN(markup)) {
      config.adminMarkupPercentage = markup;
    }
  }

  if (typeof process !== 'undefined' && process.env.LIGHTNING_INTEGRATION_METHOD) {
    if (process.env.LIGHTNING_INTEGRATION_METHOD === 'lndhub' || process.env.LIGHTNING_INTEGRATION_METHOD === 'alby_api') {
      config.lightningIntegrationMethod = process.env.LIGHTNING_INTEGRATION_METHOD;
    }
  }
  
  return config;
};

// Example usage (for illustration - actual use will be in relevant services)
// const currentConfig = getServerConfig();
// console.log('Current admin markup:', currentConfig.adminMarkupPercentage);
