'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@uav/ui';
import { customerUrl } from '../content/site-content';

const links = [
  ['/services', 'Services'], ['/solutions', 'Solutions'], ['/how-it-works', 'How it works'], ['/about', 'About'], ['/contact', 'Contact'],
];

const locales = [
  { code: 'vi', label: 'VN', title: 'Tiếng Việt' },
  { code: 'en', label: 'EN', title: 'English' },
  { code: 'ja', label: 'JP', title: '日本語' },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('uav_locale') || 'en';
      setCurrentLang(saved);
    } catch {}
  }, []);

  const handleSelectLang = (code: string) => {
    setCurrentLang(code);
    try {
      localStorage.setItem('uav_locale', code);
      localStorage.setItem('uav_customer_locale', code);
    } catch {}
  };

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);

  return (
    <header className="site-header" onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); event.currentTarget.querySelector<HTMLButtonElement>('.menu-button')?.focus(); } }}>
      <div className="shell nav-wrap">
        <Link className="brand" href="/" aria-label="UAV PAS - Đại học Việt Nhật" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/vju-logo.svg" alt="VJU Logo" width={32} height={32} style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <span>UAV PAS</span>
        </Link>
        <Button className="menu-button" type="button" aria-expanded={open} aria-controls="public-nav" onClick={() => setOpen(!open)}><span className="sr-only">Toggle menu</span>☰</Button>
        <nav id="public-nav" className={open ? 'public-nav is-open' : 'public-nav'} aria-label="Primary navigation">
          {links.map(([href, label]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
          <div className="lang-switcher" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '2px 4px', borderRadius: '6px' }}>
            {locales.map(({ code, label, title }) => (
              <button
                key={code}
                type="button"
                onClick={() => handleSelectLang(code)}
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: currentLang === code ? '700' : '400',
                  color: currentLang === code ? '#38bdf8' : '#94a3b8',
                  background: currentLang === code ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                title={title}
              >
                {label}
              </button>
            ))}
          </div>
          <a className="nav-login" href={`${customerUrl}/login?lang=${currentLang}`}>Sign in</a>
          <a className="button button-small" href={`${customerUrl}/register?lang=${currentLang}`}>Get started</a>
        </nav>
      </div>
    </header>
  );
}
