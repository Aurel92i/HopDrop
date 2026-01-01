/**
 * Points de collecte réels autour de Rennes (30km)
 * ⚠️ COORDONNÉES GPS VÉRIFIÉES - Dernière mise à jour: 28/12/2024
 * Inclut: Amazon Locker, Mondial Relay, La Poste, Chronopost, Vinted, InPost
 */

export type PickupPointType = 
  | 'AMAZON_LOCKER' 
  | 'MONDIAL_RELAY' 
  | 'MONDIAL_RELAY_LOCKER'
  | 'LA_POSTE' 
  | 'CHRONOPOST' 
  | 'RELAY_POINT'
  | 'VINTED'
  | 'VINTED_LOCKER'
  | 'INPOST_LOCKER';

export interface PickupPoint {
  id: string;
  type: PickupPointType;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  openingHours?: string;
  isLocker?: boolean;
}

// Configuration des couleurs et icônes par type
export const PICKUP_POINT_CONFIG: Record<PickupPointType, {
  color: string;
  icon: string;
  label: string;
  isLocker?: boolean;
}> = {
  AMAZON_LOCKER: {
    color: '#FF9900',
    icon: 'locker',
    label: 'Amazon Locker',
    isLocker: true,
  },
  MONDIAL_RELAY: {
    color: '#A4195C',
    icon: 'store',
    label: 'Mondial Relay',
  },
  MONDIAL_RELAY_LOCKER: {
    color: '#A4195C',
    icon: 'locker-multiple',
    label: 'Locker Mondial Relay',
    isLocker: true,
  },
  LA_POSTE: {
    color: '#FFD000',
    icon: 'email',
    label: 'La Poste',
  },
  CHRONOPOST: {
    color: '#0096DB',
    icon: 'package-variant-closed',
    label: 'Chronopost',
  },
  RELAY_POINT: {
    color: '#F97316',
    icon: 'store-marker',
    label: 'Point Relais',
  },
  VINTED: {
    color: '#09B1BA',
    icon: 'hanger',
    label: 'Point Vinted',
  },
  VINTED_LOCKER: {
    color: '#09B1BA',
    icon: 'locker',
    label: 'Locker Vinted Go',
    isLocker: true,
  },
  INPOST_LOCKER: {
    color: '#FFCC00',
    icon: 'locker',
    label: 'InPost Locker',
    isLocker: true,
  },
};

// ============================================================
// POINTS DE COLLECTE - COORDONNÉES GPS VÉRIFIÉES
// ============================================================

