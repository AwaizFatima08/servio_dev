// ─────────────────────────────────────────
// constants.js — Servio Controlled Vocabulary
// HomiLabs | Servio
// Convention: camelCase throughout
// NEVER use raw strings in code — always reference this file
// ─────────────────────────────────────────

const TENANTS = { FFL: 'ffl' };

const DEPLOYMENT_MODELS = {
  CLOSED_ORG: 'closed_org',
  OTHER_ORG:  'other_org',
  COMMERCIAL: 'commercial',
};

const ROLES = {
  SUPER_ADMIN:         'super_admin',
  ADMIN:               'admin',
  MANAGER:             'manager',
  MESS_SUPERVISOR:     'mess_supervisor',
  CAFE_SUPERVISOR:     'cafe_supervisor',
  ACCOUNTS_SUPERVISOR: 'accounts_supervisor',
  GH_SUPERVISOR:       'gh_supervisor',
  BOQ_SUPERVISOR:      'boq_supervisor',
  STORE_SUPERVISOR:    'store_supervisor',
  PURCHASER:           'purchaser',
  CUSTOMER:            'customer',
};

const ACCOUNT_STATUS = {
  PENDING:  'pending',
  ACTIVE:   'active',
  REJECTED: 'rejected',
  DISABLED: 'disabled',
};

