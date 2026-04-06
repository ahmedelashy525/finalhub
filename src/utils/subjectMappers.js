import { 
  Activity, 
  Heart, 
  Microscope, 
  Pill, 
  Brain, 
  Stethoscope, 
  BookOpen, 
  Database,
  Dna,
  Syringe,
  FlaskConical,
  Bone
} from 'lucide-react';

export const IconDictionary = {
  Activity: Activity,
  Heart: Heart,
  Microscope: Microscope,
  Pill: Pill,
  Brain: Brain,
  Stethoscope: Stethoscope,
  BookOpen: BookOpen,
  Database: Database,
  Dna: Dna,
  Syringe: Syringe,
  FlaskConical: FlaskConical,
  Bone: Bone
};

// Returns a safe fallback resolving mapped React Components
export const getIconMap = (iconName) => {
  return IconDictionary[iconName] || BookOpen;
};

// Generic Collection Map of Safe Tailwind Gradients 
export const ColorDictionary = [
  { id: 'purple', class: 'from-purple-500 to-indigo-500', name: 'Purple Indigo' },
  { id: 'pink', class: 'from-rose-500 to-pink-500', name: 'Rose Pink' },
  { id: 'blue', class: 'from-blue-500 to-cyan-500', name: 'Blue Cyan' },
  { id: 'teal', class: 'from-emerald-500 to-teal-500', name: 'Emerald Teal' },
  { id: 'orange', class: 'from-orange-500 to-amber-500', name: 'Orange Amber' },
  { id: 'red', class: 'from-red-500 to-rose-600', name: 'Crimson Red' },
  { id: 'gray', class: 'from-slate-500 to-slate-700', name: 'Slate Core' }
];

// Fallback logic resolving the class purely explicitly
export const getColorClass = (colorId) => {
  const match = ColorDictionary.find(c => c.id === colorId);
  return match ? match.class : 'from-slate-500 to-slate-700';
};