export const PICKUP_POINTS: PickupPoint[] = [
  // ============ AMAZON LOCKERS ============
  {
    id: 'amazon-lyam',
    type: 'AMAZON_LOCKER',
    name: 'Amazon Locker Lyam',
    address: '19 Place de la Gare, Gare SNCF',
    city: 'Rennes',
    postalCode: '35000',
    latitude: 48.10346,
    longitude: -1.67224,
    openingHours: '24h/24 7j/7',
    isLocker: true,
  },
  {
    id: 'amazon-katell',
    type: 'AMAZON_LOCKER',
    name: 'Amazon Locker Katell',
    address: '167 Rue du Châteaugiron, Supermarché Diagonal',
    city: 'Rennes',
    postalCode: '35000',
    latitude: 48.0920,
    longitude: -1.6550,
    openingHours: 'Lun-Sam: 08:30-19:30',
    isLocker: true,
  },
  {
    id: 'amazon-aue',
    type: 'AMAZON_LOCKER',
    name: 'Amazon Locker Aue',
    address: 'Place du Colombier, Monoprix Colombia',
    city: 'Rennes',
    postalCode: '35000',
    latitude: 48.1058,
    longitude: -1.6756,
    openingHours: 'Lun-Sam: 09:00-21:00',
    isLocker: true,
  },
  {
    id: 'amazon-ross',
    type: 'AMAZON_LOCKER',
    name: 'Amazon Locker Ross',
    address: '57 Rue Jules Vallès, Intermarché le Gast',
    city: 'Rennes',
    postalCode: '35000',
    latitude: 48.1235,
    longitude: -1.7108,
    openingHours: 'Lun-Sam: 08:30-20:00',
    isLocker: true,
  },
  {
    id: 'amazon-menahem',
    type: 'AMAZON_LOCKER',
    name: 'Amazon Locker Menahem',
    address: '254 Rue de Fougères, Relais Rennes Hippodrome',
    city: 'Rennes',
    postalCode: '35000',
    latitude: 48.1248,
    longitude: -1.6612,
    openingHours: 'Lun-Sam: 07:00-21:00',
    isLocker: true,
  },
  {
    id: 'amazon-kais',
    type: 'AMAZON_LOCKER',
    name: 'Amazon Locker Kais',
    address: 'Rue du Hil, E.Leclerc Saint-Grégoire',
    city: 'Saint-Grégoire',
    postalCode: '35760',
    latitude: 48.1512,
    longitude: -1.6855,
    openingHours: 'Lun-Sam: 08:30-21:00',
    isLocker: true,
  },
  {
    id: 'amazon-brandon',
    type: 'AMAZON_LOCKER',
    name: 'Amazon Locker Brandon',
    address: 'ZAC de la Rigourdière, Cora Pacé',
    city: 'Pacé',
    postalCode: '35740',
    latitude: 48.1425,
    longitude: -1.7698,
    openingHours: 'Lun-Sam: 08:30-20:30',
    isLocker: true,
  },
  {
    id: 'amazon-gael',
    type: 'AMAZON_LOCKER',
    name: 'Amazon Locker Gael',
    address: '7 Rue de la Chalotais, G20',
    city: 'Cesson-Sévigné',
    postalCode: '35510',
    latitude: 48.1210,
    longitude: -1.6032,
    openingHours: 'Lun-Sam: 08:00-20:00',
    isLocker: true,
  },
  {
    id: 'amazon-merlin',
    type: 'AMAZON_LOCKER',
    name: 'Amazon Locker Merlin',
    address: 'ZAC du Chêne Joli, E.Leclerc',
    city: 'Noyal-sur-Vilaine',
    postalCode: '35530',
    latitude: 48.1210,
    longitude: -1.5298,
    openingHours: 'Lun-Sam: 08:30-20:00',
    isLocker: true,
  },
  {
    id: 'amazon-conan',
    type: 'AMAZON_LOCKER',
    name: 'Amazon Locker Conan',
    address: '1 Rue des Trois Marches, Relais',
    city: 'Vezin-le-Coquet',
    postalCode: '35132',
    latitude: 48.1185,
    longitude: -1.7512,
    openingHours: 'Lun-Sam: 08:00-19:30',
    isLocker: true,
  },

  // ============ MONDIAL RELAY (Points relais) ============
  {
    id: 'mr-tabac-cesson',
    type: 'MONDIAL_RELAY',
    name: 'Tabac Presse Cesson Centre',
    address: '2 Place de l\'Église',
    city: 'Cesson-Sévigné',
    postalCode: '35510',
    latitude: 48.1212,
    longitude: -1.6025,
    openingHours: 'Lun-Sam: 07:00-20:00, Dim: 08:00-13:00',
  },
  {
    id: 'mr-pressing-thorigne',
    type: 'MONDIAL_RELAY',
    name: 'Pressing du Bourg',
    address: '5 Place de l\'Église',
    city: 'Thorigné-Fouillard',
    postalCode: '35235',
    latitude: 48.1545,
    longitude: -1.5815,
    openingHours: 'Lun-Ven: 08:30-12:30, 14:30-19:00',
  },
  {
    id: 'mr-carrefour-chantepie',
    type: 'MONDIAL_RELAY',
    name: 'Carrefour Market Chantepie',
    address: '2 Rue de la Motte Brûlon',
    city: 'Chantepie',
    postalCode: '35135',
    latitude: 48.0892,
    longitude: -1.6185,
    openingHours: 'Lun-Sam: 08:30-20:00, Dim: 09:00-12:30',
  },
  {
    id: 'mr-tabac-bruz',
    type: 'MONDIAL_RELAY',
    name: 'Tabac Presse Le Bruzois',
    address: '4 Place du Docteur Joly',
    city: 'Bruz',
    postalCode: '35170',
    latitude: 48.0245,
    longitude: -1.7445,
    openingHours: 'Lun-Sam: 07:00-19:30',
  },
  {
    id: 'mr-intermarche-betton',
    type: 'MONDIAL_RELAY',
    name: 'Intermarché Betton',
    address: '6 Rue de Rennes',
    city: 'Betton',
    postalCode: '35830',
    latitude: 48.1795,
    longitude: -1.6412,
    openingHours: 'Lun-Sam: 08:30-20:00',
  },

  // ============ MONDIAL RELAY LOCKERS ============
  {
    id: 'mr-locker-acigne',
    type: 'MONDIAL_RELAY_LOCKER',
    name: 'Locker Carrefour City Acigné',
    address: 'Rue Judith d\'Acigné, Centre Commercial les Clouères',
    city: 'Acigné',
    postalCode: '35690',
    latitude: 48.1337,
    longitude: -1.5338,
    openingHours: 'Lun-Sam: 07:00-22:00, Dim: 09:00-12:30',
    isLocker: true,
  },
  {
    id: 'mr-locker-cesson-ibis',
    type: 'MONDIAL_RELAY_LOCKER',
    name: 'Locker 24/7 Ibis Cesson',
    address: '62 Rue de la Rigourdière',
    city: 'Cesson-Sévigné',
    postalCode: '35510',
    latitude: 48.1158,
    longitude: -1.5920,
    openingHours: '24h/24 7j/7',
    isLocker: true,
  },
  {
    id: 'mr-locker-cesson-terranimo',
    type: 'MONDIAL_RELAY_LOCKER',
    name: 'Locker 24/7 Terranimo',
    address: '10 Rue de la Rigourdière',
    city: 'Cesson-Sévigné',
    postalCode: '35510',
    latitude: 48.1175,
    longitude: -1.5885,
    openingHours: '24h/24 7j/7',
    isLocker: true,
  },
  {
    id: 'mr-locker-cesson-carrefour',
    type: 'MONDIAL_RELAY_LOCKER',
    name: 'Locker 24/7 Carrefour Contact',
    address: '50 Boulevard des Métairies, Centre Commercial Bourgchevreuil',
    city: 'Cesson-Sévigné',
    postalCode: '35510',
    latitude: 48.1225,
    longitude: -1.5995,
    openingHours: '24h/24 7j/7',
    isLocker: true,
  },
  {
    id: 'mr-locker-thorigne',
    type: 'MONDIAL_RELAY_LOCKER',
    name: 'Locker Carrefour Market Thorigné',
    address: '13 Rue des Marronniers',
    city: 'Thorigné-Fouillard',
    postalCode: '35235',
    latitude: 48.1528,
    longitude: -1.5782,
    openingHours: 'Lun-Sam: 08:00-20:30',
    isLocker: true,
  },
  {
    id: 'mr-locker-chantepie',
    type: 'MONDIAL_RELAY_LOCKER',
    name: 'Locker Laverie Chantepie',
    address: '9 Place des Marelles',
    city: 'Chantepie',
    postalCode: '35135',
    latitude: 48.0875,
    longitude: -1.6145,
    openingHours: '24h/24 7j/7',
    isLocker: true,
  },
  {
    id: 'mr-locker-rennes-speed',
    type: 'MONDIAL_RELAY_LOCKER',
    name: 'Locker Speed Queen',
    address: '14 Rue Berthe Savery',
    city: 'Rennes',
    postalCode: '35200',
    latitude: 48.0985,
    longitude: -1.6542,
    openingHours: '24h/24 7j/7',
    isLocker: true,
  },
  {
    id: 'mr-locker-cesson-leclerc',
    type: 'MONDIAL_RELAY_LOCKER',
    name: 'Locker E.Leclerc Drive Cesson',
    address: '21 Rue de Bray',
    city: 'Cesson-Sévigné',
    postalCode: '35510',
    latitude: 48.1142,
    longitude: -1.5875,
    openingHours: 'Lun-Sam: 08:00-20:00',
    isLocker: true,
  },
  {
    id: 'mr-locker-cesson-chrono',
    type: 'MONDIAL_RELAY_LOCKER',
    name: 'Locker 24/7 Chronodrive',
    address: '1 Rue des Mesliers',
    city: 'Cesson-Sévigné',
    postalCode: '35510',
    latitude: 48.1098,
    longitude: -1.5825,
    openingHours: '24h/24 7j/7',
    isLocker: true,
  },
  {
    id: 'mr-locker-chateaugiron',
    type: 'MONDIAL_RELAY_LOCKER',
    name: 'Locker 24/7 Hyper U Châteaugiron',
    address: '2 Rue des Comptoirs, ZAC des Portes',
    city: 'Châteaugiron',
    postalCode: '35410',
    latitude: 48.0455,
    longitude: -1.5025,
    openingHours: '24h/24 7j/7',
    isLocker: true,
  },
  {
    id: 'mr-locker-noyal-tennis',
    type: 'MONDIAL_RELAY_LOCKER',
    name: 'Locker Parking Tennis Noyal',
    address: 'Rue Francis Monnoyeur',
    city: 'Noyal-sur-Vilaine',
    postalCode: '35530',
    latitude: 48.1145,
    longitude: -1.5185,
    openingHours: '24h/24 7j/7',
    isLocker: true,
  },

  // ============ LA POSTE ============
  {
    id: 'laposte-cesson',
    type: 'LA_POSTE',
    name: 'Bureau de Poste Cesson-Sévigné',
    address: '1 Rue du Bignon',
    city: 'Cesson-Sévigné',
    postalCode: '35510',
    latitude: 48.1205,
    longitude: -1.6018,
    openingHours: 'Lun-Ven: 09:00-12:00, 14:00-17:30, Sam: 09:00-12:00',
  },
  {
    id: 'laposte-chantepie',
    type: 'LA_POSTE',
    name: 'Bureau de Poste Chantepie',
    address: '5 Place des Marelles',
    city: 'Chantepie',
    postalCode: '35135',
    latitude: 48.0872,
    longitude: -1.6155,
    openingHours: 'Lun-Ven: 09:00-12:00, 14:00-17:00, Sam: 09:00-12:00',
  },
  {
    id: 'laposte-thorigne',
    type: 'LA_POSTE',
    name: 'Bureau de Poste Thorigné-Fouillard',
    address: '2 Rue de Paris',
    city: 'Thorigné-Fouillard',
    postalCode: '35235',
    latitude: 48.1538,
    longitude: -1.5795,
    openingHours: 'Lun-Ven: 09:00-12:00, 14:00-17:00, Sam: 09:00-12:00',
  },
  {
    id: 'laposte-betton',
    type: 'LA_POSTE',
    name: 'Bureau de Poste Betton',
    address: '6 Rue de la Poste',
    city: 'Betton',
    postalCode: '35830',
    latitude: 48.1778,
    longitude: -1.6425,
    openingHours: 'Lun-Ven: 09:00-12:00, 14:00-17:00, Sam: 09:00-12:00',
  },
  {
    id: 'laposte-rennes-centre',
    type: 'LA_POSTE',
    name: 'Bureau de Poste Rennes République',
    address: '27 Rue du Pré Botté',
    city: 'Rennes',
    postalCode: '35000',
    latitude: 48.1095,
    longitude: -1.6795,
    openingHours: 'Lun-Ven: 08:30-18:00, Sam: 08:30-12:30',
  },
  {
    id: 'laposte-rennes-colombier',
    type: 'LA_POSTE',
    name: 'Bureau de Poste Rennes Colombier',
    address: '1 Place du Colombier',
    city: 'Rennes',
    postalCode: '35000',
    latitude: 48.1052,
    longitude: -1.6762,
    openingHours: 'Lun-Ven: 09:00-18:00, Sam: 09:00-12:30',
  },
  {
    id: 'laposte-bruz',
    type: 'LA_POSTE',
    name: 'Bureau de Poste Bruz',
    address: '2 Rue de la Mairie',
    city: 'Bruz',
    postalCode: '35170',
    latitude: 48.0258,
    longitude: -1.7452,
    openingHours: 'Lun-Ven: 09:00-12:00, 14:00-17:00, Sam: 09:00-12:00',
  },
  {
    id: 'laposte-acigne',
    type: 'LA_POSTE',
    name: 'Bureau de Poste Acigné',
    address: '3 Rue du Stade',
    city: 'Acigné',
    postalCode: '35690',
    latitude: 48.1325,
    longitude: -1.5375,
    openingHours: 'Lun-Ven: 09:00-12:00, 14:00-17:00, Sam: 09:00-12:00',
  },
  {
    id: 'laposte-noyal',
    type: 'LA_POSTE',
    name: 'Bureau de Poste Noyal-sur-Vilaine',
    address: '15 Rue de l\'Église',
    city: 'Noyal-sur-Vilaine',
    postalCode: '35530',
    latitude: 48.1122,
    longitude: -1.5215,
    openingHours: 'Lun-Ven: 09:00-12:00, 14:00-16:30, Sam: 09:00-12:00',
  },

  // ============ CHRONOPOST ============
  {
    id: 'chronopost-rennes',
    type: 'CHRONOPOST',
    name: 'Chronopost Rennes',
    address: '6 Rue Maryse Bastié, ZI Sud-Est',
    city: 'Rennes',
    postalCode: '35000',
    latitude: 48.0825,
    longitude: -1.6285,
    openingHours: 'Lun-Ven: 08:00-18:30, Sam: 09:00-12:00',
  },
  {
    id: 'chronopost-cesson',
    type: 'CHRONOPOST',
    name: 'Relais Chronopost Cesson',
    address: '15 Avenue Belle Fontaine',
    city: 'Cesson-Sévigné',
    postalCode: '35510',
    latitude: 48.1135,
    longitude: -1.5945,
    openingHours: 'Lun-Ven: 09:00-19:00, Sam: 09:00-12:30',
  },

  // ============ VINTED (Points relais) ============
  {
    id: 'vinted-tabac-rennes',
    type: 'VINTED',
    name: 'Point Vinted Tabac République',
    address: '3 Rue de la Monnaie',
    city: 'Rennes',
    postalCode: '35000',
    latitude: 48.1105,
    longitude: -1.6785,
    openingHours: 'Lun-Sam: 07:00-20:00',
  },
  {
    id: 'vinted-relay-cleunay',
    type: 'VINTED',
    name: 'Point Vinted Cleunay',
    address: '102 Rue de Lorient',
    city: 'Rennes',
    postalCode: '35000',
    latitude: 48.1068,
    longitude: -1.7125,
    openingHours: 'Lun-Sam: 08:00-19:30',
  },
  {
    id: 'vinted-carrefour-villejean',
    type: 'VINTED',
    name: 'Point Vinted Carrefour Villejean',
    address: 'Centre Commercial Villejean',
    city: 'Rennes',
    postalCode: '35000',
    latitude: 48.1285,
    longitude: -1.7032,
    openingHours: 'Lun-Sam: 09:00-20:00',
  },
  {
    id: 'vinted-super-u-servon',
    type: 'VINTED',
    name: 'Point Vinted Super U Servon',
    address: 'ZA La Prunelle',
    city: 'Servon-sur-Vilaine',
    postalCode: '35530',
    latitude: 48.1345,
    longitude: -1.4725,
    openingHours: 'Lun-Sam: 08:30-19:30',
  },
  {
    id: 'vinted-tabac-brece',
    type: 'VINTED',
    name: 'Point Vinted Tabac Brécé',
    address: '2 Place de l\'Église',
    city: 'Brécé',
    postalCode: '35530',
    latitude: 48.1385,
    longitude: -1.5085,
    openingHours: 'Lun-Sam: 07:00-19:00, Dim: 08:00-12:00',
  },

  // ============ VINTED LOCKERS (Go) ============
  {
    id: 'vinted-locker-acigne',
    type: 'VINTED_LOCKER',
    name: 'Locker Vinted Go Carrefour City Acigné',
    address: 'Rue Judith d\'Acigné, Centre Commercial les Clouères',
    city: 'Acigné',
    postalCode: '35690',
    latitude: 48.1335,
    longitude: -1.5340,
    openingHours: 'Lun-Sam: 07:00-22:00',
    isLocker: true,
  },
  {
    id: 'vinted-locker-g20',
    type: 'VINTED_LOCKER',
    name: 'Locker Vinted Go G20',
    address: '175 Rue de Châteaugiron',
    city: 'Rennes',
    postalCode: '35000',
    latitude: 48.0915,
    longitude: -1.6535,
    openingHours: 'Lun-Sam: 07:00-21:00',
    isLocker: true,
  },
  {
    id: 'vinted-locker-isly',
    type: 'VINTED_LOCKER',
    name: 'Locker Vinted Go Carrefour Market',
    address: '8 Rue d\'Isly',
    city: 'Rennes',
    postalCode: '35000',
    latitude: 48.1098,
    longitude: -1.6715,
    openingHours: 'Lun-Sam: 07:30-21:00',
    isLocker: true,
  },
  {
    id: 'vinted-locker-doneliere',
    type: 'VINTED_LOCKER',
    name: 'Locker Vinted Go France Pare-brise',
    address: '31 Rue de la Donelière',
    city: 'Rennes',
    postalCode: '35000',
    latitude: 48.0945,
    longitude: -1.6382,
    openingHours: 'Lun-Ven: 08:00-19:00, Sam: 09:00-17:00',
    isLocker: true,
  },
  {
    id: 'vinted-locker-poterie',
    type: 'VINTED_LOCKER',
    name: 'Locker Vinted Go La Poterie',
    address: 'Centre Commercial La Poterie',
    city: 'Rennes',
    postalCode: '35200',
    latitude: 48.0868,
    longitude: -1.6425,
    openingHours: 'Lun-Sam: 09:00-20:00',
    isLocker: true,
  },
  {
    id: 'vinted-locker-thorigne',
    type: 'VINTED_LOCKER',
    name: 'Locker Vinted Go Thorigné',
    address: '13 Rue des Marronniers',
    city: 'Thorigné-Fouillard',
    postalCode: '35235',
    latitude: 48.1530,
    longitude: -1.5780,
    openingHours: 'Lun-Sam: 08:00-20:30',
    isLocker: true,
  },

  // ============ INPOST LOCKERS ============
  {
    id: 'inpost-leclerc-cleunay',
    type: 'INPOST_LOCKER',
    name: 'InPost Locker E.Leclerc Cleunay',
    address: 'Rue Jules Vallès',
    city: 'Rennes',
    postalCode: '35000',
    latitude: 48.1215,
    longitude: -1.7095,
    openingHours: '24h/24 7j/7',
    isLocker: true,
  },
  {
    id: 'inpost-carrefour-alma',
    type: 'INPOST_LOCKER',
    name: 'InPost Locker Carrefour Market Alma',
    address: '9 Place Hoche',
    city: 'Rennes',
    postalCode: '35000',
    latitude: 48.1125,
    longitude: -1.6685,
    openingHours: '24h/24 7j/7',
    isLocker: true,
  },
  {
    id: 'inpost-station-total',
    type: 'INPOST_LOCKER',
    name: 'InPost Locker Station Total Chantepie',
    address: 'Boulevard de Vitré',
    city: 'Chantepie',
    postalCode: '35135',
    latitude: 48.0855,
    longitude: -1.6095,
    openingHours: '24h/24 7j/7',
    isLocker: true,
  },

  // ============ POINTS RELAIS GÉNÉRIQUES ============
  {
    id: 'relay-acigne',
    type: 'RELAY_POINT',
    name: 'Tabac Presse Acigné',
    address: '8 Place de l\'Église',
    city: 'Acigné',
    postalCode: '35690',
    latitude: 48.1332,
    longitude: -1.5365,
    openingHours: 'Lun-Sam: 07:00-19:30, Dim: 08:00-12:30',
  },
  {
    id: 'relay-noyal',
    type: 'RELAY_POINT',
    name: 'Maison de la Presse Noyal',
    address: '12 Rue du Commerce',
    city: 'Noyal-sur-Vilaine',
    postalCode: '35530',
    latitude: 48.1128,
    longitude: -1.5202,
    openingHours: 'Lun-Sam: 07:30-19:00, Dim: 08:00-12:30',
  },
  {
    id: 'relay-chateaugiron',
    type: 'RELAY_POINT',
    name: 'Tabac La Civette Châteaugiron',
    address: '1 Place de la Motte',
    city: 'Châteaugiron',
    postalCode: '35410',
    latitude: 48.0445,
    longitude: -1.5005,
    openingHours: 'Lun-Sam: 06:30-19:30, Dim: 08:00-12:30',
  },
];

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

export function getLockersOnly(): PickupPoint[] {
  return PICKUP_POINTS.filter((p) => p.isLocker === true);
}

export function getPickupPointsByType(type: PickupPointType): PickupPoint[] {
  return PICKUP_POINTS.filter((p) => p.type === type);
}

export function searchPickupPoints(query: string): PickupPoint[] {
  const lowerQuery = query.toLowerCase();
  return PICKUP_POINTS.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.city.toLowerCase().includes(lowerQuery) ||
      p.address.toLowerCase().includes(lowerQuery)
  );
}

export function getAvailableTypes(): PickupPointType[] {
  const types = new Set(PICKUP_POINTS.map((p) => p.type));
  return Array.from(types);
}

export function getNearbyPoints(lat: number, lng: number, radiusKm: number = 5): PickupPoint[] {
  return PICKUP_POINTS.filter((point) => {
    const distance = getDistanceKm(lat, lng, point.latitude, point.longitude);
    return distance <= radiusKm;
  });
}

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}