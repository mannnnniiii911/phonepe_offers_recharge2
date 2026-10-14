import type { Operator } from '../types/recharge';

export const OPERATORS: Record<string, Operator> = {
  jio: {
    id: 'jio',
    name: 'Jio',
    brandColor: '#E11D48',
    badgeBg: '#FEE2E2',
    textColor: '#FFFFFF',
    tagline: 'True 5G Network',
    logoUrl: '/assets/logos/jio.svg',
  },
  airtel: {
    id: 'airtel',
    name: 'Airtel',
    brandColor: '#ED1C24',
    badgeBg: '#FEE2E2',
    textColor: '#ED1C24',
    tagline: 'Airtel 5G Plus',
    logoUrl: '/assets/logos/airtel.svg',
  },
  vi: {
    id: 'vi',
    name: 'Vi',
    brandColor: '#ED303B',
    badgeBg: '#FFE4E6',
    textColor: '#ED303B',
    tagline: 'Vi Hero Unlimited',
    logoUrl: '/assets/logos/vi.svg',
  },
  bsnl: {
    id: 'bsnl',
    name: 'BSNL',
    brandColor: '#00598E',
    badgeBg: '#E0F2FE',
    textColor: '#00598E',
    tagline: 'Connecting India 4G',
    logoUrl: '/assets/logos/bsnl.svg',
  },
};

export const OPERATOR_LIST: Operator[] = Object.values(OPERATORS);
