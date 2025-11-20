"use client";

import React from 'react';
import { Flame, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Navbar = () => {
    const { user, loading: isLoading, signOut } = useAuth();
    const pathname = usePathname();

    if (pathname?.startsWith('/play') || pathname?.startsWith('/changelog')) return null;

    return (
        <nav className="fixed top-0 left-0 right-0 z-40 bg-stone-950/80 backdrop-blur-md border-b border-stone-800">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                        <Flame className="text-indigo-500 group-hover:scale-110 transition-transform duration-300" size={28} />
                        <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-0 group-hover:opacity-40 transition-opacity"></div>
                    </div>
                    <span className="text-2xl font-serif font-bold text-stone-100 tracking-wide">Dragon<span className="text-indigo-500">Forge</span></span>
                </Link>

                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-400">
                    <Link href="/features" className="hover:text-white transition-colors">Features</Link>
                    <Link href="/#showcase" className="hover:text-white transition-colors">Showcase</Link>
                    <Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link>
                    <Link href="/lore" className="text-stone-400 hover:text-white transition-colors text-sm font-medium">Lore</Link>
                    <Link href="/forge" className="text-stone-400 hover:text-white transition-colors text-sm font-medium">The Forge</Link>
                    <Link href="/changelog" className="text-stone-400 hover:text-white transition-colors text-sm font-medium">Changelog</Link>
                </div>

                <div className="flex items-center gap-4">
                    {isLoading ? (
                        <div className="h-9 w-24 bg-stone-800/50 animate-pulse rounded"></div>
                    ) : user ? (
                        <div className="flex items-center gap-4">
                            <div className="hidden md:flex items-center gap-2 text-stone-300">
                                <div className="w-8 h-8 rounded-full bg-indigo-900/50 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                                    {user.firstName ? user.firstName[0].toUpperCase() : <UserIcon size={16} />}
                                </div>
                                <span className="text-sm font-medium">{user.firstName || 'Traveler'}</span>
                            </div>
                            <button
                                onClick={() => signOut({ returnTo: '/' })}
                                className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-full transition-all"
                                title="Sign Out"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <a href="/sign-in" className="hidden md:block text-stone-300 hover:text-white font-medium transition-colors">
                                Log In
                            </a>
                            <a href="/sign-up" className="px-5 py-2 bg-indigo-700 hover:bg-indigo-600 text-white text-sm font-bold rounded border border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] transition-all transform hover:-translate-y-0.5">
                                Start Forging
                            </a>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
