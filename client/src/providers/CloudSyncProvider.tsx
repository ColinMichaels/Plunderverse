import {useEffect, useRef} from "react";
import {useAuthStore} from "../lib/stores/auth/useAuthStore";
import {cloudSyncManager} from "../services/CloudSyncManager";
import {CloudSyncManager} from "../services/CloudSyncWebSocket";
import {debugLog, debugError} from "../lib/utils/debug";

interface CloudSyncProviderProps {
  children: React.ReactNode;
}

export function CloudSyncProvider({ children }: CloudSyncProviderProps) {
  const initializedRef = useRef(false);
  const initializingRef = useRef(false);

  useEffect(() => {
    let prevAuthState = {
      isAuthenticated: useAuthStore.getState().isAuthenticated,
      isGuest: useAuthStore.getState().isGuest,
    };

    const unsubscribe = useAuthStore.subscribe((state) => {
      const currentAuthState = {
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
      };

      if (
        currentAuthState.isAuthenticated === prevAuthState.isAuthenticated &&
        currentAuthState.isGuest === prevAuthState.isGuest
      ) {
        return;
      }

      const wasNotAuthenticated = !prevAuthState.isAuthenticated || prevAuthState.isGuest;
      const isNowAuthenticated = currentAuthState.isAuthenticated && !currentAuthState.isGuest;

      if (wasNotAuthenticated && isNowAuthenticated) {
        if (initializedRef.current || initializingRef.current) {
          prevAuthState = currentAuthState;
          return;
        }

        initializingRef.current = true;
        Promise.all([
          cloudSyncManager.initialize(),
          CloudSyncManager.getInstance().initialize(),
        ])
          .then(() => {
            initializedRef.current = true;
            debugLog("cloud-sync", "Both sync managers initialized after login");
          })
          .catch((error) => {
            debugError("cloud-sync", "Initialization failed:", error);
          })
          .finally(() => {
            initializingRef.current = false;
          });
      }

      if (!currentAuthState.isAuthenticated && prevAuthState.isAuthenticated) {
        cloudSyncManager.reset();
        initializedRef.current = false;
        debugLog("cloud-sync", "Cleaned up after logout");
      }

      prevAuthState = currentAuthState;
    });

    const initIfAuthenticated = async () => {
      const { isAuthenticated, isGuest } = useAuthStore.getState();
      if (
        isAuthenticated &&
        !isGuest &&
        !initializedRef.current &&
        !initializingRef.current
      ) {
        initializingRef.current = true;
        try {
          await Promise.all([
            cloudSyncManager.initialize(),
            CloudSyncManager.getInstance().initialize(),
          ]);
          initializedRef.current = true;
          debugLog("cloud-sync", "Both sync managers initialized on mount");
        } catch (error) {
          debugError("cloud-sync", "Initialization failed:", error);
        } finally {
          initializingRef.current = false;
        }
      }
    };

    initIfAuthenticated();

    return () => {
      unsubscribe();
      cloudSyncManager.reset();
      initializedRef.current = false;
      initializingRef.current = false;
    };
  }, []);

  return <>{children}</>;
}
