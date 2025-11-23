'use client';

import { useState } from 'react';
import { Star, Aperture } from 'lucide-react';

// --- MOCK DATA ---
const CHARACTERS = [
    {
        id: 'lumina',
        name: 'Lumina',
        element: 'Anemo',
        rarity: 5,
        weapon: 'Sword',
        desc: 'The outlander who caught the wind. She searches for her lost kin.',
        color: '#74c2a8',
        img: 'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=600&auto=format&fit=crop' // Placeholder
    },
    {
        id: 'ignis',
        name: 'Ignis',
        element: 'Pyro',
        rarity: 5,
        weapon: 'Claymore',
        desc: 'A passionate warrior whose blade burns with the fury of a thousand suns.',
        color: '#ec4923',
        img: 'https://images.unsplash.com/photo-1637823443627-8b972cb58989?q=80&w=600&auto=format&fit=crop'
    },
    {
        id: 'volt',
        name: 'Raiden',
        element: 'Electro',
        rarity: 4,
        weapon: 'Polearm',
        desc: 'Swift as lightning, he guards the eternal city from the shadows.',
        color: '#a356e1',
        img: 'https://images.unsplash.com/photo-1515536266301-6c63b0316f3e?q=80&w=600&auto=format&fit=crop'
    },
    {
        id: 'marine',
        name: 'Coral',
        element: 'Hydro',
        rarity: 4,
        weapon: 'Catalyst',
        desc: 'A priestess of the deep sea who heals with the morning dew.',
        color: '#00bfff',
        img: 'https://images.unsplash.com/photo-1560130958-daf6687a63c6?q=80&w=600&auto=format&fit=crop'
    }
];

interface CharacterCardProps {
    char: typeof CHARACTERS[0];
    active: boolean;
    onClick: () => void;
}

const CharacterCard = ({ char, active, onClick }: CharacterCardProps) => {
    return (
        <div 
            onClick={onClick}
            className={`relative cursor-pointer transition-all duration-500 ease-out overflow-hidden rounded-xl shadow-xl ${active ? 'w-[300px] md:w-[400px] grayscale-0' : 'w-[80px] md:w-[100px] grayscale hover:grayscale-0'}`}
            style={{ height: '500px' }}
        >
            <img src={char.img} alt={char.name} className="absolute inset-0 w-full h-full object-cover" />
            <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent ${active ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
                <div className="absolute bottom-0 left-0 p-6 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-white/20 backdrop-blur-sm border border-white/40" style={{ color: char.color }}>{char.element}</span>
                        <div className="flex text-yellow-400">
                            {[...Array(char.rarity)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                        </div>
                    </div>
                    <h3 className="font-serif text-3xl mb-2">{char.name}</h3>
                    <p className="font-sans text-sm text-gray-300 line-clamp-2">{char.desc}</p>
                </div>
            </div>
            {/* Element Icon overlay when inactive */}
            {!active && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-black/50 backdrop-blur text-white">
                    <Aperture size={16} color={char.color} />
                </div>
            )}
        </div>
    );
};

const CharacterShowcase = () => {
    const [activeId, setActiveId] = useState(CHARACTERS[0].id);

    return (
        <section className="py-20 px-4 md:px-10 bg-white relative z-20">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Element_Anemo.svg/1024px-Element_Anemo.svg.png" className="w-12 h-12 mx-auto mb-4 opacity-20" alt="" />
                    <h2 className="font-serif text-4xl text-genshin-dark mb-4">Meet the Travelers</h2>
                    <div className="w-20 h-1 bg-genshin-gold mx-auto rounded-full"></div>
                </div>
                
                <div className="flex justify-center gap-4 h-[500px]">
                    {CHARACTERS.map((char) => (
                        <CharacterCard 
                            key={char.id} 
                            char={char} 
                            active={activeId === char.id} 
                            onClick={() => setActiveId(char.id)} 
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default CharacterShowcase;
