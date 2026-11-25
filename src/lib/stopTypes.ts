import {
  Armchair,
  BedDouble,
  Camera,
  Car,
  Coffee,
  Fuel,
  Landmark,
  MapPin,
  ShoppingBag,
  Sparkles,
  Trees,
  UtensilsCrossed,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import type { StopType } from '../../shared/trip';

interface StopMeta {
  label: string;
  icon: LucideIcon;
  color: string;
  soft: string;
}

export const STOP_META: Record<StopType, StopMeta> = {
  drive: { label: 'Drive', icon: Car, color: 'var(--sky)', soft: 'var(--sky-soft)' },
  food: { label: 'Food', icon: UtensilsCrossed, color: 'var(--sunset)', soft: 'var(--sunset-soft)' },
  coffee: { label: 'Coffee', icon: Coffee, color: '#b7791f', soft: 'var(--butter-soft)' },
  sight: { label: 'Sight', icon: Landmark, color: 'var(--plum)', soft: 'var(--plum-soft)' },
  activity: { label: 'Activity', icon: Sparkles, color: 'var(--plum)', soft: 'var(--plum-soft)' },
  nature: { label: 'Nature', icon: Trees, color: 'var(--pine)', soft: 'var(--pine-soft)' },
  beach: { label: 'Beach', icon: Waves, color: 'var(--sky)', soft: 'var(--sky-soft)' },
  shopping: { label: 'Shopping', icon: ShoppingBag, color: 'var(--sunset)', soft: 'var(--sunset-soft)' },
  fuel: { label: 'Fuel', icon: Fuel, color: 'var(--ink-2)', soft: 'var(--surface-2)' },
  rest: { label: 'Rest', icon: Armchair, color: 'var(--pine)', soft: 'var(--pine-soft)' },
  photo: { label: 'Photo spot', icon: Camera, color: '#c2410c', soft: 'var(--butter-soft)' },
  stay: { label: 'Stay', icon: BedDouble, color: 'var(--pine)', soft: 'var(--pine-soft)' },
  other: { label: 'Stop', icon: MapPin, color: 'var(--ink-2)', soft: 'var(--surface-2)' },
};

/** Distinct colors for days on the map. */
export const DAY_COLORS = ['#ff5b2e', '#0f5f56', '#8a4fff', '#5b8def', '#e8366b', '#c2410c', '#3dbfa9', '#b7791f'];
