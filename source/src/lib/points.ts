export type ActivityFields = Record<string, number>;

export const TIERS = [
  { name: 'No Timer', min: 0, max: 0 },
  { name: 'Some Timer', min: 1, max: 3 },
  { name: 'Part Timer', min: 4, max: 10 },
  { name: 'Full Timer', min: 11, max: 20 },
  { name: 'All-the-Timer', min: 21, max: 999 },
];

export function calculatePoints(fields: ActivityFields): number {
  let pts = 0;
  const contactIds = ['calls_warm', 'calls_cold', 'msg_text', 'msg_linkedin', 'msg_facebook', 'msg_instagram', 'msg_tiktok'];
  const totalContacts = contactIds.reduce((sum, id) => sum + (fields[id] || 0), 0);

  pts += Math.floor(totalContacts / 10);
  pts += (fields.personal_guests || 0) * 1;
  pts += (fields.team_guests || 0) * 1;
  pts += (fields.new_partners || 0) * 1;
  pts += (fields.fna1 || 0) * 1;
  pts += (fields.fna2 || 0) * 1;
  pts += Math.floor((fields.referrals || 0) / 10);

  return pts;
}

export function getTier(points: number): string {
  const match = TIERS.find((tier) => points >= tier.min && points <= tier.max);
  if (match) return match.name;
  return 'No Timer';
}
