/** Duration presets for the admin suspend-user action. null = indefinite. */
export const SUSPENSION_OPTIONS: { label: string; durationHours: number | null }[] = [
  { label: '24 Hours', durationHours: 24 },
  { label: '7 Days', durationHours: 168 },
  { label: '30 Days', durationHours: 720 },
  { label: 'Indefinitely', durationHours: null },
];
