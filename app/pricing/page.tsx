import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#f4f4f4] relative overflow-hidden font-sans text-genshin-dark selection:bg-genshin-gold/30">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[url('/hero-bg.svg')] opacity-10 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-white to-transparent opacity-80 pointer-events-none" />
      
      {/* Floating Particles/Orbs */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-genshin-gold/10 rounded-full blur-[80px] animate-pulse-slow" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-element-anemo/10 rounded-full blur-[100px] animate-pulse-slow" />

      <div className="container mx-auto px-4 pt-32 pb-24 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="flex justify-center mb-4">
             <span className="px-4 py-1 rounded-full bg-genshin-gold/10 border border-genshin-gold/30 text-genshin-dark text-sm font-bold tracking-widest uppercase">
                Membership Tiers
             </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6 text-genshin-dark">
            Choose Your <span className="text-genshin-gold drop-shadow-sm">Destiny</span>
          </h1>
          <p className="text-xl text-gray-600 font-medium leading-relaxed">
            Embark on your journey with the perfect set of tools. From wandering adventurers to masters of the realm.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto items-start">
          
          {/* Tier 1: Wanderer (Free) */}
          <div className="glass-panel rounded-[2rem] p-8 relative group hover:-translate-y-2 transition-all duration-500">
            <div className="mb-8">
              <h3 className="text-2xl font-serif font-bold text-gray-500 mb-2 flex items-center gap-2">
                Wanderer
              </h3>
              <div className="text-5xl font-serif font-bold text-genshin-dark mb-2">$0<span className="text-lg font-sans text-gray-400 font-bold ml-1">/mo</span></div>
              <p className="text-gray-500 font-medium text-sm">For players just starting their journey.</p>
            </div>
            
            <ul className="space-y-4 mb-8 border-t border-gray-200/60 pt-8">
              {[
                "Join Unlimited Campaigns",
                "Create 3 Characters",
                "Basic AI Storyteller",
                "Access to Public Library",
              ].map((feature) => (
                <li key={feature} className="flex items-start text-gray-600 font-medium">
                  <Check className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link 
              href="/sign-up"
              className="w-full block py-4 rounded-full border-2 border-gray-300 text-gray-500 font-bold text-center hover:border-genshin-gold hover:text-genshin-gold transition-colors uppercase tracking-wider text-sm"
            >
              Start Free
            </Link>
          </div>

          {/* Tier 2: Hero (Pro) - Highlighted */}
          <div className="glass-panel rounded-[2rem] p-1 relative group transform md:-translate-y-6 shadow-2xl shadow-genshin-gold/20">
            {/* Gold Border Gradient */}
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-b from-genshin-gold to-element-pyro opacity-50 -z-10 blur-sm" />
            
            <div className="bg-white/80 backdrop-blur-xl rounded-[1.9rem] p-8 h-full">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-genshin-gold to-amber-500 text-white text-xs font-bold px-6 py-2 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-2">
                <Sparkles className="w-3 h-3" /> Most Popular
              </div>
              
              <div className="mb-8 pt-4">
                <h3 className="text-3xl font-serif font-bold text-element-pyro mb-2 flex items-center gap-2">
                  Hero
                </h3>
                <div className="text-6xl font-serif font-bold text-genshin-dark mb-2">$9<span className="text-3xl text-genshin-dark">.99</span><span className="text-lg font-sans text-gray-400 font-bold ml-1">/mo</span></div>
                <p className="text-gray-600 font-medium text-sm">For creators and dedicated players.</p>
              </div>
              
              <ul className="space-y-4 mb-8 border-t border-gray-200/60 pt-8">
                {[
                  "Create 3 Custom Campaigns",
                  "Unlimited Characters",
                  "Smart Memory (AI Recall)",
                  "50 AI Image Generations / mo",
                  "Priority AI Processing",
                  "Private Campaigns",
                ].map((feature) => (
                  <li key={feature} className="flex items-start text-genshin-dark font-bold">
                    <Check className="w-5 h-5 text-genshin-gold mr-3 flex-shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link 
                href="/sign-up?plan=hero"
                className="btn-genshin w-full block py-4 rounded-full bg-genshin-gold text-white font-bold text-center shadow-lg shadow-genshin-gold/30 hover:shadow-genshin-gold/50 uppercase tracking-wider text-sm"
              >
                Become a Hero
              </Link>
            </div>
          </div>

          {/* Tier 3: Legend (Elite) */}
          <div className="glass-panel rounded-[2rem] p-8 relative group hover:-translate-y-2 transition-all duration-500 border-t-4 border-element-electro">
            <div className="mb-8">
              <h3 className="text-2xl font-serif font-bold text-element-electro mb-2 flex items-center gap-2">
                Legend
              </h3>
              <div className="text-5xl font-serif font-bold text-genshin-dark mb-2">$19<span className="text-lg font-sans text-gray-400 font-bold ml-1">/mo</span></div>
              <p className="text-gray-500 font-medium text-sm">For serious world-builders and GMs.</p>
            </div>
            
            <ul className="space-y-4 mb-8 border-t border-gray-200/60 pt-8">
              {[
                "Unlimited Campaigns",
                "Unlimited AI Images",
                "Advanced AI (Gemini Pro 1.5)",
                "Custom AI Persona Training",
                "Commercial Rights",
                "Early Access Features",
              ].map((feature) => (
                <li key={feature} className="flex items-start text-gray-600 font-medium">
                  <Check className="w-5 h-5 text-element-electro mr-3 flex-shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link 
              href="/sign-up?plan=legend"
              className="w-full block py-4 rounded-full border-2 border-element-electro/30 text-element-electro font-bold text-center hover:bg-element-electro hover:text-white transition-all uppercase tracking-wider text-sm"
            >
              Ascend to Legend
            </Link>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto mt-32">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4 text-genshin-dark">Common Questions</h2>
                <div className="h-1 w-20 bg-genshin-gold mx-auto rounded-full" />
            </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { q: "Can I switch plans later?", a: "Absolutely. You can upgrade or downgrade your realm access at any time from your dashboard settings." },
              { q: "What is 'Smart Memory'?", a: "Our advanced AI system remembers your adventures across sessions. It recalls NPCs you've met, items you've found, and enemies you've made." },
              { q: "Do I own the assets?", a: "On the Legend plan, you have full commercial rights to all text and images generated within Realms. Wanderer and Hero plans grant a personal use license." },
              { q: "Is there a free trial?", a: "The Wanderer tier is free forever! You can upgrade to Hero or Legend whenever you're ready for more power." },
            ].map((faq, i) => (
              <div key={i} className="glass-panel p-8 rounded-2xl hover:shadow-lg transition-shadow">
                <h4 className="text-lg font-serif font-bold mb-3 text-genshin-dark">{faq.q}</h4>
                <p className="text-gray-600 leading-relaxed text-sm font-medium">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}