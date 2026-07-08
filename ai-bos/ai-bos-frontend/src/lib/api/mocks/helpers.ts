// ============================================================
// Mock data helpers
// ============================================================

export function uuid(): string {
    return crypto.randomUUID();
  }
  
  export function daysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
  }
  
  export function daysFromNow(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }
  
  export function hoursAgo(hours: number): string {
    const d = new Date();
    d.setHours(d.getHours() - hours);
    return d.toISOString();
  }
  
  export function hoursFromNow(hours: number): string {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    return d.toISOString();
  }
  
  export const AVATAR_COLORS = [
    '#4f46e5', '#0d9488', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#3b82f6', '#84cc16',
  ];
  
  export function randomColor(seed: number): string {
    return AVATAR_COLORS[seed % AVATAR_COLORS.length];
  }
  
  export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  export function randomFloat(min: number, max: number, decimals = 2): number {
    return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
  }
  
  export function pick<T>(arr: T[], seed: number): T {
    return arr[seed % arr.length];
  }
  
  // French company names for realistic mock data
  export const COMPANIES = [
    'TechSolutions SAS', 'Boulangerie Martin', 'Cabinet Lefevre', 'Studio Pixel',
    'Logitrans SARL', 'Pharma Plus', 'GreenEnergy Corp', 'Bistro Le Gourmet',
    'Digital Wave', 'Construction Durand', 'Avocats & Associes', 'MediaGroup Paris',
    'FinTech Innovations', 'Cloud Systems FR', 'Bio Santé Ltd', 'EduPro Formation',
    'Manufacture Lyon', 'Agence Voyage Plus', 'Restaurant Chez Nous', 'TechLab Recherche',
    'Import Export Global', 'Solutions RH', 'Marketing Pro Agency', 'DataMind Analytics',
    'Security First Corp', 'EcoBuild Materials', 'Nordic Foods', 'Paris Digital Agency',
    'SudOuest Logistique', 'Innovation Hub',
  ];
  
  export const FIRST_NAMES = [
    'Jean', 'Marie', 'Pierre', 'Sophie', 'Lucas', 'Emma', 'Thomas', 'Lea',
    'Antoine', 'Camille', 'Nicolas', 'Julie', 'Maxime', 'Sarah', 'Hugo',
    'Chloe', 'Alexandre', 'Manon', 'Romain', 'Pauline', 'Vincent', 'Laura',
    'Guillaume', 'Claire', 'Julien', 'Elise', 'Francois', 'Nathan', 'Olivier', 'Ines',
  ];
  
  export const LAST_NAMES = [
    'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand',
    'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia',
    'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard',
    'Andre', 'Lefevre', 'Mercier', 'Dumont', 'Rousseau', 'Blanc', 'Guerin',
    'Boyer', 'Garnier',
  ];
  
  export function fullName(seed: number): string {
    return `${FIRST_NAMES[seed % FIRST_NAMES.length]} ${LAST_NAMES[(seed * 7) % LAST_NAMES.length]}`;
  }
  