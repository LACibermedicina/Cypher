import { createContext, useContext, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface NavigationContextType {
  navigate: (path: string) => void;
  currentPath: string;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();

  const navigate = (path: string) => {
    setLocation(path);
  };

  const value: NavigationContextType = {
    navigate,
    currentPath: location
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

// Global navigation event system
export function setupGlobalNavigation() {
  // Handle global navigation events
  const handleNavigate = (event: CustomEvent<{ path: string }>) => {
    const { path } = event.detail;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  window.addEventListener('app-navigate', handleNavigate as EventListener);

  return () => {
    window.removeEventListener('app-navigate', handleNavigate as EventListener);
  };
}

// Utility function to navigate from anywhere
export function navigateGlobally(path: string) {
  const event = new CustomEvent('app-navigate', { 
    detail: { path } 
  });
  window.dispatchEvent(event);
}