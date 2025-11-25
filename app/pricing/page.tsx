'use client';

import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { useTheme } from '@/components/ThemeProvider';

export default function PricingPage() {
  const { theme, mounted } = useTheme();
  const dark = mounted ? theme === 'dark' : false;

  return (
    <div className={`min-h-screen relative overflow-hidden font-sans selection:bg-genshin-gold/30 ${dark ? 'bg-[#0f1119] text-[#e8e6e3]' : 'bg-[#f4f4f4] text-genshin-dark'}`}>
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[url('/hero-bg.svg')] opacity-10 pointer-events-none" />
      <div className={`absolute top-0 left-0 w-full h-96 pointer-events-none ${dark ? 'bg-gradient-to-b from-[#0f1119] to-transparent opacity-80' : 'bg-gradient-to-b from-white to-transparent opacity-80'}`} />
      
      {/* Floating Particles/Orbs */}
      <div className={`absolute top-20 left-20 w-64 h-64 rounded-full blur-[80px] animate-pulse-slow ${dark ? 'bg-[#D4AF37]/10' : 'bg-genshin-gold/10'}`} />
      <div className={`absolute bottom-20 right-20 w-96 h-96 rounded-full blur-[100px] animate-pulse-slow ${dark ? 'bg-[#D4AF37]/5' : 'bg-element-anemo/10'}`} />

      <div className="container mx-auto px-4 pt-32 pb-24 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="flex justify-center mb-4">
             <span className={`px-4 py-1 rounded-full text-sm font-bold tracking-widest uppercase ${
               dark 
                 ? 'bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#e8e6e3]' 
                 : 'bg-genshin-gold/10 border border-genshin-gold/30 text-genshin-dark'
             }`}>
                Membership Tiers
             </span>
          </div>
          <h1 className={`text-5xl md:text-6xl font-serif font-bold mb-6 ${dark ? 'text-[#e8e6e3]' : 'text-genshin-dark'}`}>
            Choose Your <span className={`drop-shadow-sm ${dark ? 'text-[#D4AF37]' : 'text-genshin-gold'}`}>Destiny</span>
          </h1>
          <p className={`text-xl font-medium leading-relaxed ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
            Embark on your journey with the perfect set of tools. From wandering adventurers to masters of the realm.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto items-start">
          
          {/* Tier 1: Wanderer (Free) */}
          <div className={`rounded-[2rem] p-8 relative group hover:-translate-y-2 transition-all duration-500 ${
            dark 
              ? 'bg-[#1a1d2e]/80 backdrop-blur-xl border border-[#2a2d3e]' 
              : 'glass-panel'
          }`}>
            <div className="mb-8">
              <h3 className={`text-2xl font-serif font-bold mb-2 flex items-center gap-2 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                Wanderer
              </h3>
              <div className={`text-5xl font-serif font-bold mb-2 ${dark ? 'text-[#e8e6e3]' : 'text-genshin-dark'}`}>$0<span className={`text-lg font-sans font-bold ml-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>/mo</span></div>
              <p className={`font-medium text-sm ${dark ? 'text-gray-500' : 'text-gray-500'}`}>For players just starting their journey.</p>
            </div>
            
            <ul className={`space-y-4 mb-8 border-t pt-8 ${dark ? 'border-[#2a2d3e]' : 'border-gray-200/60'}`}>
              {[
                "Join Unlimited Campaigns",
                "Create 3 Characters",
                "Basic AI Storyteller",
                "Access to Public Library",
              ].map((feature) => (
                <li key={feature} className={`flex items-start font-medium ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <Check className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`} />
                  {feature}
                </li>
              ))}
            </ul>

            <Link 
              href="/sign-up"
              className={`w-full block py-4 rounded-full border-2 font-bold text-center transition-colors uppercase tracking-wider text-sm ${
                dark 
                  ? 'border-[#2a2d3e] text-gray-400 hover:border-[#D4AF37] hover:text-[#D4AF37]' 
                  : 'border-gray-300 text-gray-500 hover:border-genshin-gold hover:text-genshin-gold'
              }`}
            >
              Start Free
            </Link>
          </div>

          {/* Tier 2: Hero (Pro) - Highlighted */}
          <div className={`rounded-[2rem] p-1 relative group transform md:-translate-y-6 ${dark ? 'shadow-2xl shadow-[#D4AF37]/20' : 'shadow-2xl shadow-genshin-gold/20'}`}>
            {/* Gold Border Gradient */}
            <div className={`absolute inset-0 rounded-[2rem] bg-gradient-to-b opacity-50 -z-10 blur-sm ${dark ? 'from-[#D4AF37] to-[#c5a028]' : 'from-genshin-gold to-element-pyro'}`} />
            
            <div className={`backdrop-blur-xl rounded-[1.9rem] p-8 h-full ${dark ? 'bg-[#1a1d2e]/90' : 'bg-white/80'}`}>
              <div className={`absolute -top-5 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-6 py-2 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-2 ${
                dark 
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#c5a028]' 
                  : 'bg-gradient-to-r from-genshin-gold to-amber-500'
              }`}>
                <Sparkles className="w-3 h-3" /> Most Popular
              </div>
              
              <div className="mb-8 pt-4">
                <h3 className={`text-3xl font-serif font-bold mb-2 flex items-center gap-2 ${dark ? 'text-[#D4AF37]' : 'text-element-pyro'}`}>
                  Hero
                </h3>
                <div className={`text-6xl font-serif font-bold mb-2 ${dark ? 'text-[#e8e6e3]' : 'text-genshin-dark'}`}>$9<span className={`text-3xl ${dark ? 'text-[#e8e6e3]' : 'text-genshin-dark'}`}>.99</span><span className={`text-lg font-sans font-bold ml-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>/mo</span></div>
                <p className={`font-medium text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>For creators and dedicated players.</p>
              </div>
              
              <ul className={`space-y-4 mb-8 border-t pt-8 ${dark ? 'border-[#2a2d3e]' : 'border-gray-200/60'}`}>
                {[
                  "Create 3 Custom Campaigns",
                  "Unlimited Characters",
                  "Smart Memory (AI Recall)",
                  "50 AI Image Generations / mo",
                  "Priority AI Processing",
                  "Private Campaigns",
                ].map((feature) => (
                  <li key={feature} className={`flex items-start font-bold ${dark ? 'text-[#e8e6e3]' : 'text-genshin-dark'}`}>
                    <Check className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${dark ? 'text-[#D4AF37]' : 'text-genshin-gold'}`} />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link 
                href="/sign-up?plan=hero"
                className={`btn-genshin w-full block py-4 rounded-full text-white font-bold text-center shadow-lg uppercase tracking-wider text-sm ${
                  dark 
                    ? 'bg-[#D4AF37] shadow-[#D4AF37]/30 hover:shadow-[#D4AF37]/50' 
                    : 'bg-genshin-gold shadow-genshin-gold/30 hover:shadow-genshin-gold/50'
                }`}
              >
                Become a Hero
              </Link>
            </div>
          </div>

          {/* Tier 3: Legend (Elite) */}
          <div className={`rounded-[2rem] p-8 relative group hover:-translate-y-2 transition-all duration-500 border-t-4 ${
            dark 
              ? 'bg-[#1a1d2e]/80 backdrop-blur-xl border-[#a855f7] border border-t-4 border-[#2a2d3e]' 
              : 'glass-panel border-element-electro'
          }`} style={{ borderTopColor: dark ? '#a855f7' : undefined }}>
            <div className="mb-8">
              <h3 className={`text-2xl font-serif font-bold mb-2 flex items-center gap-2 ${dark ? 'text-purple-400' : 'text-element-electro'}`}>
                Legend
              </h3>
              <div className={`text-5xl font-serif font-bold mb-2 ${dark ? 'text-[#e8e6e3]' : 'text-genshin-dark'}`}>$19<span className={`text-lg font-sans font-bold ml-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>/mo</span></div>
              <p className={`font-medium text-sm ${dark ? 'text-gray-500' : 'text-gray-500'}`}>For serious world-builders and GMs.</p>
            </div>
            
            <ul className={`space-y-4 mb-8 border-t pt-8 ${dark ? 'border-[#2a2d3e]' : 'border-gray-200/60'}`}>
              {[
                "Unlimited Campaigns",
                "Unlimited AI Images",
                "Advanced AI (Gemini Pro 1.5)",
                "Custom AI Persona Training",
                "Commercial Rights",
                "Early Access Features",
              ].map((feature) => (
                <li key={feature} className={`flex items-start font-medium ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <Check className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${dark ? 'text-purple-400' : 'text-element-electro'}`} />
                  {feature}
                </li>
              ))}
            </ul>

            <Link 
              href="/sign-up?plan=legend"
              className={`w-full block py-4 rounded-full border-2 font-bold text-center transition-all uppercase tracking-wider text-sm ${
                dark 
                  ? 'border-purple-400/30 text-purple-400 hover:bg-purple-400 hover:text-white' 
                  : 'border-element-electro/30 text-element-electro hover:bg-element-electro hover:text-white'
              }`}
            >
              Ascend to Legend
            </Link>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto mt-32">
            <div className="text-center mb-16">
                <h2 className={`text-3xl md:text-4xl font-serif font-bold mb-4 ${dark ? 'text-[#e8e6e3]' : 'text-genshin-dark'}`}>Common Questions</h2>
                <div className={`h-1 w-20 mx-auto rounded-full ${dark ? 'bg-[#D4AF37]' : 'bg-genshin-gold'}`} />
            </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { q: "Can I switch plans later?", a: "Absolutely. You can upgrade or downgrade your realm access at any time from your dashboard settings." },
              { q: "What is 'Smart Memory'?", a: "Our advanced AI system remembers your adventures across sessions. It recalls NPCs you've met, items you've found, and enemies you've made." },
              { q: "Do I own the assets?", a: "On the Legend plan, you have full commercial rights to all text and images generated within Realms. Wanderer and Hero plans grant a personal use license." },
              { q: "Is there a free trial?", a: "The Wanderer tier is free forever! You can upgrade to Hero or Legend whenever you're ready for more power." },
            ].map((faq, i) => (
              <div key={i} className={`p-8 rounded-2xl hover:shadow-lg transition-shadow ${
                dark 
                  ? 'bg-[#1a1d2e]/80 backdrop-blur-xl border border-[#2a2d3e]' 
                  : 'glass-panel'
              }`}>
                <h4 className={`text-lg font-serif font-bold mb-3 ${dark ? 'text-[#e8e6e3]' : 'text-genshin-dark'}`}>{faq.q}</h4>
                <p className={`leading-relaxed text-sm font-medium ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
