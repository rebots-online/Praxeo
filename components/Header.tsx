/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import React, { useState, useEffect, useRef } from 'react';

interface HeaderProps {
  siteTitle: string;
  subTitle: string;
}

const Header: React.FC<HeaderProps> = ({ siteTitle, subTitle }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const menuItems = [
    { name: 'About RobinsAI.World', href: '#' },
    { name: 'Learn AI', href: '#' },
    { name: 'AI Tools', href: '#' },
    { name: 'How to Use', href: '#' },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileMenuOpen &&
          menuRef.current && 
          !menuRef.current.contains(event.target as Node) &&
          buttonRef.current &&
          !buttonRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <header className="app-header">
        <div className="header-content">
          <a href="#" className="logo-link" aria-label="Robin's AI World Home">
            <img src="/logo.png" alt="Robin's AI World Logo" className="logo" />
          </a>
          <div className="title-container">
            <h1 className="headline header-headline">{siteTitle}</h1>
            <p className="subtitle header-subtitle">{subTitle}</p>
          </div>
          <nav className="desktop-nav">
            <ul>
              {menuItems.map((item) => (
                <li key={item.name}><a href={item.href}>{item.name}</a></li>
              ))}
            </ul>
          </nav>
          <button
            ref={buttonRef}
            className="hamburger-button"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>
        {isMobileMenuOpen && (
          <nav id="mobile-menu" className="mobile-nav" ref={menuRef}>
            <ul>
              {menuItems.map((item) => (
                <li key={item.name}><a href={item.href} onClick={() => setIsMobileMenuOpen(false)}>{item.name}</a></li>
              ))}
            </ul>
          </nav>
        )}
      </header>
      <style>{`
        .app-header {
          background-color: var(--color-background-header, light-dark(#fff, #2c2c30));
          border-bottom: 1px solid light-dark(#e0e0e0, #3a3a3f);
          padding: 0.5rem 1rem; /* Reduced padding */
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 1000;
          box-sizing: border-box;
          height: var(--header-height);
        }
        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1400px;
          margin: 0 auto;
          height: 100%;
        }
        .logo-link {
          display: flex;
          align-items: center;
          flex-shrink: 0; /* Prevent shrinking */
        }
        .logo {
          height: 40px; /* Adjusted logo size */
          width: auto;
          margin-right: 0.75rem; /* Reduced margin */
        }
        .title-container {
          display: flex;
          flex-direction: column;
          justify-content: center; /* Center titles vertically */
           flex-grow: 1;
        }
        .headline.header-headline {
          font-size: 1.5rem; /* Adjusted font size */
          color: var(--color-headline);
          font-family: var(--font-display);
          text-transform: uppercase;
          margin: 0;
          line-height: 1.1;
        }
        .subtitle.header-subtitle {
          font-size: 0.75rem; /* Adjusted font size */
          color: var(--color-subtitle);
          margin: 0;
          line-height: 1.2;
        }

        .desktop-nav {
          display: none;
        }
        .desktop-nav ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          gap: 1rem; /* Spacing between menu items */
        }
        .desktop-nav a {
          text-decoration: none;
          color: var(--color-text);
          font-weight: 500;
          font-size: 0.9rem;
          padding: 0.5rem;
          border-radius: 4px;
          transition: background-color 0.2s, color 0.2s;
        }
        .desktop-nav a:hover {
          background-color: var(--color-accent);
          color: light-dark(#fff, #fff);
        }

        .hamburger-button {
          display: flex; /* Changed to flex for mobile */
          flex-direction: column;
          justify-content: space-around;
          width: 30px;
          height: 30px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          z-index: 1001; /* Above mobile nav initially if needed */
        }
        .hamburger-line {
          display: block;
          width: 100%;
          height: 3px;
          background-color: var(--color-text);
          border-radius: 3px;
          transition: all 0.3s ease-in-out;
        }
        .app-header.nav-open .hamburger-line:nth-child(1) {
          transform: translateY(8px) rotate(45deg);
        }
        .app-header.nav-open .hamburger-line:nth-child(2) {
          opacity: 0;
        }
        .app-header.nav-open .hamburger-line:nth-child(3) {
          transform: translateY(-8px) rotate(-45deg);
        }

        .mobile-nav {
          display: flex; /* Initially flex, controlled by parent state */
          flex-direction: column;
          position: absolute;
          top: var(--header-height);
          right: 0;
          width: 250px;
          background-color: var(--color-background-header, light-dark(#fff, #2c2c30));
          box-shadow: -2px 0 5px rgba(0,0,0,0.1);
          padding: 1rem;
          border-top: 1px solid light-dark(#e0e0e0, #3a3a3f);
          max-height: calc(100vh - var(--header-height));
          overflow-y: auto;
        }
        .mobile-nav ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .mobile-nav li a {
          display: block;
          padding: 0.75rem 1rem;
          text-decoration: none;
          color: var(--color-text);
          font-size: 1rem;
          border-bottom: 1px solid light-dark(#eee, #444);
          transition: background-color 0.2s;
        }
        .mobile-nav li:last-child a {
          border-bottom: none;
        }
        .mobile-nav li a:hover {
          background-color: var(--color-accent);
          color: #fff;
        }

        @media (min-width: 900px) { /* Breakpoint for desktop menu */
          .hamburger-button {
            display: none;
          }
          .desktop-nav {
            display: block;
          }
          .title-container {
            flex-grow: 0; /* Don't let title grow too much on desktop */
            margin-right: auto; /* Pushes nav to the right */
             margin-left: 1rem;
          }
           .headline.header-headline {
             font-size: 1.8rem;
           }
           .subtitle.header-subtitle {
             font-size: 0.8rem;
           }
        }
         @media (max-width: 480px) {
            .logo {
                height: 30px;
                margin-right: 0.5rem;
            }
            .headline.header-headline {
                font-size: 1.1rem;
            }
            .subtitle.header-subtitle {
                font-size: 0.65rem;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 150px; /* Adjust as needed */
            }
             .app-header {
                padding: 0.5rem 0.75rem;
             }
        }
      `}</style>
    </>
  );
};

export default Header;