/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Define a global interface for webln if it's not already defined
declare global {
  interface Window {
    webln?: WebLN;
  }
}

// Interface for basic WebLN functionality needed
interface WebLN {
  enable: () => Promise<void>;
  request: (method: string, params?: any) => Promise<any>;
  getInfo: () => Promise<GetInfoResponse>;
  // Add other methods like sendPayment, makeInvoice if needed directly here
}

// Interface for the expected response from webln.getInfo()
export interface UserInfo {
  node: {
    alias: string;
    pubkey: string;
  };
  // Add other fields if available and needed, e.g., from specific permissions
  lightningAddress?: string; 
}

/**
 * Checks if WebLN is available in the browser.
 * @returns True if WebLN is enabled, false otherwise.
 */
export const isWebLNEnabled = (): boolean => {
  return typeof window !== 'undefined' && typeof window.webln !== 'undefined';
};

/**
 * Requests user information from the WebLN provider.
 * Ensures WebLN is enabled before making the request.
 * @returns A promise that resolves to the UserInfo object or null if an error occurs.
 */
export const getUserInfo = async (): Promise<UserInfo | null> => {
  if (!isWebLNEnabled()) {
    console.warn('WebLN is not available.');
    // alert('WebLN is not available. Please install Alby or another WebLN-compatible extension.');
    return null;
  }
  try {
    // Ensure webln is enabled by the user
    await window.webln!.enable(); 
    const info = await window.webln!.getInfo(); // Standard WebLN getInfo call
    
    // Basic validation of the response structure
    if (info && info.node && info.node.pubkey) {
      // Attempt to get lightning address if available (common with Alby)
      try {
        const lnAddress = await window.webln!.request('getaddress'); // Non-standard, but common
        if (lnAddress && lnAddress.address) {
           return { ...info, lightningAddress: lnAddress.address } as UserInfo;
        }
      } catch (lnAddressError) {
        console.warn('Could not retrieve lightning address:', lnAddressError);
      }
      return info as UserInfo;
    } else {
      console.error('User information from WebLN is not in the expected format:', info);
      return null;
    }
  } catch (error) {
    console.error('Error getting user info from WebLN:', error);
    // alert(`Error connecting to WebLN: ${error.message || error}`);
    return null;
  }
};

/**
 * Simulates a logout by clearing application-specific user state.
 * WebLN itself does not have a "logout" concept from the provider,
 * so this function is for managing auth state within the app.
 * 
 * @returns A promise that resolves when logout simulation is complete.
 */
export const logoutUser = async (): Promise<void> => {
  // In a real app, you would clear React context/state here.
  // For now, this is a placeholder.
  console.log('User logged out from the app.');
  return Promise.resolve();
};
