"use client";

import { useState, useMemo, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Swords,
  Users,
  BarChart3,
  Sparkles,
  Dices,
  ChevronRight,
  ChevronLeft,
  Check,
  Minus,
  Plus,
  RefreshCw,
} from "lucide-react";

interface ClassOption {
  name: string;
  description: string;
  bonusStats?: Record<string, number>;
}

interface RaceOption {
  name: string;
  description: string;
  bonusStats?: Record<string, number>;
}

interface StatConfig {
  key: string;
  label: string;
  description?: string;
}

interface CharacterCreationConfig {
  availableClasses: ClassOption[];
  availableRaces: RaceOption[];
  statAllocationMethod: string;
  startingStatPoints: number;
  allowCustomNames: boolean;
  terminology: Record<string, string>;
  statConfig: StatConfig[] | null;
  theme?: string;
}

interface CharacterCreationModalProps {
  isOpen: boolean;
  campaignId: Id<"campaigns">;
  config: CharacterCreationConfig;
  defaultName?: string;
  onComplete: () => void;
}

const DEFAULT_STATS = [
  { key: "strength", label: "Strength", description: "Physical power and melee damage" },
  { key: "dexterity", label: "Dexterity", description: "Agility, reflexes, and ranged attacks" },
  { key: "constitution", label: "Constitution", description: "Health and endurance" },
  { key: "intelligence", label: "Intelligence", description: "Knowledge and magical aptitude" },
  { key: "wisdom", label: "Wisdom", description: "Perception and willpower" },
  { key: "charisma", label: "Charisma", description: "Social influence and leadership" },
];

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

type Step = "name" | "class" | "race" | "stats" | "confirm";

