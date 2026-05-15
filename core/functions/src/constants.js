// ─────────────────────────────────────────
// constants.js — Servio Controlled Vocabulary
// HomiLabs | Servio
// ALL status and type fields defined here
// NEVER use raw strings in code — always reference this file
// ─────────────────────────────────────────

// ── TENANT ──────────────────────────────
const TENANTS = {
  FFL: 'ffl',
};

// ── DEPLOYMENT MODELS ───────────────────
const DEPLOYMENT_MODELS = {
  CLOSED_ORG:  'closed_org',
  OTHER_ORG:   'other_org',
  COMMERCIAL:  'commercial',
};

// ── ROLES ───────────────────────────────
const ROLES = {
  SUPER_ADMIN:          'super_admin',
  ADMIN:                'admin',
  MANAGER:              'manager',
  MESS_SUPERVISOR:      'mess_supervisor',
  CAFE_SUPERVISOR:      'cafe_supervisor',
  ACCOUNTS_SUPERVISOR:  'accounts_supervisor',
  GH_SUPERVISOR:        'gh_supervisor',
  BOQ_SUPERVISOR:       'boq_supervisor',
  STORE_SUPERVISOR:     'store_supervisor',
  PURCHASER:            'purchaser',
  CUSTOMER:             'customer',
};

// ── REGISTRATION & ACCOUNT STATUS ───────
const ACCOUNT_STATUS = {
  PENDING:   'pending',
  ACTIVE:    'active',
  REJECTED:  'rejected',
  DISABLED:  'disabled',
};

