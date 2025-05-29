/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/* tslint:disable */

import App from '@/App';
import {DataContext, AppContextType} from '@/context'; // Import AppContextType
import React from 'react';
import ReactDOM from 'react-dom/client';
import {Example} from './lib/types';
import {getUserInfo, isWebLNEnabled, logoutUser, UserInfo} from './lib/authService'; // Import auth functions and UserInfo

function DataProvider({children}: {children: React.ReactNode}) { // Typed children
  const [examples, setExamples] = React.useState<Example[]>([]); // Typed state
  const [isLoading, setIsLoading] = React.useState(true);

  // Authentication state
  const [userInfo, setUserInfo] = React.useState<UserInfo | null>(null);
  const [authLoading, setAuthLoading] = React.useState(false);

  React.useEffect(() => {
    setIsLoading(true);
    fetch('data/examples.json')
      .then((res) => res.json())
      .then((fetchedData: Example[]) => { // Typed fetchedData
        setExamples(fetchedData);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Failed to fetch examples:", error);
        setIsLoading(false);
      });
  }, []);
  
  // Login function
  const login = async () => {
    if (!isWebLNEnabled()) {
      alert('Please install Alby or another WebLN-compatible extension to log in.');
      return;
    }
    setAuthLoading(true);
    try {
      const info = await getUserInfo();
      if (info) {
        setUserInfo(info);
      } else {
        // Optional: alert if getUserInfo returned null due to an issue caught in authService
        // alert('Login failed. Could not retrieve user information.');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setAuthLoading(true);
    await logoutUser(); // This is currently a simulated logout
    setUserInfo(null);
    setAuthLoading(false);
  };

  const defaultExampleValue = examples.length > 0 ? examples[0] : null;
  
  const value: AppContextType = { // Ensure value matches AppContextType
    examples,
    isLoading,
    setExamples,
    defaultExample: defaultExampleValue,
    userInfo,
    authLoading,
    login,
    logout,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

const rootElement = document.getElementById('root');
if (rootElement) { // Check if rootElement is not null
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <DataProvider>
      <App />
    </DataProvider>,
  );
} else {
  console.error("Failed to find the root element");
}