export function CharacterCreationModal({
  isOpen,
  campaignId,
  config,
  defaultName = "",
  onComplete,
}: CharacterCreationModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>("name");
  const [characterName, setCharacterName] = useState(defaultName);
  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
  const [selectedRace, setSelectedRace] = useState<RaceOption | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [isCreating, setIsCreating] = useState(false);

  const createCharacter = useMutation(api.forge.createCharacter);

  // Get stat config - use campaign's custom stats or defaults
  const statConfig = useMemo(() => {
    return config.statConfig || DEFAULT_STATS;
  }, [config.statConfig]);

  // Get terminology - for custom naming like "Class" -> "Ninja Rank"
  const getTerminology = useCallback((term: string) => {
    const terminologyMap: Record<string, string> = {
      class: config.terminology?.class || "Class",
      race: config.terminology?.race || "Race",
      stats: config.terminology?.stats || "Stats",
    };
    return terminologyMap[term.toLowerCase()] || term;
  }, [config.terminology]);

  // Initialize stats based on allocation method
  const initializeStats = useCallback(() => {
    const initialStats: Record<string, number> = {};

    if (config.statAllocationMethod === "standard_array") {
      // Assign standard array values in order initially
      statConfig.forEach((stat, index) => {
        initialStats[stat.key] = STANDARD_ARRAY[index] || 10;
      });
    } else if (config.statAllocationMethod === "random") {
      // Roll 4d6 drop lowest for each stat
      statConfig.forEach((stat) => {
        const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
        rolls.sort((a, b) => b - a);
        initialStats[stat.key] = rolls.slice(0, 3).reduce((sum, r) => sum + r, 0);
      });
    } else {
      // Point buy or fixed - start at 8 or 10
      statConfig.forEach((stat) => {
        initialStats[stat.key] = config.statAllocationMethod === "point_buy" ? 8 : 10;
      });
    }

    setStats(initialStats);
  }, [config.statAllocationMethod, statConfig]);

  // Calculate remaining points for point buy
  const pointsUsed = useMemo(() => {
    if (config.statAllocationMethod !== "point_buy") return 0;

    let points = 0;
    Object.values(stats).forEach((value) => {
      // Point buy cost: 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9
      if (value <= 13) {
        points += value - 8;
      } else if (value === 14) {
        points += 7;
      } else if (value === 15) {
        points += 9;
      }
    });
    return points;
  }, [stats, config.statAllocationMethod]);

  const remainingPoints = config.startingStatPoints - pointsUsed;

  // Adjust stat for point buy
  const adjustStat = (statKey: string, delta: number) => {
    const currentValue = stats[statKey] || 8;
    const newValue = currentValue + delta;

    // Validate bounds (8-15 for point buy)
    if (newValue < 8 || newValue > 15) return;

    // Calculate cost difference
    const getCost = (val: number) => {
      if (val <= 13) return val - 8;
      if (val === 14) return 7;
      if (val === 15) return 9;
      return 0;
    };

    const costDiff = getCost(newValue) - getCost(currentValue);
    if (costDiff > remainingPoints) return;

    setStats((prev) => ({ ...prev, [statKey]: newValue }));
  };

  // Calculate final stats with race/class bonuses
  const finalStats = useMemo(() => {
    const final: Record<string, number> = { ...stats };

    if (selectedRace?.bonusStats) {
      Object.entries(selectedRace.bonusStats).forEach(([key, bonus]) => {
        final[key] = (final[key] || 10) + bonus;
      });
    }

    if (selectedClass?.bonusStats) {
      Object.entries(selectedClass.bonusStats).forEach(([key, bonus]) => {
        final[key] = (final[key] || 10) + bonus;
      });
    }

    return final;
  }, [stats, selectedRace, selectedClass]);

  // Navigation
  const steps: Step[] = ["name", "class", "race", "stats", "confirm"];
  const currentStepIndex = steps.indexOf(currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case "name":
        return characterName.trim().length > 0;
      case "class":
        return selectedClass !== null;
      case "race":
        return selectedRace !== null;
      case "stats":
        return config.statAllocationMethod !== "point_buy" || remainingPoints >= 0;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (currentStep === "name" && Object.keys(stats).length === 0) {
      initializeStats();
    }
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  // Create character
  const handleCreate = async () => {
    if (!selectedClass || !selectedRace) return;

    setIsCreating(true);
    try {
      await createCharacter({
        name: characterName.trim(),
        class: selectedClass.name,
        race: selectedRace.name,
        level: 1,
        stats: JSON.stringify(finalStats),
        campaignId,
      });
      onComplete();
    } catch (error) {
      console.error("Failed to create character:", error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-800">
          <h2 className="text-2xl font-bold text-center">Create Your Character</h2>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    index < currentStepIndex
                      ? "bg-green-600 text-white"
                      : index === currentStepIndex
                      ? "bg-amber-600 text-white"
                      : "bg-neutral-700 text-neutral-400"
                  }`}
                >
                  {index < currentStepIndex ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 h-0.5 ${
                      index < currentStepIndex ? "bg-green-600" : "bg-neutral-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Name */}
            {currentStep === "name" && (
              <motion.div
                key="name"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <User className="w-12 h-12 mx-auto text-amber-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">What is your name, adventurer?</h3>
                  <p className="text-neutral-400 text-sm">
                    Choose a name that will echo through the ages
                  </p>
                </div>

                <input
                  type="text"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  placeholder="Enter your character's name..."
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-lg text-center focus:outline-none focus:border-amber-500 transition-colors"
                  autoFocus
                  maxLength={30}
                />
              </motion.div>
            )}

            {/* Step 2: Class Selection */}
            {currentStep === "class" && (
              <motion.div
                key="class"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <Swords className="w-12 h-12 mx-auto text-red-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Choose Your {getTerminology("class")}</h3>
                  <p className="text-neutral-400 text-sm">
                    Select your path and fighting style
                  </p>
                </div>

                <div className="grid gap-3">
                  {config.availableClasses.map((cls) => (
                    <button
                      key={cls.name}
                      onClick={() => setSelectedClass(cls)}
                      className={`p-4 rounded-lg border transition-all text-left ${
                        selectedClass?.name === cls.name
                          ? "bg-red-900/30 border-red-500"
                          : "bg-neutral-800/50 border-neutral-700 hover:border-neutral-600"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-lg">{cls.name}</span>
                        {selectedClass?.name === cls.name && (
                          <Check className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      <p className="text-sm text-neutral-400 mt-1">{cls.description}</p>
                      {cls.bonusStats && Object.keys(cls.bonusStats).length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {Object.entries(cls.bonusStats).map(([stat, bonus]) => (
                            <span
                              key={stat}
                              className="text-xs px-2 py-0.5 bg-neutral-700 rounded text-green-400"
                            >
                              +{bonus} {stat}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Race Selection */}
            {currentStep === "race" && (
              <motion.div
                key="race"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto text-blue-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Choose Your {getTerminology("race")}</h3>
                  <p className="text-neutral-400 text-sm">
                    Select your lineage and heritage
                  </p>
                </div>

                <div className="grid gap-3">
                  {config.availableRaces.map((race) => (
                    <button
                      key={race.name}
                      onClick={() => setSelectedRace(race)}
                      className={`p-4 rounded-lg border transition-all text-left ${
                        selectedRace?.name === race.name
                          ? "bg-blue-900/30 border-blue-500"
                          : "bg-neutral-800/50 border-neutral-700 hover:border-neutral-600"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-lg">{race.name}</span>
                        {selectedRace?.name === race.name && (
                          <Check className="w-5 h-5 text-blue-400" />
                        )}
                      </div>
                      <p className="text-sm text-neutral-400 mt-1">{race.description}</p>
                      {race.bonusStats && Object.keys(race.bonusStats).length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {Object.entries(race.bonusStats).map(([stat, bonus]) => (
                            <span
                              key={stat}
                              className="text-xs px-2 py-0.5 bg-neutral-700 rounded text-green-400"
                            >
                              +{bonus} {stat}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 4: Stats */}
            {currentStep === "stats" && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto text-purple-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Allocate Your {getTerminology("stats")}</h3>
                  <p className="text-neutral-400 text-sm">
                    {config.statAllocationMethod === "point_buy"
                      ? `You have ${config.startingStatPoints} points to spend`
                      : config.statAllocationMethod === "random"
                      ? "Your stats have been rolled randomly"
                      : config.statAllocationMethod === "standard_array"
                      ? "Assign the standard array values"
                      : "Your starting stats"}
                  </p>
                </div>

                {/* Points remaining for point buy */}
                {config.statAllocationMethod === "point_buy" && (
                  <div className="text-center p-3 bg-neutral-800 rounded-lg">
                    <span className="text-neutral-400">Points Remaining: </span>
                    <span className={`font-bold text-lg ${remainingPoints < 0 ? "text-red-400" : "text-amber-400"}`}>
                      {remainingPoints}
                    </span>
                  </div>
                )}

                {/* Random reroll button */}
                {config.statAllocationMethod === "random" && (
                  <button
                    onClick={initializeStats}
                    className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Dices className="w-4 h-4" />
                    Reroll Stats
                  </button>
                )}

                <div className="space-y-3">
                  {statConfig.map((stat) => {
                    const baseValue = stats[stat.key] || 10;
                    const bonus = (selectedRace?.bonusStats?.[stat.key] || 0) + (selectedClass?.bonusStats?.[stat.key] || 0);
                    const finalValue = baseValue + bonus;
                    const modifier = Math.floor((finalValue - 10) / 2);

                    return (
                      <div
                        key={stat.key}
                        className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{stat.label}</span>
                            {stat.description && (
                              <p className="text-xs text-neutral-500">{stat.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            {config.statAllocationMethod === "point_buy" && (
                              <button
                                onClick={() => adjustStat(stat.key, -1)}
                                disabled={baseValue <= 8}
                                className="w-8 h-8 rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                            )}

                            <div className="text-center min-w-[60px]">
                              <span className="text-xl font-bold">{finalValue}</span>
                              {bonus !== 0 && (
                                <span className="text-xs text-green-400 ml-1">
                                  ({baseValue}+{bonus})
                                </span>
                              )}
                              <div className="text-xs text-neutral-500">
                                {modifier >= 0 ? "+" : ""}{modifier} mod
                              </div>
                            </div>

                            {config.statAllocationMethod === "point_buy" && (
                              <button
                                onClick={() => adjustStat(stat.key, 1)}
                                disabled={baseValue >= 15}
                                className="w-8 h-8 rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 5: Confirmation */}
            {currentStep === "confirm" && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <Sparkles className="w-12 h-12 mx-auto text-amber-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Ready to Begin?</h3>
                  <p className="text-neutral-400 text-sm">
                    Review your character before entering the realm
                  </p>
                </div>

                {/* Character Summary */}
                <div className="p-6 bg-neutral-800/50 rounded-xl border border-neutral-700 space-y-4">
                  <div className="text-center">
                    <h4 className="text-2xl font-bold text-amber-400">{characterName}</h4>
                    <p className="text-neutral-400">
                      {selectedRace?.name} {selectedClass?.name}
                    </p>
                  </div>

                  <div className="h-px bg-neutral-700" />

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {statConfig.map((stat) => {
                      const value = finalStats[stat.key] || 10;
                      const modifier = Math.floor((value - 10) / 2);

                      return (
                        <div
                          key={stat.key}
                          className="p-3 bg-neutral-900 rounded-lg text-center"
                        >
                          <div className="text-xs text-neutral-500 uppercase">
                            {stat.label}
                          </div>
                          <div className="text-xl font-bold">{value}</div>
                          <div className="text-xs text-neutral-400">
                            {modifier >= 0 ? "+" : ""}{modifier}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="p-6 border-t border-neutral-800 flex justify-between gap-4">
          <button
            onClick={goBack}
            disabled={currentStepIndex === 0}
            className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          {currentStep === "confirm" ? (
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {isCreating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Begin Adventure
                </>
              )}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-700 disabled:cursor-not-allowed rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              Continue
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
