"use client";

import { MapCanvas, MapLocationData } from "./MapCanvas";
import { Id } from "@/convex/_generated/dataModel";

interface MapEditorProps {
  campaignId: Id<"campaigns">;
  locations: MapLocationData[];
}

export function MapEditor({ locations }: MapEditorProps) {
  return (
    <div className="h-full">
      <MapCanvas
        locations={locations}
        isEditor={true}
      />
    </div>
  );
}
