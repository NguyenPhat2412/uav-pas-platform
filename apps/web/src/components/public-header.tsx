'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@uav/ui';
import { customerUrl } from '../content/site-content';

const links = [
  ['/services', 'Services'], ['/solutions', 'Solutions'], ['/how-it-works', 'How it works'], ['/about', 'About'], ['/contact', 'Contact'],
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);
  return <header className="site-header" onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); event.currentTarget.querySelector<HTMLButtonElement>('.menu-button')?.focus(); } }}><div className="shell nav-wrap">
    <Link className="brand" href="/" aria-label="UAV PAS home"><span className="brand-mark">✦</span><span>UAV PAS</span></Link>
    <Button className="menu-button" type="button" aria-expanded={open} aria-controls="public-nav" onClick={() => setOpen(!open)}><span className="sr-only">Toggle menu</span>☰</Button>
    <nav id="public-nav" className={open ? 'public-nav is-open' : 'public-nav'} aria-label="Primary navigation">
      {links.map(([href, label]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
      <a className="nav-login" href={`${customerUrl}/login`}>Sign in</a>
      <a className="button button-small" href={`${customerUrl}/register`}>Get started</a>
    </nav>
  </div></header>;
}
