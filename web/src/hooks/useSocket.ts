"use client";

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socketClient } from '@/lib/ws/socket';
import { useAuth } from './useAuth';

export function useSocket() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Events sent while the socket was down are gone, so after a reconnect the
  // data has to be fetched again. Must subscribe before connecting below.
  useEffect(() => {
    let hasConnectedBefore = false;
    return socketClient.on('connect', () => {
      if (hasConnectedBefore) queryClient.invalidateQueries();
      hasConnectedBefore = true;
    });
  }, [queryClient]);

  useEffect(() => {
    if (isAuthenticated) {
      socketClient.connect();
    } else {
      socketClient.disconnect();
    }

    return () => {
      // We don't necessarily disconnect on unmount of useSocket unless we want to, 
      // but if useSocket is mounted in a top-level provider, it manages the connection.
    };
  }, [isAuthenticated]);
}

export function useSocketEvent<T = unknown>(
  event: string,
  callback: (payload: T) => void,
) {
  useEffect(() => {
    return socketClient.on(event, callback as (payload: unknown) => void);
  }, [event, callback]);
}
