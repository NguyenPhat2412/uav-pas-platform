'use client';
import { createQueryClient } from '@uav/query';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => (() => { const query = createQueryClient(); query.setDefaultOptions({ queries: { staleTime: 15000, retry: false, refetchOnWindowFocus: true }, mutations: { retry: false } }); return query; })());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
