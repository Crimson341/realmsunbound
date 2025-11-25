"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tent,
  Users,
  Coins,
  Package,
  Apple,
  Hammer,
  ArrowLeft,
  Plus,
  X,
  Crown,
  Shield,
  Sword,
  User,
  ChevronRight,
  MapPin,
  AlertTriangle,
  Sparkles,
  Loader2,
} from "lucide-react";

// Follower role icons
function getRoleIcon(role: string) {
  switch (role.toLowerCase()) {
    case "guard":
      return <Shield className="w-4 h-4" />;
    case "companion":
      return <Sword className="w-4 h-4" />;
    case "merchant":
      return <Coins className="w-4 h-4" />;
    case "worker":
      return <Hammer className="w-4 h-4" />;
    default:
      return <User className="w-4 h-4" />;
  }
}

// Role colors
const ROLE_COLORS: Record<string, string> = {
  companion: "#f59e0b",
  guard: "#3b82f6",
  merchant: "#22c55e",
  worker: "#8b5cf6",
  follower: "#6b7280",
};

export default function CampPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.campaignId as Id<"campaigns">;
  
  // Get authenticated user from WorkOS AuthKit
  const { user, loading: userLoading } = useAuth();
  const playerId = user?.id ? `workos|${user.id}` : "";

  const campaignDetails = useQuery(api.forge.getCampaignDetails, { campaignId });

  const camp = useQuery(
    api.camp.getCampDetails,
    playerId ? { campaignId, playerId } : "skip"
  );

  const createCamp = useMutation(api.camp.createCamp);
  const dismissFollower = useMutation(api.camp.dismissFollower);
  const changeFollowerRole = useMutation(api.camp.changeFollowerRole);
  const updateFollowerPosition = useMutation(api.camp.updateFollowerPosition);

  const [selectedFollower, setSelectedFollower] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [campName, setCampName] = useState("");
  const [draggedFollower, setDraggedFollower] = useState<string | null>(null);

  // Calculate grid position to pixel coordinates
  const gridToPixel = (gridX: number, gridY: number) => ({
    x: gridX * 80 + 40, // 80px per grid cell, 40px offset for center
    y: gridY * 80 + 40,
  });

  const handleDragEnd = useCallback(
    async (npcId: string, newX: number, newY: number) => {
      // Convert pixel to grid coordinates
      const gridX = Math.floor(newX / 80);
      const gridY = Math.floor(newY / 80);

      // Clamp to valid range (0-4)
      const clampedX = Math.max(0, Math.min(4, gridX));
      const clampedY = Math.max(0, Math.min(4, gridY));

      await updateFollowerPosition({
        campaignId,
        playerId,
        npcId: npcId as Id<"npcs">,
        positionX: clampedX,
        positionY: clampedY,
      });

      setDraggedFollower(null);
    },
    [campaignId, playerId, updateFollowerPosition]
  );

  const handleCreateCamp = async () => {
    if (!campName.trim() || !campaignDetails?.locations?.[0] || !playerId) {
      console.error("Cannot create camp: missing data", { campName, hasLocations: !!campaignDetails?.locations?.[0], playerId });
      return;
    }

    try {
      const result = await createCamp({
        campaignId,
        playerId,
        name: campName,
        locationId: campaignDetails.locations[0]._id,
        description: "A humble camp in the wilderness.",
      });
      console.log("Camp created:", result);
    } catch (error) {
      console.error("Failed to create camp:", error);
    }

    setShowCreateModal(false);
    setCampName("");
  };

  const handleDismissFollower = async (npcId: string) => {
    await dismissFollower({
      campaignId,
      playerId,
      npcId: npcId as Id<"npcs">,
    });
    setSelectedFollower(null);
  };

  const handleChangeRole = async (npcId: string, newRole: string) => {
    await changeFollowerRole({
      campaignId,
      playerId,
      npcId: npcId as Id<"npcs">,
      newRole,
    });
  };

  // Loading state
  if (!campaignDetails || userLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <Tent className="w-12 h-12 mx-auto mb-4 text-amber-500 animate-pulse" />
          <p className="text-neutral-400">Loading camp...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user || !playerId) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
          <p className="text-neutral-400">Please sign in to access camps</p>
          <button
            onClick={() => router.push("/sign-in")}
            className="mt-4 px-6 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // No camp yet - show creation prompt
  if (!camp) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Tent className="w-12 h-12 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Establish Your Camp</h1>
          <p className="text-neutral-400 mb-8">
            Build a base of operations, recruit followers, and manage your resources.
            Your camp will serve as a sanctuary in the wilderness.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-8 py-3 bg-amber-600 hover:bg-amber-500 rounded-lg font-semibold flex items-center gap-2 mx-auto transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Camp
          </button>
          <button
            onClick={() => router.back()}
            className="mt-4 text-neutral-500 hover:text-neutral-300 flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Adventure
          </button>
        </motion.div>

        {/* Create Camp Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-neutral-900 border border-amber-500/30 rounded-xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Tent className="w-6 h-6 text-amber-500" />
                  Name Your Camp
                </h2>
                <input
                  type="text"
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                  placeholder="e.g. Dragon's Rest"
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg mb-4 focus:outline-none focus:border-amber-500"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCamp}
                    disabled={!campName.trim()}
                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                  >
                    Create
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Get selected follower details
  const selectedFollowerData = camp.followers.find(
    (f) => f.npcId === selectedFollower
  );

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-neutral-900/80 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/play/${campaignId}`)}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Tent className="w-5 h-5 text-amber-500" />
                {camp.name}
              </h1>
              <p className="text-sm text-neutral-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {camp.location?.name || "Unknown Location"}
              </p>
            </div>
          </div>

          {/* Resources */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-amber-400">
              <Coins className="w-4 h-4" />
              <span className="font-mono">{camp.resources.gold}</span>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <Apple className="w-4 h-4" />
              <span className="font-mono">{camp.resources.food}</span>
            </div>
            <div className="flex items-center gap-2 text-purple-400">
              <Package className="w-4 h-4" />
              <span className="font-mono">{camp.resources.materials}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Camp Map */}
          <div className="lg:col-span-2">
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                Camp Layout
                <span className="text-sm text-neutral-500 font-normal ml-2">
                  {camp.followerCount}/{camp.maxFollowers} followers
                </span>
              </h2>

              {/* Interactive Camp Map */}
              <div
                className="relative w-full aspect-square max-w-[400px] mx-auto rounded-xl overflow-hidden"
                style={{
                  background:
                    "radial-gradient(circle at center, #1f2937 0%, #111827 50%, #030712 100%)",
                }}
              >
                {/* Grid overlay */}
                <div className="absolute inset-0 grid grid-cols-5 grid-rows-5 opacity-20">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div key={i} className="border border-neutral-700" />
                  ))}
                </div>

                {/* Campfire in center */}
                <motion.div
                  className="absolute w-16 h-16 flex items-center justify-center"
                  style={{
                    left: gridToPixel(2, 2).x - 32,
                    top: gridToPixel(2, 2).y - 32,
                  }}
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-orange-500/30 rounded-full blur-xl" />
                    <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-orange-400" />
                  </div>
                </motion.div>

                {/* Followers */}
                {camp.followers.map((follower) => {
                  const pos = gridToPixel(
                    follower.positionX ?? 0,
                    follower.positionY ?? 0
                  );
                  const isSelected = selectedFollower === follower.npcId;
                  const roleColor = ROLE_COLORS[follower.role] || ROLE_COLORS.follower;

                  return (
                    <motion.div
                      key={follower.npcId}
                      className={`
                        absolute w-14 h-14 cursor-pointer
                        flex flex-col items-center justify-center
                        ${isSelected ? "z-20" : "z-10"}
                      `}
                      style={{
                        left: pos.x - 28,
                        top: pos.y - 28,
                      }}
                      drag
                      dragMomentum={false}
                      onDragStart={() => setDraggedFollower(follower.npcId)}
                      onDragEnd={(_, info) => {
                        const newX = pos.x + info.offset.x;
                        const newY = pos.y + info.offset.y;
                        handleDragEnd(follower.npcId, newX, newY);
                      }}
                      onClick={() =>
                        setSelectedFollower(
                          isSelected ? null : follower.npcId
                        )
                      }
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      animate={{
                        scale: draggedFollower === follower.npcId ? 1.2 : 1,
                      }}
                    >
                      {/* Avatar circle */}
                      <div
                        className={`
                          w-10 h-10 rounded-full flex items-center justify-center
                          border-2 transition-all
                          ${isSelected ? "ring-2 ring-offset-2 ring-offset-neutral-900" : ""}
                        `}
                        style={{
                          backgroundColor: `${roleColor}20`,
                          borderColor: roleColor,
                          boxShadow: isSelected
                            ? `0 0 20px ${roleColor}50`
                            : undefined,
                        }}
                      >
                        {getRoleIcon(follower.role)}
                      </div>
                      {/* Name label */}
                      <span className="text-[10px] mt-1 px-1 bg-black/80 rounded text-center truncate max-w-full">
                        {follower.npc?.name?.split(" ")[0] || "???"}
                      </span>
                    </motion.div>
                  );
                })}

                {/* Empty camp message */}
                {camp.followers.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-neutral-500">
                    <div className="text-center">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No followers yet</p>
                      <p className="text-xs">Recruit NPCs to join your camp</p>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-neutral-500 text-center mt-4">
                Drag followers to reposition them • Click to view details
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Follower Details */}
            <AnimatePresence mode="wait">
              {selectedFollowerData ? (
                <motion.div
                  key="follower-details"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center border-2"
                        style={{
                          backgroundColor: `${ROLE_COLORS[selectedFollowerData.role]}20`,
                          borderColor: ROLE_COLORS[selectedFollowerData.role],
                        }}
                      >
                        {getRoleIcon(selectedFollowerData.role)}
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {selectedFollowerData.npc?.name}
                        </h3>
                        <p className="text-sm text-neutral-400 capitalize">
                          {selectedFollowerData.role}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedFollower(null)}
                      className="p-1 hover:bg-neutral-800 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {selectedFollowerData.npc?.description && (
                    <p className="text-sm text-neutral-300 mb-4 italic">
                      &quot;{selectedFollowerData.npc.description}&quot;
                    </p>
                  )}

                  {/* Loyalty bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-neutral-500">Loyalty</span>
                      <span
                        style={{
                          color:
                            (selectedFollowerData.npc?.loyalty || 50) > 70
                              ? "#22c55e"
                              : (selectedFollowerData.npc?.loyalty || 50) > 30
                              ? "#f59e0b"
                              : "#ef4444",
                        }}
                      >
                        {selectedFollowerData.npc?.loyalty || 50}%
                      </span>
                    </div>
                    <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${selectedFollowerData.npc?.loyalty || 50}%`,
                        }}
                        style={{
                          backgroundColor:
                            (selectedFollowerData.npc?.loyalty || 50) > 70
                              ? "#22c55e"
                              : (selectedFollowerData.npc?.loyalty || 50) > 30
                              ? "#f59e0b"
                              : "#ef4444",
                        }}
                      />
                    </div>
                  </div>

                  {/* Role selection */}
                  <div className="mb-4">
                    <label className="text-xs text-neutral-500 mb-2 block">
                      Assign Role
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {["companion", "guard", "worker", "merchant"].map(
                        (role) => (
                          <button
                            key={role}
                            onClick={() =>
                              handleChangeRole(selectedFollowerData.npcId, role)
                            }
                            className={`
                              py-2 px-3 rounded-lg text-sm flex items-center gap-2
                              transition-colors capitalize
                              ${
                                selectedFollowerData.role === role
                                  ? "bg-neutral-700 border border-neutral-600"
                                  : "bg-neutral-800/50 hover:bg-neutral-800"
                              }
                            `}
                          >
                            {getRoleIcon(role)}
                            {role}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() =>
                      handleDismissFollower(selectedFollowerData.npcId)
                    }
                    className="w-full py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg text-sm transition-colors"
                  >
                    Dismiss Follower
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="follower-list"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4"
                >
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-500" />
                    Followers
                  </h3>

                  {camp.followers.length === 0 ? (
                    <div className="text-center py-4 text-neutral-500">
                      <AlertTriangle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No followers recruited</p>
                      <p className="text-xs mt-1">
                        Find recruitable NPCs in the world
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {camp.followers.map((follower) => (
                        <button
                          key={follower.npcId}
                          onClick={() => setSelectedFollower(follower.npcId)}
                          className="w-full p-3 bg-neutral-800/50 hover:bg-neutral-800 rounded-lg flex items-center gap-3 transition-colors"
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: `${ROLE_COLORS[follower.role]}20`,
                              color: ROLE_COLORS[follower.role],
                            }}
                          >
                            {getRoleIcon(follower.role)}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium text-sm">
                              {follower.npc?.name}
                            </div>
                            <div className="text-xs text-neutral-400 capitalize">
                              {follower.role}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-neutral-500" />
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Camp Stats */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                Camp Status
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-400">Defense</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${
                            camp.followers.filter((f) => f.role === "guard")
                              .length * 25
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-neutral-500">
                      {camp.followers.filter((f) => f.role === "guard").length}/4
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-400">Production</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500"
                        style={{
                          width: `${
                            camp.followers.filter((f) => f.role === "worker")
                              .length * 25
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-neutral-500">
                      {camp.followers.filter((f) => f.role === "worker").length}/4
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-400">Trade</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${
                            camp.followers.filter((f) => f.role === "merchant")
                              .length * 50
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-neutral-500">
                      {camp.followers.filter((f) => f.role === "merchant").length}
                      /2
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => router.push(`/play/${campaignId}`)}
                  className="w-full py-2 px-4 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg text-sm flex items-center gap-2 justify-center transition-colors"
                >
                  <Sword className="w-4 h-4" />
                  Return to Adventure
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