const EDIT_REQUEST_STATUS = {
  PENDING:  'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const EMPLOYEE_PREFIXES = { FFL: 'FFL', FAS: 'FAS', OSL: 'OSL', ESB: 'ESB' };

const GRADES = [
  'MT1','MT2','MT3','MT4','MT5','MT6',
  'M5','M6','M7','M8','M9','M9A',
  'M10','M11','M11A','M12','M12A','M13',
];

const RESIDENCY_TYPES = { BOQ: 'boq', GH: 'gh', TOWNSHIP: 'township' };

const COMMUNITY_GROUPS = { MANAGEMENT: 'management' };

const MEMBER_TYPES = {
  ENTITLED_FAMILY:          'entitled_family',
  PERMANENT_RESIDENT_GUEST: 'permanent_resident_guest',
  VISITING_GUEST:           'visiting_guest',
};

const GUEST_CATEGORIES = { BLOOD_RELATIVE: 'blood_relative', OTHER: 'other' };

const FAMILY_RELATIONS = {
  SPOUSE:   'spouse',
  SON:      'son',
  DAUGHTER: 'daughter',
  PARENT:   'parent',
  IN_LAW:   'in_law',
  OTHER:    'other',
};

const SERVICE_TYPES = {
  MESS:      'mess',
  CAFE:      'cafe',
  BBQ:       'bbq',
  BAKERY:    'bakery',
  TUCK_SHOP: 'tuck_shop',
  TEA_BAR:   'tea_bar',
};

const MEAL_TYPES = { BREAKFAST: 'breakfast', LUNCH: 'lunch', DINNER: 'dinner' };

const BOOKING_MODES = { SELF: 'self', PROXY: 'proxy', STAFF: 'staff' };

const DINING_MODES = { DINE_IN: 'dine_in', TAKEAWAY: 'takeaway' };

const RESERVATION_STATUS = {
  PENDING:   'pending',
  CONFIRMED: 'confirmed',
  ISSUED:    'issued',
  CANCELLED: 'cancelled',
  NO_SHOW:   'no_show',
};

const ORDER_STATUS = {
  PLACED:    'placed',
  PREPARING: 'preparing',
  READY:     'ready',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

const PORTION_TYPES = { SINGLE: 'single', HALF: 'half', FULL: 'full' };

const BASE_UNITS = { PIECE: 'piece', ML: 'ml', G: 'g', KG: 'kg' };

const BILLING_DESTINATIONS = {
  EMPLOYEE_ACCOUNT: 'employee_account',
  OFFICIAL_ACCOUNT: 'official_account',
};

const RATE_MODES  = { POST_SERVICE: 'post_service', STANDING: 'standing' };
const RATE_STATUS = { PENDING: 'pending', ENTERED: 'entered', APPLIED: 'applied' };

const NOTIFICATION_TYPES = {
  BOOKING_CONFIRMED:     'booking_confirmed',
  BOOKING_CANCELLED:     'booking_cancelled',
  MEAL_ISSUED:           'meal_issued',
  ORDER_READY:           'order_ready',
  BILL_AVAILABLE:        'bill_available',
  EVENT_PUBLISHED:       'event_published',
  REGISTRATION_APPROVED: 'registration_approved',
  BROADCAST:             'broadcast',
};

const NOTIFICATION_STATUS = { UNREAD: 'unread', READ: 'read' };

const EVENT_TYPES  = { OFFICIAL: 'official', PERSONAL: 'personal' };

const EVENT_STATUS = {
  DRAFT:     'draft',
  PUBLISHED: 'published',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const ATTENDANCE_STATUS = { PENDING: 'pending', ACCEPTED: 'accepted', DECLINED: 'declined' };
const FEEDBACK_STATUS   = { SUBMITTED: 'submitted', REVIEWED: 'reviewed' };
const RETURN_STATUS     = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' };

const BLOOD_GROUPS   = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const MARITAL_STATUS = { SINGLE: 'single', MARRIED: 'married' };
const GENDER         = { MALE: 'male', FEMALE: 'female' };

// ── COLLECTIONS ──────────────────────────────────────────────────────────────
// Single source of truth — must match Firestore collection names exactly
// Convention: camelCase
const COLLECTIONS = {
  USERS:                      'users',
  REGISTRATION_REQUESTS:      'registrationRequests',
  EMPLOYEES:                  'employees',
  EMPLOYEE_PROFILES:          'employeeProfiles',
  MENU_ITEMS:                 'menuItems',
  FOOD_TYPES:                 'foodTypes',
  MEAL_TYPES:                 'mealTypes',
  WEEKLY_MENU_TEMPLATES:      'weeklyMenuTemplates',
  MENU_CYCLES:                'menuCycles',
  DAILY_MENUS:                'dailyMenus',
  RESERVATION_SETTINGS:       'reservationSettings',
  MEAL_RESERVATIONS:          'mealReservations',
  MEAL_RATES:                 'mealRates',
  MEAL_FEEDBACK:              'mealFeedback',
  NOTIFICATIONS:              'notifications',
  NOTIFICATION_DELIVERIES:    'notificationDeliveries',
  EVENTS:                     'events',
  EVENT_NOTE_TEMPLATES:       'eventNoteTemplates',
  EVENT_ATTENDANCE_RESPONSES: 'eventAttendanceResponses',
  EVENT_ATTENDANCE_SUMMARIES: 'eventAttendanceSummaries',
};

module.exports = {
  TENANTS, DEPLOYMENT_MODELS, ROLES, ACCOUNT_STATUS, EDIT_REQUEST_STATUS,
  EMPLOYEE_PREFIXES, GRADES, RESIDENCY_TYPES, COMMUNITY_GROUPS,
  MEMBER_TYPES, GUEST_CATEGORIES, FAMILY_RELATIONS, SERVICE_TYPES,
  MEAL_TYPES, BOOKING_MODES, DINING_MODES, RESERVATION_STATUS, ORDER_STATUS,
  PORTION_TYPES, BASE_UNITS, BILLING_DESTINATIONS, RATE_MODES, RATE_STATUS,
  NOTIFICATION_TYPES, NOTIFICATION_STATUS, EVENT_TYPES, EVENT_STATUS,
  ATTENDANCE_STATUS, FEEDBACK_STATUS, RETURN_STATUS,
  BLOOD_GROUPS, MARITAL_STATUS, GENDER, COLLECTIONS,
};
