"use client";

import React from 'react';
import { Sword, ArrowRight, Mail, Github, Twitter, Youtube } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-stone-950 border-t border-stone-900 pt-20 pb-10 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="grid md:grid-cols-4 gap-12 mb-16">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <Sword className="text-indigo-500" size={24} />
                            <span className="text-2xl font-serif font-bold text-stone-100">Dragon<span className="text-indigo-500">Forge</span></span>
                        </div>
                        <p className="text-stone-500 leading-relaxed">
                            Forging the next generation of interactive storytelling through the power of arcane intelligence.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">Product</h4>
                        <ul className="space-y-4 text-stone-500">
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Features</a></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Integrations</a></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Pricing</a></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Changelog</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">Resources</h4>
                        <ul className="space-y-4 text-stone-500">
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Documentation</a></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">API Reference</a></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Community</a></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Blog</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">Stay Updated</h4>
                        <p className="text-stone-500 mb-4">Join our newsletter for the latest updates and lore.</p>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" size={16} />
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="w-full bg-stone-900 border border-stone-800 rounded-lg py-2 pl-10 pr-4 text-stone-300 focus:outline-none focus:border-indigo-500 transition-colors"
                                />
                            </div>
                            <button className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors">
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-stone-900 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-stone-500 text-sm">
                        © 2024 DragonForge AI. All rights reserved.
                    </div>
                    <div className="flex gap-6">
                        {[Github, Twitter, Youtube].map((Icon, i) => (
                            <a key={i} href="#" className="text-stone-500 hover:text-white hover:scale-110 transition-all">
                                <Icon size={20} />
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
