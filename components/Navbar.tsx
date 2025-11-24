'use client';

import { useState, useEffect } from 'react';

import Link from 'next/link';

import Image from 'next/image';

import { useAuth } from '@workos-inc/authkit-nextjs/components';



const Navbar = () => {

    const [scrolled, setScrolled] = useState(false);

    const { user, isLoading } = useAuth();



    useEffect(() => {

        const handleScroll = () => setScrolled(window.scrollY > 50);

        window.addEventListener('scroll', handleScroll);

        return () => window.removeEventListener('scroll', handleScroll);

    }, []);



    const navLinks = [

        { name: 'Home', href: '/' },

        { name: 'Realms', href: '/realms' },

        { name: 'Lore', href: '/lore' },

        { name: 'News', href: '/changelog' },

    ];



        return (



            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 px-8 py-2 flex justify-between items-center ${scrolled ? 'backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>



                <div className="flex items-center">



    

                <Link href="/" className="flex items-center group">

                    <Image src="/logo.png" alt="Realms Logo" width={64} height={64} className="w-16 h-16 object-contain" />

                </Link>

            </div>

            

            <div className="hidden md:flex gap-8">

                {navLinks.map((item) => (

                    <Link key={item.name} href={item.href} className={`font-sans font-bold text-sm uppercase tracking-wider hover:text-genshin-gold transition-colors text-genshin-dark`}>

                        {item.name}

                    </Link>

                ))}

            </div>

            

            <div className="flex items-center gap-4">

                {isLoading ? (

                    <div className="w-24 h-10 bg-gray-200/50 animate-pulse rounded-full"></div>

                ) : user ? (

                    <Link href="/dashboard">

                        <button className="btn-genshin bg-genshin-gold text-white px-6 py-2 rounded-full font-serif font-bold shadow-lg hover:bg-yellow-500 transition-colors border border-white/30">

                            ENTER REALM

                        </button>

                    </Link>

                ) : (

                    <div className="flex items-center gap-4">

                        <Link href="/sign-in" className={`font-sans font-bold text-sm uppercase tracking-wider hover:text-genshin-gold transition-colors text-genshin-dark`}>

                            LOG IN

                        </Link>

                        <Link href="/sign-up">

                            <button className="btn-genshin bg-white text-genshin-dark px-6 py-2 rounded-full font-serif font-bold shadow-lg hover:bg-gray-100 transition-colors border border-gray-200">

                                JOIN

                            </button>

                        </Link>

                    </div>

                )}

            </div>

        </nav>

    );

};



export default Navbar;
