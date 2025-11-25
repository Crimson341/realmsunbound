'use client';

import { Twitter, Youtube, Instagram, Globe } from 'lucide-react';
import { useTheme } from './ThemeProvider';

const Footer = () => {
    const { theme, mounted } = useTheme();
    const dark = mounted ? theme === 'dark' : false;

    return (
        <footer className={`py-12 border-t ${dark ? 'bg-[#0a0c12] text-gray-400 border-[#1a1d2e]' : 'bg-black text-gray-500 border-gray-800'}`}>
            <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-serif text-2xl ${dark ? 'bg-[#1a1d2e]' : 'bg-gray-800'}`}>R</div>
                    <div>
                        <h4 className={`font-serif tracking-widest ${dark ? 'text-[#e8e6e3]' : 'text-white'}`}>REALMS</h4>
                        <p className="text-xs">© 2025 AI-Powered TTRPG Experience.</p>
                    </div>
                </div>
                <div className="flex gap-6">
                    <Twitter className={`cursor-pointer transition-colors ${dark ? 'hover:text-[#D4AF37]' : 'hover:text-white'}`} />
                    <Youtube className={`cursor-pointer transition-colors ${dark ? 'hover:text-[#D4AF37]' : 'hover:text-white'}`} />
                    <Instagram className={`cursor-pointer transition-colors ${dark ? 'hover:text-[#D4AF37]' : 'hover:text-white'}`} />
                    <Globe className={`cursor-pointer transition-colors ${dark ? 'hover:text-[#D4AF37]' : 'hover:text-white'}`} />
                </div>
                <div className="flex gap-8 text-sm font-bold">
                    <a href="#" className={`transition-colors ${dark ? 'hover:text-[#D4AF37]' : 'hover:text-white'}`}>Privacy Policy</a>
                    <a href="#" className={`transition-colors ${dark ? 'hover:text-[#D4AF37]' : 'hover:text-white'}`}>Terms of Service</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
