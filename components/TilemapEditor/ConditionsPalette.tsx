'use client';

import React, { useState } from 'react';
import { Id } from '@/convex/_generated/dataModel';
import { Plus, Trash2, ChevronDown, ChevronRight, Zap, Ban, Gift, MessageSquare, Flag, MapPin } from 'lucide-react';

// Types for conditions
interface Condition {
  _id: Id<"conditions">;
  name: string;
  description?: string;
  trigger: string;
  triggerContext?: string;
  rules: string;
  thenActions: string;
  elseActions?: string;
  priority: number;
  isActive: boolean;
}

// Trigger types relevant to map editing
const MAP_TRIGGERS = [
  { value: 'on_enter_location', label: 'When Player Enters', icon: MapPin },
  { value: 'on_exit_location', label: 'When Player Exits', icon: MapPin },
  { value: 'on_npc_interact', label: 'When NPC Interacted', icon: MessageSquare },
  { value: 'on_item_pickup', label: 'When Item Picked Up', icon: Gift },
] as const;

// Rule templates for easy condition building
const RULE_TEMPLATES = [
  { label: 'Player has item', value: 'has_item', example: { has_item: 'Key' } },
  { label: 'Quest completed', value: 'quest_completed', example: { quest_completed: 'Bell Test' } },
  { label: 'Player level ≥', value: 'gte_level', example: { gte: ['player.level', 10] } },
  { label: 'Flag is set', value: 'flag', example: { flag: ['some_flag', true] } },
  { label: 'NPC is alive', value: 'npc_alive', example: { npc_alive: 'npc_id' } },
  { label: 'Has ability', value: 'has_ability', example: { has_ability: 'Fireball' } },
  { label: 'Reputation ≥', value: 'faction_reputation', example: { faction_reputation: ['Hidden Leaf', 50] } },
] as const;

// Action templates
const ACTION_TEMPLATES = [
  { label: 'Block entry', value: 'block_entry', icon: Ban, fields: ['message'] },
  { label: 'Show message', value: 'show_message', icon: MessageSquare, fields: ['message'] },
  { label: 'Give item', value: 'give_item', icon: Gift, fields: ['itemName', 'quantity'] },
  { label: 'Remove item', value: 'remove_item', icon: Gift, fields: ['itemName', 'quantity'] },
  { label: 'Set flag', value: 'set_flag', icon: Flag, fields: ['key', 'value'] },
  { label: 'Grant ability', value: 'grant_ability', icon: Zap, fields: ['abilityName'] },
  { label: 'Modify gold', value: 'modify_gold', icon: Gift, fields: ['amount'] },
  { label: 'Add XP', value: 'add_xp', icon: Zap, fields: ['amount'] },
  { label: 'Activate quest', value: 'activate_quest', icon: Flag, fields: ['questId'] },
  { label: 'Teleport', value: 'teleport', icon: MapPin, fields: ['locationId'] },
  { label: 'Spawn NPC', value: 'spawn_npc', icon: Zap, fields: ['npcId'] },
] as const;

export interface ConditionsPaletteProps {
  locationId: Id<"locations">;
  conditions: Condition[];
  items: Array<{ _id: Id<"items">; name: string }>;
  quests: Array<{ _id: Id<"quests">; title: string }>;
  npcs: Array<{ _id: Id<"npcs">; name: string }>;
  abilities: Array<{ _id: Id<"spells">; name: string }>;
  locations: Array<{ _id: Id<"locations">; name: string }>;
  factions: Array<{ _id: Id<"factions">; name: string }>;
  onCreate: (condition: {
    name: string;
    description?: string;
    trigger: string;
    triggerContext?: string;
    rules: string;
    thenActions: string;
    elseActions?: string;
    priority?: number;
  }) => Promise<void>;
  onUpdate: (id: Id<"conditions">, updates: Partial<Condition>) => Promise<void>;
  onDelete: (id: Id<"conditions">) => Promise<void>;
  onToggle: (id: Id<"conditions">) => Promise<void>;
}

