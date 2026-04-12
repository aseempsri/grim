/** Domain types aligned with the Express API / SQLite backend */

export type Property = {
  id: string;
  title: string;
  property_type: string;
  listing_type: string;
  price: number;
  price_unit: string;
  city: string;
  locality: string;
  address: string | null;
  bhk: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor_number: number | null;
  total_floors: number | null;
  carpet_area: number | null;
  built_up_area: number | null;
  furnishing: string | null;
  plot_area: number | null;
  plot_dimensions: string | null;
  boundary_wall: boolean | null;
  land_type: string | null;
  commercial_type: string | null;
  parking_spots: number | null;
  facing: string | null;
  possession_status: string | null;
  property_age: string | null;
  amenities: string[] | null;
  rera_number: string | null;
  description: string | null;
  status: string;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type PropertyInsert = Omit<Property, "id" | "created_at" | "updated_at"> & {
  id?: string;
};

export type PropertyUpdate = Partial<Omit<Property, "id" | "created_at" | "updated_at">>;

export type PropertyImage = {
  id: string;
  property_id: string;
  image_url: string;
  storage_path: string;
  display_order: number;
  is_cover: boolean;
  created_at: string;
};

export type AgentProfile = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  tagline: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
};
