import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Route = { path: string; params: Record<string, string> };

type RouterValue = {
  route: Route;
  navigate: (path: string) => void;
};

const RouterContext = createContext<RouterValue | undefined>(undefined);

function parsePath(): Route {
  const hash = window.location.hash.slice(1) || '/';
  const [path, query] = hash.split('?');
  const params: Record<string, string> = {};
  if (query) {
    new URLSearchParams(query).forEach((v, k) => (params[k] = v));
  }
  return { path: path || '/', params };
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(parsePath);

  useEffect(() => {
    const handler = () => setRoute(parsePath());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  function navigate(path: string) {
    window.location.hash = path;
  }

  return <RouterContext.Provider value={{ route, navigate }}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
