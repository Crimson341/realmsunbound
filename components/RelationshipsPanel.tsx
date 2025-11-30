"use client";

import { useState } from "react";
import { X, Users, Shield, Heart, Skull, Handshake, Swords, User, ChevronDown, ChevronUp } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface FactionRelationship {
  id: Id<"factions">;
  name: string;
  description: string;
  imageUrl: string | null;
  reputation: number;
  territory?: string;
}

interface NPCRelationship {
  id: Id<"npcs">;
  name: string;
  role: string;
  attitude: string;
  description: string;
  imageUrl: string | null;
  factionId?: Id<"factions"> | null;
  factionName: string | null;
  factionReputation: number;
  loyalty?: number;
  isRecruitable?: boolean;
}

interface RelationshipsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  factions: FactionRelationship[];
  npcs: NPCRelationship[];
}

// Reputation thresholds and labels
const getReputationTier = (rep: number): { label: string; color: string; bgColor: string; icon: React.ReactNode } => {
  if (rep >= 75) return { label: "Allied", color: "text-emerald-400", bgColor: "bg-emerald-500", icon: <Handshake className="w-4 h-4" /> };
  if (rep >= 50) return { label: "Friendly", color: "text-green-400", bgColor: "bg-green-500", icon: <Heart className="w-4 h-4" /> };
  if (rep >= 25) return { label: "Favorable", color: "text-lime-400", bgColor: "bg-lime-500", icon: <Heart className="w-4 h-4" /> };
  if (rep >= -25) return { label: "Neutral", color: "text-slate-400", bgColor: "bg-slate-500", icon: <Shield className="w-4 h-4" /> };
  if (rep >= -50) return { label: "Unfriendly", color: "text-orange-400", bgColor: "bg-orange-500", icon: <Swords className="w-4 h-4" /> };
  if (rep >= -75) return { label: "Hostile", color: "text-red-400", bgColor: "bg-red-500", icon: <Swords className="w-4 h-4" /> };
  return { label: "Enemy", color: "text-red-500", bgColor: "bg-red-600", icon: <Skull className="w-4 h-4" /> };
};

// NPC attitude color mapping
const getAttitudeStyle = (attitude: string): { color: string; bgColor: string } => {
  const lower = attitude.toLowerCase();
  if (lower.includes("friend") || lower.includes("loyal") || lower.includes("ally")) {
    return { color: "text-emerald-400", bgColor: "bg-emerald-500/20" };
  }
  if (lower.includes("neutral") || lower.includes("indifferent")) {
    return { color: "text-slate-400", bgColor: "bg-slate-500/20" };
  }
  if (lower.includes("hostile") || lower.includes("enemy") || lower.includes("aggressive")) {
    return { color: "text-red-400", bgColor: "bg-red-500/20" };
  }
  if (lower.includes("suspicious") || lower.includes("wary")) {
    return { color: "text-orange-400", bgColor: "bg-orange-500/20" };
  }
  return { color: "text-blue-400", bgColor: "bg-blue-500/20" };
};

