/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/* tslint:disable */

import React from 'react';
import {Example} from '@/lib/types';
import {UserInfo} from '@/lib/authService'; // Import UserInfo

export interface AppContextType {
  examples: Example[];
  isLoading: boolean; // For example data loading
  setExamples: (examples: Example[]) => void;
  defaultExample: Example | null;

  // New authentication state
  userInfo: UserInfo | null;
  authLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

// Provide default values for the context
export const DataContext = React.createContext<AppContextType>({
  examples: [],
  isLoading: true,
  setExamples: () => {},
  defaultExample: null,

  // Default auth values
  userInfo: null,
  authLoading: false,
  login: async () => {},
  logout: async () => {},
});
