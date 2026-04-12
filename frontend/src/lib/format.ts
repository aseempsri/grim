export function formatIndianPrice(price: number): string {
  if (price >= 10000000) {
    const cr = price / 10000000;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
  }
  if (price >= 100000) {
    const lakh = price / 100000;
    return `₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(2)} Lakhs`;
  }
  return `₹${price.toLocaleString('en-IN')}`;
}

export function formatArea(area: number | null | undefined, unit = 'sq.ft'): string {
  if (!area) return '-';
  return `${area.toLocaleString('en-IN')} ${unit}`;
}

export const PROPERTY_TYPES = [
  { value: 'flat', label: 'Flat / Apartment' },
  { value: 'plot', label: 'Plot / Land' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'villa', label: 'Villa / Independent House' },
] as const;

export const LISTING_TYPES = [
  { value: 'sale', label: 'For Sale' },
  { value: 'rent', label: 'For Rent' },
] as const;

export const FACING_OPTIONS = [
  'north', 'south', 'east', 'west',
  'north-east', 'north-west', 'south-east', 'south-west',
] as const;

export const FURNISHING_OPTIONS = [
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'semi-furnished', label: 'Semi-Furnished' },
  { value: 'fully-furnished', label: 'Fully Furnished' },
] as const;

export const AMENITIES_LIST = [
  'Parking', 'Lift', 'Security', 'Garden', 'Swimming Pool',
  'Gym', 'Power Backup', 'Water Supply', 'Gas Pipeline',
  'Club House', 'Children Play Area', 'Intercom', 'Rain Water Harvesting',
  'Vastu Compliant', 'Fire Safety', 'CCTV', 'Gated Community',
  'Servant Room', 'Modular Kitchen', 'Balcony',
] as const;

export const BHK_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

export function getPropertyTypeLabel(type: string): string {
  return PROPERTY_TYPES.find(t => t.value === type)?.label || type;
}

export function getPropertyTypeIcon(type: string): string {
  switch (type) {
    case 'flat': return '🏢';
    case 'plot': return '📐';
    case 'commercial': return '🏪';
    case 'villa': return '🏡';
    default: return '🏠';
  }
}

/** Splits subtitle on middle-dot (·) or bullet (•) so each segment can render on its own line. */
export function splitSubtitleLines(subtitle: string | undefined | null): string[] {
  if (!subtitle?.trim()) return [];
  return subtitle
    .split(/\s*[·•]\s*/u)
    .map((s) => s.trim())
    .filter(Boolean);
}
