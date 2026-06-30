import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  loadVisualizerSettings,
  saveVisualizerSettings,
} from '../lib/visualizerSettings';

const VisualizerSettingsContext = createContext(null);

export function VisualizerSettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => loadVisualizerSettings());

  const updateSettings = useCallback((partial) => {
    setSettings(prev => {
      const next = saveVisualizerSettings({ ...prev, ...partial });
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ settings, updateSettings }),
    [settings, updateSettings],
  );

  return (
    <VisualizerSettingsContext.Provider value={value}>
      {children}
    </VisualizerSettingsContext.Provider>
  );
}

export function useVisualizerSettings() {
  const ctx = useContext(VisualizerSettingsContext);
  if (!ctx) {
    throw new Error('useVisualizerSettings must be used within VisualizerSettingsProvider');
  }
  return ctx;
}
