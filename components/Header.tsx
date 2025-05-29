/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/* tslint:disable */

import React, {useContext} from 'react'; // Import React and useContext
import {DataContext} from '@/context'; // Import DataContext

interface HeaderProps {
  siteTitle: string;
  subTitle?: string;
}

export default function Header({siteTitle, subTitle}: HeaderProps) {
  const {userInfo, authLoading, login, logout} = useContext(DataContext);

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="title-section">
          <h1 className="site-title">{siteTitle}</h1>
          {subTitle && <p className="sub-title">{subTitle}</p>}
        </div>
        <div className="auth-section">
          {authLoading ? (
            <button className="button-auth loading" disabled>
              Loading...
            </button>
          ) : userInfo ? (
            <div className="user-info-container">
              <span className="user-greeting">
                Welcome,{' '}
                {userInfo.node?.alias || userInfo.node?.pubkey.substring(0, 6)}
                {userInfo.lightningAddress && (
                  <small className="lightning-address"> ({userInfo.lightningAddress})</small>
                )}
              </span>
              <button onClick={logout} className="button-auth logout-button">
                Logout
              </button>
            </div>
          ) : (
            <button onClick={login} className="button-auth login-button">
              Login with Alby
            </button>
          )}
        </div>
      </div>
    </header>
  );
}