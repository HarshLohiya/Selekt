import localforage from 'localforage';
import './css/reset.css';
import '@reach/dialog/styles.css';
import '@reach/menu-button/styles.css';
import React from 'react';
import { SWRConfig } from 'swr';
import { MessageDisplayer } from './common/message';
import './css/index.css';
import './css/react-split-pane.css';
import './css/vendorOverrides.css';
import Routes from './Routes';
import swrFetcher from './utilities/swr-fetcher';
import ReactDOM from 'react-dom';

declare global {
  interface Window {
    localforage: LocalForage;
  }
}

window.localforage = localforage;

const container = document.getElementById('root');
ReactDOM.render(
  <SWRConfig
    value={{
      fetcher: swrFetcher,
    }}
  >
    <Routes />
    <MessageDisplayer />
  </SWRConfig>,
  container
);