// ── EDIT REQUEST STATUS ──────────────────
const EDIT_REQUEST_STATUS = {
  PENDING:  'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// ── EMPLOYEE PREFIXES ────────────────────
const EMPLOYEE_PREFIXES = {
  FFL: 'FFL',
  FAS: 'FAS',
  OSL: 'OSL',
  ESB: 'ESB',
};

// ── GRADES ───────────────────────────────
const GRADES = [
  'MT1','MT2','MT3','MT4','MT5','MT6',
  'M5','M6','M7','M8','M9','M9A',
  'M10','M11','M11A','M12','M12A','M13',
];

// ── RESIDENCY TYPES ──────────────────────
const RESIDENCY_TYPES = {
  BOQ:      'boq',
  GH:       'gh',
  TOWNSHIP: 'township',
};

// ── COMMUNITY GROUPS ─────────────────────
const COMMUNITY_GROUPS = {
  MANAGEMENT: 'management',
};

// ── FAMILY MEMBER TYPES ──────────────────
const MEMBER_TYPES = {
  ENTITLED_FAMILY:          'entitled_family',
  PERMANENT_RESIDENT_GUEST: 'permanent_resident_guest',
  VISITING_GUEST:           'visiting_guest',
};

// ── GUEST CATEGORIES ─────────────────────
const GUEST_CATEGORIES = {
  BLOOD_RELATIVE: 'blood_relative',
  OTHER:          'other',
};

// ── FAMILY RELATIONS ─────────────────────
const FAMILY_RELATIONS = {
  SPOUSE:   'spouse',
  SON:      'son',
  DAUGHTER: 'daughter',
  PARENT:   'parent',
  IN_LAW:   'in_law',
  OTHER:    'other',
};

// ── SERVICE TYPES ────────────────────────
const SERVICE_TYPES = {
  MESS:      'mess',
  CAFE:      'cafe',
  BBQ:       'bbq',
  BAKERY:    'bakery',
  TUCK_SHOP: 'tuck_shop',
  TEA_BAR:   'tea_bar',
};

// ── MEAL TYPES ───────────────────────────
const MEAL_TYPES = {
  BREAKFAST: 'breakfast',
  LUNCH:     'lunch',
  DINNER:    'dinner',
};

// ── BOOKING MODES ────────────────────────
const BOOKING_MODES = {
  SELF:  'self',
  PROXY: 'proxy',
  STAFF: 'staff',
};

// ── DINING MODES ─────────────────────────
const DINING_MODES = {
  DINE_IN:  'dine_in',
  TAKEAWAY: 'takeaway',
};

// ── RESERVATION STATUS ───────────────────
const RESERVATION_STATUS = {
  PENDING:   'pending',
  CONFIRMED: 'confirmed',
  ISSUED:    'issued',
  CANCELLED: 'cancelled',
  NO_SHOW:   'no_show',
};

// ── ORDER STATUS ─────────────────────────
const ORDER_STATUS = {
  PLACED:    'placed',
  PREPARING: 'preparing',
  READY:     'ready',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

// ── PORTION TYPES ────────────────────────
const PORTION_TYPES = {
  SINGLE: 'single',
  HALF:   'half',
  FULL:   'full',
};

// ── BASE UNITS ───────────────────────────
const BASE_UNITS = {
  PIECE: 'piece',
  ML:    'ml',
  G:     'g',
  KG:    'kg',
};

// ── BILLING DESTINATIONS ─────────────────
const BILLING_DESTINATIONS = {
  EMPLOYEE_ACCOUNT: 'employee_account',
  OFFICIAL_ACCOUNT: 'official_account',
};

// ── RATE MODES ───────────────────────────
const RATE_MODES = {
  POST_SERVICE: 'postService',
  STANDING:     'standing',
};

// ── RATE STATUS ──────────────────────────
const RATE_STATUS = {
  PENDING:  'pending',
  ENTERED:  'entered',
  APPLIED:  'applied',
};

// ── NOTIFICATION TYPES ───────────────────
const NOTIFICATION_TYPES = {
  BOOKING_CONFIRMED:  'booking_confirmed',
  BOOKING_CANCELLED:  'booking_cancelled',
  MEAL_ISSUED:        'meal_issued',
  ORDER_READY:        'order_ready',
  BILL_AVAILABLE:     'bill_available',
  EVENT_PUBLISHED:    'event_published',
  REGISTRATION_APPROVED: 'registration_approved',
  BROADCAST:          'broadcast',
};

// ── NOTIFICATION STATUS ──────────────────
const NOTIFICATION_STATUS = {
  UNREAD: 'unread',
  READ:   'read',
};

// ── EVENT TYPES ──────────────────────────
const EVENT_TYPES = {
  OFFICIAL: 'official',
  PERSONAL: 'personal',
};

// ── EVENT STATUS ─────────────────────────
const EVENT_STATUS = {
  DRAFT:     'draft',
  PUBLISHED: 'published',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// ── ATTENDANCE RESPONSE STATUS ───────────
const ATTENDANCE_STATUS = {
  PENDING:  'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
};

// ── FEEDBACK STATUS ──────────────────────
const FEEDBACK_STATUS = {
  SUBMITTED: 'submitted',
  REVIEWED:  'reviewed',
};

// ── RETURN ITEM STATUS ───────────────────
const RETURN_STATUS = {
  PENDING:  'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// ── BLOOD GROUPS ─────────────────────────
const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

// ── MARITAL STATUS ───────────────────────
const MARITAL_STATUS = {
  SINGLE:  'single',
  MARRIED: 'married',
};

// ── GENDER ───────────────────────────────
const GENDER = {
  MALE:   'male',
  FEMALE: 'female',
};

// ── COLLECTIONS ──────────────────────────
// Single source of truth for collection names
const COLLECTIONS = {
  USERS:                       'users',
  REGISTRATION_REQUESTS:       'registrationRequests',
  PROFILE_EDIT_REQUESTS:       'profileEditRequests',
  DEPLOYMENT_CONFIG:           'deploymentConfig',
  EMPLOYEES:                   'employees',
  FAMILY_MEMBERS:              'familyMembers',
  MENU_ITEMS:                  'menuItems',
  FOOD_TYPES:                  'foodTypes',
  MEAL_TYPES:                  'mealTypes',
  WEEKLY_MENU_TEMPLATES:       'weeklyMenuTemplates',
  MENU_CYCLES:                 'menuCycles',
  DAILY_MENUS:                 'dailyMenus',
  SERVICE_SCHEDULES:           'serviceSchedules',
  SERVICE_LOCATIONS:           'serviceLocations',
  RESERVATION_SETTINGS:        'reservationSettings',
  MEAL_RESERVATIONS:           'mealReservations',
  OFFICIAL_MEAL_ORDERS:        'officialMealOrders',
  TABLE_RESERVATIONS:          'tableReservations',
  ORDERS:                      'orders',
  RETURN_ITEMS:                'returnItems',
  RATES:                       'rates',
  BILLING:                     'billing',
  CHARGE_ACCOUNTS:             'chargeAccounts',
  NOTIFICATIONS:               'notifications',
  NOTIFICATION_DELIVERIES:     'notificationDeliveries',
  FEEDBACK:                    'feedback',
  EVENTS:                      'events',
  EVENT_NOTE_TEMPLATES:        'eventNoteTemplates',
  EVENT_ATTENDANCE_RESPONSES:  'eventAttendanceResponses',
  EVENT_ATTENDANCE_SUMMARIES:  'eventAttendanceSummaries',
};

module.exports = {
  TENANTS,
  DEPLOYMENT_MODELS,
  ROLES,
  ACCOUNT_STATUS,
  EDIT_REQUEST_STATUS,
  EMPLOYEE_PREFIXES,
  GRADES,
  RESIDENCY_TYPES,
  COMMUNITY_GROUPS,
  MEMBER_TYPES,
  GUEST_CATEGORIES,
  FAMILY_RELATIONS,
  SERVICE_TYPES,
  MEAL_TYPES,
  BOOKING_MODES,
  DINING_MODES,
  RESERVATION_STATUS,
  ORDER_STATUS,
  PORTION_TYPES,
  BASE_UNITS,
  BILLING_DESTINATIONS,
  RATE_MODES,
  RATE_STATUS,
  NOTIFICATION_TYPES,
  NOTIFICATION_STATUS,
  EVENT_TYPES,
  EVENT_STATUS,
  ATTENDANCE_STATUS,
  FEEDBACK_STATUS,
  RETURN_STATUS,
  BLOOD_GROUPS,
  MARITAL_STATUS,
  GENDER,
  COLLECTIONS,
};
