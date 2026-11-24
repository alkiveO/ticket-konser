
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light';

type ThemeColors = {
  background: string;
  card: string;
  secondary: string;
  text: string;
  subText: string;
  border: string;
  primary: string;
  input: string;
  tabBar: string;
  statusBar: 'light' | 'dark';
};

export const themes: Record<ThemeMode, ThemeColors> = {
  dark: {
    background: '#0b0b13',
    card: '#15151f',
    secondary: '#1c1c29',
    text: '#ffffff',
    subText: '#a1a1b5',
    border: '#29293a',
    primary: '#8b5cf6',
    input: '#15151f',
    tabBar: '#11111b',
    statusBar: 'light',
  },

  light: {
    background: '#f5f5fa',
    card: '#ffffff',
    secondary: '#eeeeF5',
    text: '#171725',
    subText: '#68687a',
    border: '#ddddE8',
    primary: '#7541d8',
    input: '#ffffff',
    tabBar: '#ffffff',
    statusBar: 'dark',
  },
};

type ThemeContextType = {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

export function ThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('app-theme');

        if (savedTheme === 'light' || savedTheme === 'dark') {
          setMode(savedTheme);
        }
      } catch (error) {
        console.log('Gagal memuat tema:', error);
      } finally {
        setIsThemeLoaded(true);
      }
    };

    loadTheme();
  }, []);

  const toggleTheme = () => {
    setMode((currentMode) => {
      const newMode: ThemeMode =
        currentMode === 'dark' ? 'light' : 'dark';

      AsyncStorage.setItem('app-theme', newMode).catch((error) => {
        console.log('Gagal menyimpan tema:', error);
      });

      return newMode;
    });
  };

  if (!isThemeLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        mode,
        colors: themes[mode],
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme harus digunakan di dalam ThemeProvider'
    );
  }

  return context;
}
