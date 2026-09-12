'use client';
import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { API_URL } from './api';

export type LiveEvent = {
  executionId: string; jobId: string; status: string; attempt: number; at: string;
};

function getToken() {
  return typeof window === 'undefined' ? null : localStorage.getItem('enrichly_token');
}

// One shared connection per tab.
let shared: signalR.HubConnection | null = null;
let watchers = 0;

function getConnection(): signalR.HubConnection | null {
  const token = getToken();
  if (!token) return null;
  if (!shared) {
    shared = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/executions`, { accessTokenFactory: () => getToken() || '' })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .build();
  }
  return shared;
}

/**
 * Subscribe to live `executionUpdated` events. Resolves instantly when the
 * worker broadcasts; pages keep their HTTP polling as a fallback, so nothing
 * breaks if realtime is unreachable (e.g. multi-instance without a backplane).
 */
export function useLiveUpdates(onEvent: (e: LiveEvent) => void, executionId?: string) {
  const [live, setLive] = useState(false);
  const cb = useRef(onEvent);
  cb.current = onEvent;

  useEffect(() => {
    const conn = getConnection();
    if (!conn) return;
    let cancelled = false;
    watchers++;

    const handler = (e: LiveEvent) => cb.current(e);
    conn.on('executionUpdated', handler);

    (async () => {
      try {
        if (conn.state === signalR.HubConnectionState.Disconnected) await conn.start();
        if (cancelled) return;
        setLive(true);
        if (executionId) await conn.invoke('WatchExecution', executionId).catch(() => {});
      } catch {
        setLive(false); // fallback polling (already in pages) covers this
      }
    })();

    return () => {
      conn.off('executionUpdated', handler);
      if (executionId) conn.invoke('UnwatchExecution', executionId).catch(() => {});
      watchers--;
      // keep the shared connection warm for other components
    };
  }, [executionId]);

  return live;
}
