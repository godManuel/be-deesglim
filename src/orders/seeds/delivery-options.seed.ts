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
];
