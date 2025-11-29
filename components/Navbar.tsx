'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
    const { theme, toggleTheme, mounted } = useTheme();
    
    // Prevent hydration mismatch by not rendering until mounted
    if (!mounted) {
        return <div className="w-14 h-7 rounded-full bg-gray-200 animate-pulse" />;
    }
    
    return (
        <button
            onClick={toggleTheme}
            className="relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-genshin-gold/50"
            style={{
                background: theme === 'dark' 
                    ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' 
                    : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
            }}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            <div
                className={`absolute top-0.5 w-6 h-6 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
                    theme === 'dark' ? 'left-7' : 'left-0.5'
                }`}
                style={{
                    background: theme === 'dark' 
                        ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' 
                        : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                }}
            >
                {theme === 'dark' ? (
                    <Moon size={14} className="text-white" />
                ) : (
                    <Sun size={14} className="text-white" />
                )}
            </div>
        </button>
    );
};

const Navbar = () => {
    const [scrolled, setScrolled] = useState(false);
    const { user, loading: isLoading } = useAuth();
    const { theme, mounted } = useTheme();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Home', href: '/' },
        { name: 'Realms', href: '/realms' },
        { name: 'Lore', href: '/lore' },
        { name: 'Pricing', href: '/pricing' },
        { name: 'News', href: '/changelog' },
    ];

    // Use light theme styles until mounted to prevent flash
    const dark = mounted ? theme === 'dark' : false;

    return (
        <nav className={`sticky top-0 w-full z-50 transition-all duration-300 px-8 py-2 ${
            scrolled
                ? dark
                    ? 'backdrop-blur-md shadow-sm bg-genshin-dark/80'
                    : 'backdrop-blur-md shadow-sm bg-white/80'
                : dark
                    ? 'bg-genshin-dark'
                    : 'bg-white'
        }`}>
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center">
                    <Link href="/" className="flex items-center group">
                        <Image src="/logo.png" alt="Realms Logo" width={64} height={64} className="w-16 h-16 object-contain" />
                    </Link>
                </div>

                <div className="hidden md:flex gap-8">
                    {navLinks.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`font-sans font-bold text-sm uppercase tracking-wider hover:text-genshin-gold transition-colors ${
                                dark ? 'text-genshin-white' : 'text-genshin-dark'
                            }`}
                        >
                            {item.name}
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <ThemeToggle />
                
                {isLoading ? (
                    <div className="w-24 h-10 bg-gray-200/50 animate-pulse rounded-full"></div>
                ) : user ? (
                    <Link href="/dashboard">
                        <button className="btn-genshin bg-genshin-gold text-white px-6 py-2 rounded-full font-serif font-bold shadow-lg hover:bg-yellow-500 transition-colors border border-white/30">
                            DASHBOARD
                        </button>
                    </Link>
                ) : (
                    <div className="flex items-center gap-4">
                        <Link 
                            href="/sign-in" 
                            className={`font-sans font-bold text-sm uppercase tracking-wider hover:text-genshin-gold transition-colors ${
                                dark ? 'text-genshin-white' : 'text-genshin-dark'
                            }`}
                        >
                            LOG IN
                        </Link>
                        <Link href="/sign-up">
                            <button className={`btn-genshin px-6 py-2 rounded-full font-serif font-bold shadow-lg transition-colors border ${
                                dark 
                                    ? 'bg-genshin-dark text-genshin-white border-genshin-gold/30 hover:bg-genshin-dark/80' 
                                    : 'bg-white text-genshin-dark border-gray-200 hover:bg-gray-100'
                            }`}>
                                JOIN
                            </button>
                        </Link>
                    </div>
                )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
