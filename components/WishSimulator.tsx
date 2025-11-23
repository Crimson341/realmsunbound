'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Gem, Scroll, Crown, Check, ArrowRight } from 'lucide-react';

const NewsletterSection = () => {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setTimeout(() => setIsSubmitted(true), 1000);
    };

    const milestones = [
        { count: '500K', icon: Scroll, label: 'Adventurer EXP', achieved: true },
        { count: '1M', icon: Gem, label: '1000 Primogems', achieved: true },
        { count: '2M', icon: Crown, label: 'Exclusive Wings', achieved: false },
    ];

    return (
        <section className="py-24 bg-gradient-to-b from-white to-[#f0f2f5] relative overflow-hidden">
             {/* Decorative Background Elements */}
             <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30">
                <div className="absolute -left-10 top-20 w-64 h-64 bg-genshin-gold/20 rounded-full blur-3xl"></div>
                <div className="absolute -right-10 bottom-20 w-80 h-80 bg-blue-100 rounded-full blur-3xl"></div>
                <div className="absolute inset-0 bg-[radial-gradient(#dcb478_1px,transparent_1px)] [background-size:32px_32px] opacity-20"></div>
            </div>

            <div className="max-w-5xl mx-auto px-6 relative z-10">
                
                {/* Header */}
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <span className="inline-block py-1 px-3 rounded-full bg-genshin-gold/10 text-genshin-gold font-bold text-xs tracking-[0.2em] uppercase mb-4 border border-genshin-gold/20">
                            Pre-Registration Open
                        </span>
                        <h2 className="font-serif text-4xl md:text-5xl text-[#1a1d2e] mb-4 font-bold">
                            Join the Adventure
                        </h2>
                        <p className="font-sans text-[#6b7280] text-lg max-w-2xl mx-auto">
                            Over <span className="text-genshin-gold font-bold">1,450,320</span> travelers have already pledged their allegiance. Unlock exclusive rewards when the servers open.
                        </p>
                    </motion.div>
                </div>

                {/* Milestone Tracker */}
                <div className="mb-20">
                    <div className="relative flex justify-between items-center max-w-3xl mx-auto">
                        {/* Progress Bar Line */}
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 rounded-full overflow-hidden">
                            <motion.div 
                                className="h-full bg-genshin-gold"
                                initial={{ width: 0 }}
                                whileInView={{ width: '70%' }}
                                transition={{ duration: 1.5, delay: 0.2 }}
                            ></motion.div>
                        </div>

                        {/* Nodes */}
                        {milestones.map((m, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 + (i * 0.2) }}
                                className="flex flex-col items-center group cursor-default"
                            >
                                <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center bg-white transition-all duration-300 ${m.achieved ? 'border-genshin-gold shadow-[0_0_20px_rgba(220,180,120,0.4)]' : 'border-gray-300 grayscale'}`}>
                                    {m.achieved ? (
                                        <div className="text-genshin-gold relative">
                                            <m.icon size={24} />
                                            <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5">
                                                <Check size={10} strokeWidth={4} />
                                            </div>
                                        </div>
                                    ) : (
                                        <m.icon size={24} className="text-gray-400" />
                                    )}
                                </div>
                                <div className="mt-4 text-center">
                                    <div className="font-serif font-bold text-[#1a1d2e]">{m.count}</div>
                                    <div className="text-xs font-sans text-gray-500 uppercase tracking-wider mt-1 font-bold">{m.label}</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Sign Up Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="max-w-2xl mx-auto bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-2 md:p-3 border border-gray-100"
                >
                    <div className="border border-dashed border-gray-200 rounded-lg p-8 md:p-10 bg-[#fcfcfc] relative overflow-hidden">
                        {!isSubmitted ? (
                            <>
                                <div className="text-center mb-8">
                                    <h3 className="font-serif text-2xl text-[#1a1d2e] mb-2">Secure Your Spot</h3>
                                    <p className="text-gray-500 text-sm">Enter your email to receive the "Traveler's Starter Pack" code on launch day.</p>
                                </div>

                                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                    <div className="relative">
                                        <input 
                                            type="email" 
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder=" "
                                            className="peer w-full px-6 py-4 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-genshin-gold focus:ring-1 focus:ring-genshin-gold/50 transition-all text-[#1a1d2e] placeholder-transparent"
                                        />
                                        <label className="absolute left-6 top-4 text-gray-400 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-4 peer-focus:top-[-10px] peer-focus:text-xs peer-focus:text-genshin-gold peer-focus:bg-[#fcfcfc] peer-focus:px-2 pointer-events-none">
                                            Email Address
                                        </label>
                                    </div>

                                    <button 
                                        type="submit"
                                        className="w-full py-4 bg-[#1a1d2e] text-white rounded-lg font-serif font-bold tracking-widest hover:bg-[#2a2f45] transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
                                    >
                                        <span className="relative z-10">PRE-REGISTER NOW</span>
                                        <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                                        {/* Hover Effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-genshin-gold to-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    </button>
                                </form>
                                
                                <p className="text-center text-xs text-gray-400 mt-6">
                                    By registering, you agree to our Terms of Service and Privacy Policy. 
                                    <br/>We promise not to spam your raven.
                                </p>
                            </>
                        ) : (
                             <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-10"
                            >
                                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Check size={40} strokeWidth={3} />
                                </div>
                                <h3 className="font-serif text-3xl text-[#1a1d2e] mb-3">You are Registered!</h3>
                                <p className="text-gray-500 mb-8">Keep an eye on your inbox for your confirmation owl.</p>
                                <button onClick={() => setIsSubmitted(false)} className="text-genshin-gold hover:underline text-sm font-bold tracking-wider">
                                    REGISTER ANOTHER EMAIL
                                </button>
                            </motion.div>
                        )}
                    </div>
                </motion.div>

                {/* Socials */}
                <div className="mt-16 flex justify-center gap-8 opacity-60 hover:opacity-100 transition-opacity">
                    {['Discord', 'Twitter', 'YouTube', 'Reddit'].map((social) => (
                        <a key={social} href="#" className="text-gray-400 hover:text-genshin-gold font-bold text-sm uppercase tracking-widest transition-colors">
                            {social}
                        </a>
                    ))}
                </div>

            </div>
        </section>
    );
};

export default NewsletterSection;
