import type { FleetMetadata } from '../features/fleet/fleetMetadataSchema.ts';
export function busMetadata(bus: {
  busType: FleetMetadata | null;
  amenityLinks: { amenity: FleetMetadata }[];
}) {
  return {
    busType: bus.busType,
    amenities: bus.amenityLinks
      .map((link) => link.amenity)
      .sort((a, b) => a.code.localeCompare(b.code) || a.id.localeCompare(b.id)),
  };
}
