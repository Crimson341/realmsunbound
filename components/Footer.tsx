import { Twitter, Youtube, Instagram, Globe } from 'lucide-react';

const Footer = () => (
    <footer className="bg-black text-gray-500 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-white font-serif text-2xl">A</div>
                <div>
                    <h4 className="text-white font-serif tracking-widest">AETHERIA</h4>
                    <p className="text-xs">© 2025 HOYOVERSE INSPIRED. FAN PROJECT.</p>
                </div>
            </div>
            <div className="flex gap-6">
                <T className="hover:text-white cursor-pointer transition-colors" />
                <Youtube className="hover:text-white cursor-pointer transition-colors" />
                <Instagram className="hover:text-white cursor-pointer transition-colors" />
                <Globe className="hover:text-white cursor-pointer transition-colors" />
            </div>
            <div className="flex gap-8 text-sm font-bold">
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
        </div>
    </footer>
);

export default Footer;