export function ConditionsPalette({
  locationId,
  conditions,
  items,
  quests,
  npcs,
  abilities,
  locations,
  factions,
  onCreate,
  onUpdate: _onUpdate,
  onDelete,
  onToggle,
}: ConditionsPaletteProps) {
  // Note: _onUpdate is available for future inline editing functionality
  void _onUpdate;
  const [isCreating, setIsCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New condition form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTrigger, setNewTrigger] = useState<string>('on_enter_location');
  const [newRuleType, setNewRuleType] = useState<string>('has_item');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [newRuleValue2, setNewRuleValue2] = useState('');
  const [newActionType, setNewActionType] = useState<string>('block_entry');
  const [newActionFields, setNewActionFields] = useState<Record<string, string>>({});
  const [newPriority, setNewPriority] = useState(0);

  // Filter conditions for this location
  const locationConditions = conditions.filter(
    c => c.triggerContext === locationId || !c.triggerContext
  );

  const handleCreate = async () => {
    if (!newName.trim()) return;

    // Build the rule based on selected type
    let rules: Record<string, unknown> = {};
    switch (newRuleType) {
      case 'has_item':
        rules = { has_item: newRuleValue };
        break;
      case 'quest_completed':
        rules = { quest_completed: newRuleValue };
        break;
      case 'gte_level':
        rules = { gte: ['player.level', parseInt(newRuleValue) || 1] };
        break;
      case 'flag':
        rules = { flag: [newRuleValue, newRuleValue2 === 'true'] };
        break;
      case 'npc_alive':
        rules = { npc_alive: newRuleValue };
        break;
      case 'has_ability':
        rules = { has_ability: newRuleValue };
        break;
      case 'faction_reputation':
        rules = { faction_reputation: [newRuleValue, parseInt(newRuleValue2) || 0] };
        break;
    }

    // Build the action
    const action: Record<string, unknown> = { type: newActionType };
    const template = ACTION_TEMPLATES.find(t => t.value === newActionType);
    if (template) {
      for (const field of template.fields) {
        if (newActionFields[field]) {
          if (field === 'quantity' || field === 'amount') {
            action[field] = parseInt(newActionFields[field]) || 1;
          } else {
            action[field] = newActionFields[field];
          }
        }
      }
    }

    await onCreate({
      name: newName,
      description: newDescription || undefined,
      trigger: newTrigger,
      triggerContext: locationId,
      rules: JSON.stringify(rules),
      thenActions: JSON.stringify([action]),
      priority: newPriority,
    });

    // Reset form
    setNewName('');
    setNewDescription('');
    setNewRuleValue('');
    setNewRuleValue2('');
    setNewActionFields({});
    setIsCreating(false);
  };

  const renderRuleInput = () => {
    switch (newRuleType) {
      case 'has_item':
        return (
          <select
            value={newRuleValue}
            onChange={(e) => setNewRuleValue(e.target.value)}
            className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
          >
            <option value="">Select item...</option>
            {items.map(item => (
              <option key={item._id} value={item.name}>{item.name}</option>
            ))}
          </select>
        );
      case 'quest_completed':
        return (
          <select
            value={newRuleValue}
            onChange={(e) => setNewRuleValue(e.target.value)}
            className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
          >
            <option value="">Select quest...</option>
            {quests.map(quest => (
              <option key={quest._id} value={quest.title}>{quest.title}</option>
            ))}
          </select>
        );
      case 'gte_level':
        return (
          <input
            type="number"
            value={newRuleValue}
            onChange={(e) => setNewRuleValue(e.target.value)}
            placeholder="Minimum level"
            className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
            min={1}
          />
        );
      case 'flag':
        return (
          <div className="space-y-1">
            <input
              type="text"
              value={newRuleValue}
              onChange={(e) => setNewRuleValue(e.target.value)}
              placeholder="Flag name"
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
            />
            <select
              value={newRuleValue2}
              onChange={(e) => setNewRuleValue2(e.target.value)}
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
            >
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          </div>
        );
      case 'npc_alive':
        return (
          <select
            value={newRuleValue}
            onChange={(e) => setNewRuleValue(e.target.value)}
            className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
          >
            <option value="">Select NPC...</option>
            {npcs.map(npc => (
              <option key={npc._id} value={npc._id}>{npc.name}</option>
            ))}
          </select>
        );
      case 'has_ability':
        return (
          <select
            value={newRuleValue}
            onChange={(e) => setNewRuleValue(e.target.value)}
            className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
          >
            <option value="">Select ability...</option>
            {abilities.map(ability => (
              <option key={ability._id} value={ability.name}>{ability.name}</option>
            ))}
          </select>
        );
      case 'faction_reputation':
        return (
          <div className="space-y-1">
            <select
              value={newRuleValue}
              onChange={(e) => setNewRuleValue(e.target.value)}
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
            >
              <option value="">Select faction...</option>
              {factions.map(faction => (
                <option key={faction._id} value={faction.name}>{faction.name}</option>
              ))}
            </select>
            <input
              type="number"
              value={newRuleValue2}
              onChange={(e) => setNewRuleValue2(e.target.value)}
              placeholder="Min reputation"
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
            />
          </div>
        );
      default:
        return null;
    }
  };

  const renderActionFields = () => {
    const template = ACTION_TEMPLATES.find(t => t.value === newActionType);
    if (!template) return null;

    return (
      <div className="space-y-1">
        {template.fields.map(field => {
          if (field === 'itemName') {
            return (
              <select
                key={field}
                value={newActionFields[field] || ''}
                onChange={(e) => setNewActionFields(prev => ({ ...prev, [field]: e.target.value }))}
                className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
              >
                <option value="">Select item...</option>
                {items.map(item => (
                  <option key={item._id} value={item.name}>{item.name}</option>
                ))}
              </select>
            );
          }
          if (field === 'questId') {
            return (
              <select
                key={field}
                value={newActionFields[field] || ''}
                onChange={(e) => setNewActionFields(prev => ({ ...prev, [field]: e.target.value }))}
                className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
              >
                <option value="">Select quest...</option>
                {quests.map(quest => (
                  <option key={quest._id} value={quest.title}>{quest.title}</option>
                ))}
              </select>
            );
          }
          if (field === 'npcId') {
            return (
              <select
                key={field}
                value={newActionFields[field] || ''}
                onChange={(e) => setNewActionFields(prev => ({ ...prev, [field]: e.target.value }))}
                className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
              >
                <option value="">Select NPC...</option>
                {npcs.map(npc => (
                  <option key={npc._id} value={npc._id}>{npc.name}</option>
                ))}
              </select>
            );
          }
          if (field === 'abilityName') {
            return (
              <select
                key={field}
                value={newActionFields[field] || ''}
                onChange={(e) => setNewActionFields(prev => ({ ...prev, [field]: e.target.value }))}
                className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
              >
                <option value="">Select ability...</option>
                {abilities.map(ability => (
                  <option key={ability._id} value={ability.name}>{ability.name}</option>
                ))}
              </select>
            );
          }
          if (field === 'locationId') {
            return (
              <select
                key={field}
                value={newActionFields[field] || ''}
                onChange={(e) => setNewActionFields(prev => ({ ...prev, [field]: e.target.value }))}
                className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
              >
                <option value="">Select location...</option>
                {locations.map(loc => (
                  <option key={loc._id} value={loc._id}>{loc.name}</option>
                ))}
              </select>
            );
          }
          if (field === 'quantity' || field === 'amount') {
            return (
              <input
                key={field}
                type="number"
                value={newActionFields[field] || ''}
                onChange={(e) => setNewActionFields(prev => ({ ...prev, [field]: e.target.value }))}
                placeholder={field === 'quantity' ? 'Quantity' : 'Amount'}
                className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
              />
            );
          }
          return (
            <input
              key={field}
              type="text"
              value={newActionFields[field] || ''}
              onChange={(e) => setNewActionFields(prev => ({ ...prev, [field]: e.target.value }))}
              placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          Create if/then rules for this location
        </p>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="p-1 rounded hover:bg-zinc-700"
          title="Add condition"
        >
          <Plus className="w-4 h-4 text-amber-500" />
        </button>
      </div>

      {/* Create new condition form */}
      {isCreating && (
        <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 space-y-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Condition name"
            className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
          />

          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
          />

          {/* Trigger */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Trigger</label>
            <select
              value={newTrigger}
              onChange={(e) => setNewTrigger(e.target.value)}
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
            >
              {MAP_TRIGGERS.map(trigger => (
                <option key={trigger.value} value={trigger.value}>{trigger.label}</option>
              ))}
            </select>
          </div>

          {/* IF (Rule) */}
          <div className="p-2 bg-blue-900/20 rounded border border-blue-800/50">
            <label className="text-xs text-blue-400 block mb-1">IF</label>
            <select
              value={newRuleType}
              onChange={(e) => {
                setNewRuleType(e.target.value);
                setNewRuleValue('');
                setNewRuleValue2('');
              }}
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white mb-1"
            >
              {RULE_TEMPLATES.map(rule => (
                <option key={rule.value} value={rule.value}>{rule.label}</option>
              ))}
            </select>
            {renderRuleInput()}
          </div>

          {/* THEN (Action) */}
          <div className="p-2 bg-green-900/20 rounded border border-green-800/50">
            <label className="text-xs text-green-400 block mb-1">THEN</label>
            <select
              value={newActionType}
              onChange={(e) => {
                setNewActionType(e.target.value);
                setNewActionFields({});
              }}
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white mb-1"
            >
              {ACTION_TEMPLATES.map(action => (
                <option key={action.value} value={action.value}>{action.label}</option>
              ))}
            </select>
            {renderActionFields()}
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Priority (higher = runs first)</label>
            <input
              type="number"
              value={newPriority}
              onChange={(e) => setNewPriority(parseInt(e.target.value) || 0)}
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="flex-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded text-sm font-medium text-white"
            >
              Create
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-sm text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Existing conditions list */}
      <div className="space-y-2">
        {locationConditions.length === 0 && !isCreating && (
          <p className="text-sm text-zinc-500 italic text-center py-4">
            No conditions for this location
          </p>
        )}

        {locationConditions.map((condition) => (
          <div
            key={condition._id}
            className={`p-2 rounded border ${
              condition.isActive
                ? 'bg-zinc-800/50 border-zinc-700'
                : 'bg-zinc-900/50 border-zinc-800 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExpandedId(expandedId === condition._id ? null : condition._id)}
                className="p-0.5"
              >
                {expandedId === condition._id ? (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">
                    {condition.name}
                  </span>
                  <span className={`px-1.5 py-0.5 text-xs rounded ${
                    condition.isActive
                      ? 'bg-green-900/50 text-green-400'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {condition.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {condition.description && (
                  <p className="text-xs text-zinc-500 truncate">{condition.description}</p>
                )}
              </div>

              <button
                onClick={() => onToggle(condition._id)}
                className="p-1 rounded hover:bg-zinc-700"
                title={condition.isActive ? 'Disable' : 'Enable'}
              >
                <Zap className={`w-3.5 h-3.5 ${condition.isActive ? 'text-amber-500' : 'text-zinc-600'}`} />
              </button>

              <button
                onClick={() => onDelete(condition._id)}
                className="p-1 rounded hover:bg-red-900/50"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>

            {/* Expanded details */}
            {expandedId === condition._id && (
              <div className="mt-2 pt-2 border-t border-zinc-700 space-y-2 text-xs">
                <div>
                  <span className="text-zinc-500">Trigger: </span>
                  <span className="text-zinc-300">{condition.trigger}</span>
                </div>
                <div>
                  <span className="text-blue-400">IF: </span>
                  <code className="text-zinc-300 bg-zinc-900 px-1 rounded">
                    {condition.rules}
                  </code>
                </div>
                <div>
                  <span className="text-green-400">THEN: </span>
                  <code className="text-zinc-300 bg-zinc-900 px-1 rounded">
                    {condition.thenActions}
                  </code>
                </div>
                {condition.elseActions && (
                  <div>
                    <span className="text-red-400">ELSE: </span>
                    <code className="text-zinc-300 bg-zinc-900 px-1 rounded">
                      {condition.elseActions}
                    </code>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ConditionsPalette;
