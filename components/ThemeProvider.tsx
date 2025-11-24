"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
    mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

interface ThemeProviderProps {
    children: React.ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
    const [theme, setThemeState] = useState<Theme>('light');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Check localStorage first
        const savedTheme = localStorage.getItem('realms-theme') as Theme | null;
        if (savedTheme) {
            setThemeState(savedTheme);
            document.documentElement.classList.toggle('dark', savedTheme === 'dark');
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const initialTheme = prefersDark ? 'dark' : 'light';
            setThemeState(initialTheme);
            document.documentElement.classList.toggle('dark', prefersDark);
        }
        setMounted(true);
    }, []);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('realms-theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    };

    // Always provide context, but indicate mounted state
    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, mounted }}>
            {children}
        </ThemeContext.Provider>
    );
};
