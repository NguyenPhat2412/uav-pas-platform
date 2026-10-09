'use client';
import { Button } from '@uav/ui';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="subhero"><div className="shell"><h1>This page could not load.</h1><p>Please try again or return to the homepage.</p><Button className="button" onClick={reset}>Try again</Button><a className="button button-quiet" href="/">Home</a></div></section>;
}
