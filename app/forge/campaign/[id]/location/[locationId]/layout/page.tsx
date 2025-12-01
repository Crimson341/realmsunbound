'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { TilemapEditor, TilemapSaveData, ConditionOption } from '@/components/TilemapEditor';
import { Loader2 } from 'lucide-react';

export default function LocationLayoutEditor() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as Id<"campaigns">;
  const locationId = params.locationId as Id<"locations">;

  // Fetch data
  const campaignData = useQuery(api.forge.getCampaignDetails, { campaignId });
  const locationTemplate = useQuery(api.mapGenerator.getLocationTemplate, { locationId });
  const conditions = useQuery(api.conditions.getConditions, { campaignId });

  // Mutations
  const saveTemplate = useMutation(api.mapGenerator.saveLocationTemplate);
  const createConditionMutation = useMutation(api.conditions.createCondition);
  const updateConditionMutation = useMutation(api.conditions.updateCondition);
  const deleteConditionMutation = useMutation(api.conditions.deleteCondition);
  const toggleConditionMutation = useMutation(api.conditions.toggleCondition);

  const [, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Find the specific location
  const location = campaignData?.locations?.find(l => l._id === locationId);
  const allNpcs = campaignData?.npcs || [];
  const allMonsters = campaignData?.monsters || [];

  // Get shops for this location
  const campaignShops = useQuery(api.shops.getCampaignShops, { campaignId });
  const locationShops = campaignShops?.filter(s => s.locationId === locationId) || [];

  // Get neighbor locations for transitions
  const neighborLocations = location?.neighbors?.map(nId =>
    campaignData?.locations?.find(l => l._id === nId)
  ).filter(Boolean) || [];

  // Get quests for this campaign
  const campaignQuests = campaignData?.quests || [];

  // Parse existing template data if it exists
  const existingTemplate = locationTemplate ? {
    width: locationTemplate.width,
    height: locationTemplate.height,
    tiles: JSON.parse(locationTemplate.tiles) as number[][],
    entities: JSON.parse(locationTemplate.placedEntities),
    objects: JSON.parse(locationTemplate.placedObjects),
    transitions: JSON.parse(locationTemplate.transitions),
    spawnX: locationTemplate.playerSpawnX,
    spawnY: locationTemplate.playerSpawnY,
    alternateSpawns: locationTemplate.alternateSpawns
      ? JSON.parse(locationTemplate.alternateSpawns)
      : [],
    lighting: locationTemplate.lighting || 'dim',
    ambience: locationTemplate.ambience || 'dungeon',
  } : null;

  const handleSave = async (data: TilemapSaveData) => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      await saveTemplate({
        locationId,
        campaignId,
        width: data.width,
        height: data.height,
        tiles: JSON.stringify(data.tiles),
        collisionMask: JSON.stringify(data.collisionMask),
        playerSpawnX: data.playerSpawnX,
        playerSpawnY: data.playerSpawnY,
        alternateSpawns: JSON.stringify(data.alternateSpawns),
        placedEntities: JSON.stringify(data.placedEntities),
        placedObjects: JSON.stringify(data.placedObjects),
        transitions: JSON.stringify(data.transitions),
        lighting: data.lighting,
        ambience: data.ambience,
      });

      setSaveMessage('Layout saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save template:', error);
      setSaveMessage('Failed to save layout. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    router.push(`/forge/campaign/${campaignId}`);
  };

  // Condition handlers
  const handleCreateCondition = async (condition: {
    name: string;
    description?: string;
    trigger: string;
    triggerContext?: string;
    rules: string;
    thenActions: string;
    elseActions?: string;
    priority?: number;
  }) => {
    await createConditionMutation({
      campaignId,
      name: condition.name,
      description: condition.description,
      trigger: condition.trigger,
      triggerContext: condition.triggerContext,
      rules: condition.rules,
      thenActions: condition.thenActions,
      elseActions: condition.elseActions,
      priority: condition.priority,
    });
  };

  const handleUpdateCondition = async (
    conditionId: Id<"conditions">,
    updates: Partial<ConditionOption>
  ) => {
    await updateConditionMutation({
      conditionId,
      name: updates.name,
      description: updates.description,
      trigger: updates.trigger,
      triggerContext: updates.triggerContext,
      rules: updates.rules,
      thenActions: updates.thenActions,
      elseActions: updates.elseActions,
      priority: updates.priority,
      isActive: updates.isActive,
    });
  };

  const handleDeleteCondition = async (conditionId: Id<"conditions">) => {
    await deleteConditionMutation({ conditionId });
  };

  const handleToggleCondition = async (conditionId: Id<"conditions">) => {
    await toggleConditionMutation({ conditionId });
  };

  // Loading state - wait for all queries including the template
  // locationTemplate is undefined while loading, null if no template exists, or the actual data
  if (!campaignData || !location || locationTemplate === undefined) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-zinc-400">Loading location data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Save message toast */}
      {saveMessage && (
        <div className={`
          fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg
          ${saveMessage.includes('success')
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
          }
        `}>
          {saveMessage}
        </div>
      )}

      <TilemapEditor
        locationId={locationId}
        campaignId={campaignId}
        locationName={location.name}
        locationType={location.type}
        initialWidth={existingTemplate?.width}
        initialHeight={existingTemplate?.height}
        initialTiles={existingTemplate?.tiles}
        initialEntities={existingTemplate?.entities}
        initialObjects={existingTemplate?.objects}
        initialTransitions={existingTemplate?.transitions}
        initialSpawnX={existingTemplate?.spawnX}
        initialSpawnY={existingTemplate?.spawnY}
        initialAlternateSpawns={existingTemplate?.alternateSpawns}
        initialLighting={existingTemplate?.lighting}
        initialAmbience={existingTemplate?.ambience}
        npcs={allNpcs.map(npc => ({
          _id: npc._id,
          name: npc.name,
          role: npc.role,
          isHostile: npc.isHostile,
          health: npc.health,
          maxHealth: npc.maxHealth,
        }))}
        monsters={allMonsters.map(m => ({
          _id: m._id,
          name: m.name,
          health: m.health,
          damage: m.damage,
        }))}
        shops={locationShops.map(s => ({
          _id: s._id,
          name: s.name,
          type: s.type,
        }))}
        quests={campaignQuests.map(q => ({
          _id: q._id,
          title: q.title,
          status: q.status,
        }))}
        neighborLocations={neighborLocations.map(l => ({
          _id: l!._id,
          name: l!.name,
        }))}
        items={(campaignData?.items || []).map(i => ({
          _id: i._id,
          name: i.name,
        }))}
        abilities={(campaignData?.spells || []).map(s => ({
          _id: s._id,
          name: s.name,
        }))}
        factions={(campaignData?.factions || []).map(f => ({
          _id: f._id,
          name: f.name,
        }))}
        conditions={(conditions || []).map(c => ({
          _id: c._id,
          name: c.name,
          description: c.description,
          trigger: c.trigger,
          triggerContext: c.triggerContext,
          rules: c.rules,
          thenActions: c.thenActions,
          elseActions: c.elseActions,
          priority: c.priority,
          isActive: c.isActive,
        }))}
        onSave={handleSave}
        onClose={handleClose}
        onCreateCondition={handleCreateCondition}
        onUpdateCondition={handleUpdateCondition}
        onDeleteCondition={handleDeleteCondition}
        onToggleCondition={handleToggleCondition}
      />
    </div>
  );
}
