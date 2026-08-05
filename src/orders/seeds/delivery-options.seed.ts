import { Model } from 'mongoose';
import {
  DeliveryOption,
  DeliveryOptionDocument,
} from '../schemas/delivery-option.schema';

export const deliveryOptionsSeed = [
  {
    id: 'gig-logistics',
    title: 'GIG Logistics',

    deliveryTypes: ['park-pickup', 'home-delivery', 'go-faster'],

    deliveryFees: {
      'park-pickup': 7500,
      'home-delivery': 10500,
      'go-faster': 15000,
    },

    deliveryDurations: {
      'park-pickup': '2-4 working days',
      'home-delivery': '4-7 working days',
      'go-faster': '2 working days',
    },

    availableFor: [
      'Lagos',
      'Ogun',
      'Oyo',
      'Osun',
      'Ondo',
      'Ekiti',
      'Abuja (FCT)',
      'Kaduna',
      'Kano',
      'Katsina',
      'Sokoto',
      'Bayelsa',
      'Delta',
      'Edo',
      'Akwa Ibom',
      'Cross River',
      'Abia',
      'Anambra',
      'Ebonyi',
      'Enugu',
      'Imo',
    ],

    description:
      'Available for all northern states and major cities across Nigeria',

    isActive: true,
  },

  {
    id: 'guo-transport',
    title: 'GUO Transport',

    deliveryTypes: ['park-pickup', 'home-delivery'],

    deliveryFees: {
      'park-pickup': 6000,
      'home-delivery': 12000,
    },

    deliveryDurations: {
      'park-pickup': '2-3 working days',
      'home-delivery': '4-7 working days',
    },

    availableFor: [
      'Lagos',
      'Abuja (FCT)',
      'Benin',
      'Delta',
      'Abia (including Aba)',
      'Anambra',
      'Ebonyi',
      'Enugu',
      'Imo',
      'Bayelsa',
      'Edo',
      'Akwa Ibom',
      'Cross River',
    ],

    isActive: true,
  },

  {
    id: 'rivers-joy',
    title: 'Rivers-Joy Transport',

    deliveryTypes: ['park-pickup'],

    deliveryFees: {
      'park-pickup': 5000,
    },

    deliveryDurations: {
      'park-pickup': '2-3 working days',
    },

    availableFor: [
      'Abia',
      'Anambra',
      'Ebonyi',
      'Enugu',
      'Imo',
      'Owerri',
      'All eastern states',
    ],

    isActive: true,
  },

  {
    id: 'agofure-motors',
    title: 'Agofure Motors',

    deliveryTypes: ['park-pickup'],

    deliveryFees: {
      'park-pickup': 6000,
    },

    deliveryDurations: {
      'park-pickup': '2-3 working days',
    },

    availableFor: ['Delta', 'Asaba', 'Warri', 'Sapele', 'Surrounding areas'],

    isActive: true,
  },

  {
    id: 'aktc',
    title: 'AKTC (Akwa Ibom Transport)',

    deliveryTypes: ['park-pickup'],

    deliveryFees: {
      'park-pickup': 5000,
    },

    deliveryDurations: {
      'park-pickup': '2-3 working days',
    },

    availableFor: ['Uyo', 'Calabar', 'Akwa Ibom'],

    description: 'Price varies based on destination',

    isActive: true,
  },

  {
    id: 'galloping-motors',
    title: 'Galloping Motors',

    deliveryTypes: ['park-pickup'],

    deliveryFees: {
      'park-pickup': 5000,
    },

    deliveryDurations: {
      'park-pickup': '1-2 days',
    },

    availableFor: ['Aba'],

    isActive: true,
  },

  {
    id: 'bayelsa-park',
    title: 'Bayelsa Park Igbogene',

    deliveryTypes: ['park-pickup'],

    deliveryFees: {
      'park-pickup': 5000,
    },

    deliveryDurations: {
      'park-pickup': '1-2 days',
    },

    availableFor: ['Yenagoa', 'Bayelsa'],

    isActive: true,
  },

  {
    id: 'dream-box',
    title: 'DREAMBOX',

    deliveryTypes: ['go-faster'],

    deliveryFees: {
      'go-faster': 18000,
    },

    deliveryDurations: {
      'go-faster': 'Next day',
    },

    availableFor: ['All locations'],

    description: 'Premium express delivery service',

    isActive: true,
  },

  // ============================================================
  // PORT HARCOURT / RIVERS STATE LOCAL DELIVERY
  // ============================================================

  {
    id: 'port-harcourt-pickup',
    title: 'Pick Up - Free',

    deliveryTypes: ['pick-up'],

    deliveryFees: {
      'pick-up': 0,
    },

    deliveryDurations: {
      'pick-up': 'Same day',
    },

    availableFor: ['MTN Mast', 'New Road', 'Borokiri'],

    description:
      'Free pick-up delivery available at MTN Mast, New Road, and Borokiri.',

    isActive: true,
  },

  {
    id: 'port-harcourt-local-5000',
    title: 'Port Harcourt Local Delivery',

    deliveryTypes: ['home-delivery'],

    deliveryFees: {
      'home-delivery': 5000,
    },

    deliveryDurations: {
      'home-delivery': '1-2 working days',
    },

    availableFor: ['Alakhia', 'Choba', 'Eneka Link Road'],

    description:
      'Local delivery service available to Alakhia, Choba, and Eneka Link Road.',

    isActive: true,
  },

  {
    id: 'port-harcourt-local-7000',
    title: 'Port Harcourt Local Delivery',

    deliveryTypes: ['home-delivery'],

    deliveryFees: {
      'home-delivery': 7000,
    },

    deliveryDurations: {
      'home-delivery': '1-2 working days',
    },

    availableFor: ['Rumekeni', 'Igwrita'],

    description: 'Local delivery service available to Rumekeni and Igwrita.',

    isActive: true,
  },

  {
    id: 'port-harcourt-local-4500',
    title: 'Port Harcourt Local Delivery',

    deliveryTypes: ['home-delivery'],

    deliveryFees: {
      'home-delivery': 4500,
    },

    deliveryDurations: {
      'home-delivery': '1-2 working days',
    },

    availableFor: [
      'Rumuibekwe',
      'Sarsroad',
      'Rumukparali',
      'Obirekwere',
      'Ogbogoro',
      'Rumuogholu',
      'Rumuokoro',
      'Rumuosi',
    ],

    description:
      'Local delivery service available to Rumuibekwe, Sarsroad, Rumukparali, Obirekwere, Ogbogoro, Rumuogholu, Rumuokoro, and Rumuosi.',

    isActive: true,
  },

  {
    id: 'port-harcourt-local-2500',
    title: 'Port Harcourt Local Delivery',

    deliveryTypes: ['home-delivery'],

    deliveryFees: {
      'home-delivery': 2500,
    },

    deliveryDurations: {
      'home-delivery': '1-2 working days',
    },

    availableFor: ['Lagos Bustop to Town', 'Eastern Bypass', 'Marine Base'],

    description:
      'Local delivery service available from Lagos Bustop to Town, Eastern Bypass, and Marine Base.',

    isActive: true,
  },

  {
    id: 'port-harcourt-local-3000',
    title: 'Port Harcourt Local Delivery',

    deliveryTypes: ['home-delivery'],

    deliveryFees: {
      'home-delivery': 3000,
    },

    deliveryDurations: {
      'home-delivery': '1-2 working days',
    },

    availableFor: ['Station Road to Mile 1'],

    description:
      'Local delivery service available from Station Road to Mile 1.',

    isActive: true,
  },

  {
    id: 'port-harcourt-local-3500',
    title: 'Port Harcourt Local Delivery',

    deliveryTypes: ['home-delivery'],

    deliveryFees: {
      'home-delivery': 3500,
    },

    deliveryDurations: {
      'home-delivery': '1-2 working days',
    },

    availableFor: [
      'Bori Camp',
      'Odili Road',
      'Elekahwon',
      'Mile 3',
      'Mile 1',
      'Ada George',
      'Station Road',
      'Ozuboko off Abuloma',
      'Elekahia',
      'Old GRA',
      'Rumuigbo',
      'Oraozi',
      'Agip',
      'GRA',
      'Rumuola',
      'Waterlines',
    ],

    description:
      'Local delivery service available to Bori Camp, Odili Road, Elekahwon, Mile 3, Mile 1, Ada George, Station Road, Ozuboko off Abuloma, Elekahia, Old GRA, Rumuigbo, Oraozi, Agip, GRA, Rumuola, and Waterlines.',

    isActive: true,
  },

  {
    id: 'port-harcourt-local-4000',
    title: 'Port Harcourt Local Delivery',

    deliveryTypes: ['home-delivery'],

    deliveryFees: {
      'home-delivery': 4000,
    },

    deliveryDurations: {
      'home-delivery': '1-2 working days',
    },

    availableFor: [
      'NTA Road',
      'Ozuoba',
      'Rukpokwu',
      'Eliozu',
      'Rumuokalabor',
      'Abuloma from Bitterleaf',
      'Elibolo',
    ],

    description:
      'Local delivery service available to NTA Road, Ozuoba, Rukpokwu, Eliozu, Rumuokalabor, Abuloma from Bitterleaf, and Elibolo.',

    isActive: true,
  },

  {
    id: 'port-harcourt-local-12000',
    title: 'Port Harcourt Local Delivery',

    deliveryTypes: ['home-delivery'],

    deliveryFees: {
      'home-delivery': 12000,
    },

    deliveryDurations: {
      'home-delivery': '1-2 working days',
    },

    availableFor: ['PH International Airport', 'Oyibo'],

    description:
      'Local delivery service available to Port Harcourt International Airport and Oyibo.',

    isActive: true,
  },
];