function ReputationBar({ reputation }: { reputation: number }) {
  // Normalize reputation from -100 to 100 -> 0 to 100 for display
  const normalized = (reputation + 100) / 2;
  const tier = getReputationTier(reputation);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className={tier.color}>{tier.icon}</span>
          <span className={`text-xs font-medium ${tier.color}`}>{tier.label}</span>
        </div>
        <span className="text-xs text-slate-500">{reputation > 0 ? "+" : ""}{reputation}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full relative">
          {/* Background gradient showing full range */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-slate-600 to-emerald-600 opacity-30" />
          {/* Actual reputation indicator */}
          <div
            className={`absolute top-0 bottom-0 left-0 ${tier.bgColor} transition-all duration-500`}
            style={{ width: `${normalized}%` }}
          />
          {/* Center line (neutral marker) */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/30" />
        </div>
      </div>
    </div>
  );
}

function FactionCard({ faction }: { faction: FactionRelationship }) {
  const [expanded, setExpanded] = useState(false);
  const tier = getReputationTier(faction.reputation);

  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-start gap-3">
          {faction.imageUrl ? (
            <img
              src={faction.imageUrl}
              alt={faction.name}
              className="w-12 h-12 rounded-lg object-cover border border-slate-700"
            />
          ) : (
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${tier.bgColor}/20 border border-slate-700`}>
              <Shield className={`w-6 h-6 ${tier.color}`} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium text-white truncate">{faction.name}</h3>
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
              )}
            </div>
            <div className="mt-2">
              <ReputationBar reputation={faction.reputation} />
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-800/50">
          <p className="text-sm text-slate-400 mt-3">{faction.description}</p>
          {faction.territory && (
            <p className="text-xs text-slate-500 mt-2">
              <span className="text-slate-400">Territory:</span> {faction.territory}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function NPCCard({ npc }: { npc: NPCRelationship }) {
  const attitudeStyle = getAttitudeStyle(npc.attitude);

  return (
    <div className="bg-slate-900/30 border border-slate-800/50 rounded-lg p-3 hover:bg-slate-800/30 transition-colors">
      <div className="flex items-start gap-3">
        {npc.imageUrl ? (
          <img
            src={npc.imageUrl}
            alt={npc.name}
            className="w-10 h-10 rounded-lg object-cover border border-slate-700"
          />
        ) : (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${attitudeStyle.bgColor} border border-slate-700`}>
            <User className={`w-5 h-5 ${attitudeStyle.color}`} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-white text-sm truncate">{npc.name}</h4>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${attitudeStyle.bgColor} ${attitudeStyle.color}`}>
              {npc.attitude}
            </span>
          </div>
          <p className="text-xs text-slate-500">{npc.role}</p>
          {npc.factionName && (
            <p className="text-xs text-slate-600 mt-0.5">
              <span className="text-amber-500/70">{npc.factionName}</span>
            </p>
          )}
          {npc.isRecruitable && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 mt-1">
              <Handshake className="w-3 h-3" />
              Can be recruited
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function RelationshipsPanel({ isOpen, onClose, factions, npcs }: RelationshipsPanelProps) {
  const [activeTab, setActiveTab] = useState<"factions" | "npcs">("factions");

  if (!isOpen) return null;

  // Group NPCs by faction
  const npcsByFaction = new Map<string, NPCRelationship[]>();
  const unaffiliatedNpcs: NPCRelationship[] = [];

  npcs.forEach((npc) => {
    if (npc.factionName) {
      const existing = npcsByFaction.get(npc.factionName) || [];
      npcsByFaction.set(npc.factionName, [...existing, npc]);
    } else {
      unaffiliatedNpcs.push(npc);
    }
  });

  // Sort factions by reputation (highest first)
  const sortedFactions = [...factions].sort((a, b) => b.reputation - a.reputation);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-[95vw] h-[85vh] max-w-2xl bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/50 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-sm font-medium text-slate-300">Relationships</h2>
              <p className="text-xs text-slate-500">How the world sees you</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800/50">
          <button
            onClick={() => setActiveTab("factions")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "factions"
                ? "text-amber-400 border-b-2 border-amber-400 bg-amber-500/5"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Factions ({factions.length})
          </button>
          <button
            onClick={() => setActiveTab("npcs")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "npcs"
                ? "text-amber-400 border-b-2 border-amber-400 bg-amber-500/5"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Characters ({npcs.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "factions" ? (
            <div className="space-y-3">
              {sortedFactions.length > 0 ? (
                sortedFactions.map((faction) => (
                  <FactionCard key={faction.id} faction={faction} />
                ))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No factions in this realm yet</p>
                  <p className="text-xs text-slate-600 mt-1">Factions will appear as you explore</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* NPCs grouped by faction */}
              {Array.from(npcsByFaction.entries()).map(([factionName, factionNpcs]) => (
                <div key={factionName}>
                  <h3 className="text-xs font-medium text-amber-500/70 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    {factionName}
                  </h3>
                  <div className="space-y-2">
                    {factionNpcs.map((npc) => (
                      <NPCCard key={npc.id} npc={npc} />
                    ))}
                  </div>
                </div>
              ))}

              {/* Unaffiliated NPCs */}
              {unaffiliatedNpcs.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <User className="w-3 h-3" />
                    Independent
                  </h3>
                  <div className="space-y-2">
                    {unaffiliatedNpcs.map((npc) => (
                      <NPCCard key={npc.id} npc={npc} />
                    ))}
                  </div>
                </div>
              )}

              {npcs.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No characters met yet</p>
                  <p className="text-xs text-slate-600 mt-1">Interact with the world to meet new people</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-slate-800/50 bg-slate-900/30">
          <p className="text-xs text-slate-600 text-center">
            Your actions shape how the world perceives you
          </p>
        </div>
      </div>
    </div>
  );
}
