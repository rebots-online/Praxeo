/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import App from '@/App';
import {DataContext} from '@/context';
import React from 'react';
import ReactDOM from 'react-dom/client';
import {Example} from './lib/types';

function DataProvider({children}) {
  const [examples, setExamples] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    setIsLoading(true);
    fetch('data/examples.json')
      .then((res) => res.json())
      .then((fetchedData) => {
        setExamples(fetchedData);
        setIsLoading(false);
      });
  }, []);

  const empty = {title: '', url: '', spec: '', code: ''};

  const value = {
    examples,
    isLoading,
    setExamples,
    defaultExample: examples ? examples[0] : empty,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <DataProvider>
    <App />
  </DataProvider>,
);
