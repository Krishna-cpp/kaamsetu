/**
 * Help centres for scheme enrolment. SAMPLE DATA: generic entries placed at locality centroids,
 * not verified addresses. Workers are told to confirm timings before visiting.
 */
import { haversineKm, type LatLng } from '../geo';
import type { IndianState } from '../localities';
import type { HelpCentreType } from './catalogue';

export interface HelpCentre {
  id: string;
  name: string;
  type: HelpCentreType;
  area: string;
  city: 'Pune' | 'Bengaluru';
  state: IndianState;
  location: LatLng;
  sample: true;
}

const c = (id: string, name: string, type: HelpCentreType, area: string, city: HelpCentre['city'], lat: number, lng: number): HelpCentre => ({
  id,
  name,
  type,
  area,
  city,
  state: city === 'Pune' ? 'MH' : 'KA',
  location: { lat, lng },
  sample: true,
});

export const HELP_CENTRES: HelpCentre[] = [
  // Pune
  c('pn-csc-kothrud', 'Common Service Centre (sample)', 'csc', 'Kothrud', 'Pune', 18.5062, 73.8069),
  c('pn-csc-hadapsar', 'Common Service Centre (sample)', 'csc', 'Hadapsar', 'Pune', 18.5079, 73.9248),
  c('pn-csc-pimpri', 'Common Service Centre (sample)', 'csc', 'Pimpri', 'Pune', 18.6286, 73.8012),
  c('pn-csc-wakad', 'Common Service Centre (sample)', 'csc', 'Wakad', 'Pune', 18.5993, 73.7625),
  c('pn-csc-kharadi', 'Common Service Centre (sample)', 'csc', 'Kharadi', 'Pune', 18.5502, 73.9361),
  c('pn-bank-kothrud', 'Bank branch: Jan Suraksha enrolment (sample)', 'bank', 'Kothrud', 'Pune', 18.5081, 73.8101),
  c('pn-bank-shivajinagar', 'Bank branch: Jan Suraksha enrolment (sample)', 'bank', 'Shivajinagar', 'Pune', 18.5314, 73.8462),
  c('pn-bank-aundh', 'Bank branch: Jan Suraksha enrolment (sample)', 'bank', 'Aundh', 'Pune', 18.5597, 73.8091),
  c('pn-lab-shivajinagar', 'Labour office / BOCW facilitation centre (sample)', 'labour_office', 'Shivajinagar', 'Pune', 18.5298, 73.8501),
  c('pn-lab-pimpri', 'Labour office / BOCW facilitation centre (sample)', 'labour_office', 'Pimpri', 'Pune', 18.6271, 73.8031),
  // Bengaluru
  c('bl-csc-jayanagar', 'Common Service Centre (sample)', 'csc', 'Jayanagar', 'Bengaluru', 12.9262, 77.5931),
  c('bl-csc-rajajinagar', 'Common Service Centre (sample)', 'csc', 'Rajajinagar', 'Bengaluru', 12.9922, 77.5531),
  c('bl-csc-whitefield', 'Common Service Centre (sample)', 'csc', 'Whitefield', 'Bengaluru', 12.9707, 77.7491),
  c('bl-csc-ecity', 'Common Service Centre (sample)', 'csc', 'Electronic City', 'Bengaluru', 12.8463, 77.6611),
  c('bl-csc-krpuram', 'Common Service Centre (sample)', 'csc', 'K R Puram', 'Bengaluru', 13.0069, 77.6949),
  c('bl-bank-marathahalli', 'Bank branch: Jan Suraksha enrolment (sample)', 'bank', 'Marathahalli', 'Bengaluru', 12.9586, 77.6981),
  c('bl-bank-banashankari', 'Bank branch: Jan Suraksha enrolment (sample)', 'bank', 'Banashankari', 'Bengaluru', 12.9262, 77.5472),
  c('bl-bank-hebbal', 'Bank branch: Jan Suraksha enrolment (sample)', 'bank', 'Hebbal', 'Bengaluru', 13.0351, 77.5978),
  c('bl-lab-peenya', 'Labour office / BOCW facilitation centre (sample)', 'labour_office', 'Peenya', 'Bengaluru', 13.0291, 77.5189),
  c('bl-lab-yeshwanthpur', 'Labour office / BOCW facilitation centre (sample)', 'labour_office', 'Yeshwanthpur', 'Bengaluru', 13.0279, 77.5409),
];

export function nearestHelpCentre(from: LatLng, type?: HelpCentreType): { centre: HelpCentre; distanceKm: number } | null {
  let best: { centre: HelpCentre; distanceKm: number } | null = null;
  for (const centre of HELP_CENTRES) {
    if (type && centre.type !== type) continue;
    const d = haversineKm(from, centre.location);
    if (!best || d < best.distanceKm) best = { centre, distanceKm: Math.round(d * 10) / 10 };
  }
  return best;
}

export const mapsLink = (l: LatLng) => `https://maps.google.com/?q=${l.lat},${l.lng}`;
