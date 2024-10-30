"use client";

import * as React from "react";
import { NextUIProvider } from "@nextui-org/system";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ThemeProviderProps } from "next-themes/dist/types";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

const FEED_QUERY_HASH = '["feed"]';

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <NextUIProvider navigate={router.push}>
      <QueryClientProvider>
        <Toaster />
        <NextThemesProvider {...themeProps}>{children}</NextThemesProvider>
      </QueryClientProvider>
    </NextUIProvider>
  );
}

function QueryClientProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    serialize: (data) => {
      const feedQuery = data.clientState.queries.find(
        (query) => query.queryHash === FEED_QUERY_HASH
      );

      if (feedQuery) {
        const data: any = feedQuery.state.data || { pages: [] };

        feedQuery.state.data = {
          pageParams: [data.pageParams?.[0]].filter((p) => p),
          pages: [data.pages?.[0]].filter((p) => p),
        };
      }

      const queryWithoutFeed = data.clientState.queries.filter(
        (query) => query.queryHash !== FEED_QUERY_HASH
      );

      data.clientState.queries = feedQuery
        ? [feedQuery, ...queryWithoutFeed]
        : queryWithoutFeed;

      return JSON.stringify(data);
    },
  });

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
