// ─────────────────────────────────────────
// constants.js — Servio Controlled Vocabulary
// HomiLabs | Servio
// Convention: camelCase throughout
// Schema Reference: Servio_V1_Schema_Reference.docx
// NEVER use raw strings in code — always reference this file
// ─────────────────────────────────────────

const TENANTS = { FFL: 'ffl' };

const DEPLOYMENT_MODELS = {
  CLOSED_ORG:      'closed_org',
  OPEN_COMMERCIAL: 'open_commercial',
};

const ROLES = {
  SUPER_ADMIN:                     'super_admin',
  ADMIN:                           'admin',
  MANAGER:                         'manager',
  MESS_SUPERVISOR:                 'mess_supervisor',
  CAFE_BAKERY_TUCKSHOP_SUPERVISOR: 'cafe_bakery_tuckshop_supervisor',
  ACCOUNTS_SUPERVISOR:             'accounts_supervisor',
  GH_SUPERVISOR:                   'gh_supervisor',
  BOQ_SUPERVISOR:                  'boq_supervisor',
  STORE_SUPERVISOR:                'store_supervisor',
  PURCHASER:                       'purchaser',
  SPORTS_SUPERVISOR:               'sports_supervisor',
  EMPLOYEE:                        'employee',
};

const ACCOUNT_STATUS = {
  ACTIVE:    'active',
  INACTIVE:  'inactive',
  SUSPENDED: 'suspended',
};

const REGISTRATION_STATUS = {
  PENDING:           'pending',
  ACTIVATED:         'activated',
  FAILED_VALIDATION: 'failed_validation',
  FAILED_DUPLICATE:  'failed_duplicate',
  FAILED_INACTIVE:   'failed_inactive',
  FAILED_THROTTLED:  'failed_throttled',
  ADMIN_CREATED:     'admin_created',
};

const FAILURE_REASONS = {
  EMPLOYEE_NOT_FOUND: 'employee_not_found',
  CNIC_MISMATCH:      'cnic_mismatch',
  DOB_MISMATCH:       'dob_mismatch',
  ACCOUNT_EXISTS:     'account_exists',
  EMPLOYEE_INACTIVE:  'employee_inactive',
  THROTTLE_EXCEEDED:  'throttle_exceeded',
};

const EMPLOYEE_TYPES = {
  MANAGEMENT:  'management',
  CONTRACTUAL: 'contractual',
};

const EMPLOYEE_PREFIXES = { FFL: 'FFL', FAS: 'FAS', OSL: 'OSL', ESB: 'ESB', CLB: 'CLB' };

// Grade reference — used for validation only, not exported as controlled vocabulary
const GRADES = [
  'MT1','MT2','MT3','MT4','MT5','MT6',
  'M5','M6','M7','M8','M9','M9A',
  'M10','M11','M11A','M12','M12A','M13',
];

const RESIDENCE_TYPES = {
  BOQ:        'boq',
  MOQ:        'moq',
  GUEST_HOUSE:'guest_house',
  A:          'a',
  B:          'b',
  B_MODIFIED: 'b_modified',
  C:          'c',
  D_PLUS:     'd_plus',
  D:          'd',
  E:          'e',
  E_MODIFIED: 'e_modified',
};

const DEFAULT_VIEWS  = { EMPLOYEE: 'employee', OPERATIONAL: 'operational' };
const ACCOUNT_TYPES  = { SELF_SIGNUP: 'self_signup', ADMIN_CREATED: 'admin_created' };

const MEMBER_RELATIONS = {
  SPOUSE:   'spouse',
  SON:      'son',
  DAUGHTER: 'daughter',
};

const OFFICIAL_ACCOUNT_TYPES = {
  DEPARTMENTAL:   'departmental',
  PLANT_SITE:     'plant_site',
  OFFICIAL_GUEST: 'official_guest',
  EVENTS:         'events',
};

const FOOD_TYPE_CODES = {
  BBQ:      'BBQ',
  BREAD:    'BREAD',
  BEV_HOT:  'BEV_HOT',
  BEV_COLD: 'BEV_COLD',
  DAIRY:    'DAIRY',
  DESS:     'DESS',
  COND:     'COND',
  SNACK:    'SNACK',
  BAKED:    'BAKED',
  VEG:      'VEG',
  NVEG:     'NVEG',
};

const MEAL_TYPE_CODES = {
  BREAKFAST: 'breakfast',
  LUNCH:     'lunch',
  DINNER:    'dinner',
  CAFE:      'cafe',
  BBQ:       'bbq',
  TUCKSHOP:  'tuckshop',
  BAKERY:    'bakery',
  TEABAR:    'teabar',
};

const ITEM_TYPES = { COMBO: 'combo', INDIVIDUAL: 'individual' };

const SERVICE_CATEGORIES = {
  BF_COMBO:         'bf_combo',
  BF_ALACARTE:      'bf_alacarte',
  MESS_COMBO:       'mess_combo',
  MESS_ALACARTE:    'mess_alacarte',
  CAFE:             'cafe',
  TUCKSHOP_FIXED:   'tuckshop_fixed',
  TUCKSHOP_WEEKLY:  'tuckshop_weekly',
  BBQ:              'bbq',
  BAKERY_SCHEDULED: 'bakery_scheduled',
  BAKERY_PREORDER:  'bakery_preorder',
  TEABAR:           'teabar',
  BEVERAGE:         'beverage',
};

const RATE_TYPES        = { RETROSPECTIVE: 'retrospective', PREDEFINED: 'predefined' };
const RATE_MODES        = { RETROSPECTIVE: 'retrospective', RATE_CHANGE: 'rate_change' };
const RATE_STATUS       = { ENTERED: 'entered', APPLIED: 'applied', REVISED: 'revised' };
const RATE_ENTRY_STATUS = { PENDING: 'pending', PARTIAL: 'partial', COMPLETE: 'complete' };

const MENU_MODES = {
  ALACARTE:       'alacarte',
  CYCLE_BASED:    'cycle_based',
  EVENT_BASED:    'event_based',
  SCHEDULE_BASED: 'schedule_based',
};

const DISPLAY_STYLES = { LIST: 'list', RESTAURANT: 'restaurant' };
const CYCLE_STATUS   = { DRAFT: 'draft', ACTIVE: 'active', CLOSED: 'closed' };

const BOOKING_SOURCES = {
  SELF:     'self',
  PROXY:    'proxy',
  WALK_IN:  'walk_in',
  OFFICIAL: 'official',
  SPECIAL:  'special',
};

const SUBJECT_TYPES = {
  SELF:           'self',
  PERSONAL_GUEST: 'personal_guest',
  OFFICIAL_GUEST: 'official_guest',
  OFFICIAL_MEAL:  'official_meal',
  SPECIAL_MEAL:   'special_meal',
};

const MENU_OPTION_KEYS = {
  COMBO_1:  'combo_1',
  COMBO_2:  'combo_2',
  COMBO_3:  'combo_3',
  ALACARTE: 'alacarte',
};

const DINING_MODES    = { DINE_IN: 'dine_in', TAKEAWAY: 'takeaway' };
const SELECTION_MODES = { COMBO: 'combo', ALACARTE: 'alacarte' };

const BILLING_DESTINATIONS = {
  EMPLOYEE_ACCOUNT: 'employee_account',
  OFFICIAL_ACCOUNT: 'official_account',
};

const RESERVATION_STATUS = { ACTIVE: 'active', CANCELLED: 'cancelled' };
const ISSUE_STATUS       = { PENDING: 'pending', ISSUED: 'issued', NO_SHOW: 'no_show' };

const FEEDBACK_STATUS = {
  PENDING:        'pending',
  SUBMITTED:      'submitted',
  NOT_APPLICABLE: 'not_applicable',
};

const CANCELLATION_REASONS = {
  EMPLOYEE_REQUEST: 'employee_request',
  EMPLOYEE_ABSENT:  'employee_absent',
  OFFICIAL_DUTY:    'official_duty',
  MEDICAL:          'medical',
  DATA_CORRECTION:  'data_correction',
  OTHER:            'other',
};

const FEEDBACK_AREAS_MEAL = {
  QUALITY:  'quality',
  QUANTITY: 'quantity',
  AMBIENCE: 'ambience',
  RATE:     'rate',
  SERVICE:  'service',
  OVERALL:  'overall',
};

const EVENT_TYPES = { OFFICIAL: 'official', PERSONAL: 'personal' };

const EVENT_CATEGORIES_OFFICIAL = {
  ANNUAL_DINNER:    'annual_dinner',
  NATIONAL_DAY:     'national_day',
  SPORTS_DAY:       'sports_day',
  FAREWELL:         'farewell',
  WELCOME:          'welcome',
  COMPANY_FUNCTION: 'company_function',
  OTHER_OFFICIAL:   'other_official',
};

const EVENT_CATEGORIES_PERSONAL = {
  BIRTHDAY:       'birthday',
  WEDDING:        'wedding',
  ENGAGEMENT:     'engagement',
  GATHERING:      'gathering',
  OTHER_PERSONAL: 'other_personal',
};

const EVENT_STATUS_OFFICIAL = {
  DRAFT:          'draft',
  PENDING_REVIEW: 'pending_review',
  RETURNED:       'returned',
  PUBLISHED:      'published',
  CLOSED:         'closed',
  CANCELLED:      'cancelled',
};

const EVENT_STATUS_PERSONAL = {
  DRAFT:            'draft',
  PENDING_APPROVAL: 'pending_approval',
  RETURNED:         'returned',
  APPROVED:         'approved',
  CONFIRMED:        'confirmed',
  CLOSED:           'closed',
  CANCELLED:        'cancelled',
};

const TARGET_SCOPES = {
  ALL_EMPLOYEES: 'all_employees',
  SELECTED:      'selected',
  HOST_MANAGED:  'host_managed',
};

const ATTENDANCE_STATUS = {
  ATTENDING:     'attending',
  NOT_ATTENDING: 'not_attending',
  PENDING:       'pending',
};

const EVENT_RATE_COMPONENTS = {
  FOOD_ITEM: 'food_item',
  MAN_HOURS: 'man_hours',
  DECOR:     'decor',
};

const FEEDBACK_AREAS_EVENT_ATTENDED = {
  FOOD_QUALITY: 'food_quality',
  SERVICE:      'service',
  DECOR:        'decor',
  VENUE:        'venue',
  OVERALL:      'overall',
};

const FEEDBACK_AREAS_EVENT_NOT_ATTENDED = {
  COMMUNICATION: 'communication',
  ORGANISATION:  'organisation',
  OVERALL:       'overall',
};

const FEEDBACK_REVIEW_STATUS = {
  OPEN:        'open',
  REVIEWED:    'reviewed',
  ACTION_TAKEN:'action_taken',
};

const NOTIFICATION_LAYERS = {
  TRANSACTIONAL: 'transactional',
  INFORMATIONAL: 'informational',
  ALERT:         'alert',
};

const NOTIFICATION_TARGET_TYPES = {
  SINGLE_USER:   'single_user',
  ROLE:          'role',
  ALL_EMPLOYEES: 'all_employees',
  ADMIN_ONLY:    'admin_only',
};

const NOTIFICATION_STATUS = { PENDING: 'pending', PUBLISHED: 'published', FAILED: 'failed' };

const NOTIFICATION_TYPES_IDENTITY = {
  ACCOUNT_ACTIVATED:       'account_activated',
  ROLE_CHANGED:            'role_changed',
  PROFILE_CHANGE_APPROVED: 'profile_change_approved',
  PROFILE_CHANGE_REJECTED: 'profile_change_rejected',
  ACCOUNT_DEACTIVATED:     'account_deactivated',
};

const NOTIFICATION_TYPES_MESS = {
  BOOKING_CONFIRMED:       'booking_confirmed',
  BOOKING_CANCELLED_SELF:  'booking_cancelled_self',
  BOOKING_CANCELLED_PROXY: 'booking_cancelled_proxy',
  BOOKING_ISSUED:          'booking_issued',
  CUTOFF_REMINDER:         'cutoff_reminder',
};

const NOTIFICATION_TYPES_EVENTS = {
  EVENT_PUBLISHED:         'event_published',
  EVENT_RESPONSE_REMINDER: 'event_response_reminder',
  EVENT_CUTOFF_PASSED:     'event_response_cutoff_passed',
  EVENT_CANCELLED:         'event_cancelled',
  EVENT_FEEDBACK_PROMPT:   'event_feedback_prompt',
};

const NOTIFICATION_TYPES_BILLING = {
  RATE_ENTRY_PENDING:     'rate_entry_pending',
  MONTHLY_BILL_AVAILABLE: 'monthly_bill_available',
};

const NOTIFICATION_TYPES_ADMIN = {
  NEW_SIGNUP:             'new_signup',
  PENDING_PROFILE_CHANGE: 'pending_profile_change',
  REGISTRATION_FAILED:    'registration_failed',
  THROTTLE_TRIGGERED:     'throttle_triggered',
  PENDING_RATE_ENTRY:     'pending_rate_entry',
};

const DELIVERY_STATUS = { DELIVERED: 'delivered', FAILED: 'failed', PENDING: 'pending' };
const IN_APP_STATUS   = { PENDING: 'pending', DELIVERED: 'delivered', FAILED: 'failed' };
const REVIEW_STATUS   = { NOT_REQUIRED: 'not_required', PENDING: 'pending', APPROVED: 'approved' };

const REPORT_TYPES = {
  DAILY_HEADCOUNT:          'daily_headcount',
  WEEKLY_BOOKING_SUMMARY:   'weekly_booking_summary',
  MONTHLY_BILLING_EMPLOYEE: 'monthly_billing_employee',
  MONTHLY_BILLING_OFFICIAL: 'monthly_billing_official',
  MONTHLY_BILLING_SUMMARY:  'monthly_billing_summary',
  FEEDBACK_TRENDS:          'feedback_trends',
  EVENT_SUMMARY:            'event_summary',
  ADMIN_ALERTS_SUMMARY:     'admin_alerts_summary',
};

const PERIOD_TYPES = { DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly' };

// ── COLLECTIONS ──────────────────────────────────────────────────────────────
// Single source of truth — must match Firestore collection names exactly
// Convention: camelCase — 28 collections across 6 layers
const COLLECTIONS = {
  // Identity & Governance (6)
  DEPLOYMENT_CONFIG:           'deploymentConfig',
  EMPLOYEES:                   'employees',
  USERS:                       'users',
  REGISTRATION_REQUESTS:       'registrationRequests',
  FAMILY_MEMBERS:              'familyMembers',
  OFFICIAL_ACCOUNTS:           'officialAccounts',
  // Menu Domain (8)
  FOOD_TYPES:                  'foodTypes',
  MEAL_TYPES:                  'mealTypes',
  MENU_ITEMS:                  'menuItems',
  MESS_WEEKLY_TEMPLATES:       'messWeeklyTemplates',
  MENU_CYCLES:                 'menuCycles',
  DAILY_MENUS:                 'dailyMenus',
  SERVICE_MENU_CONFIGS:        'serviceMenuConfigs',
  BAKERY_SCHEDULE:             'bakerySchedule',
  // Mess Operations (4)
  RESERVATION_SETTINGS:        'reservationSettings',
  MESS_RESERVATIONS:           'messReservations',
  MEAL_RATES:                  'mealRates',
  MEAL_FEEDBACK:               'mealFeedback',
  // Events (6)
  EVENT_NOTE_TEMPLATES:        'eventNoteTemplates',
  EVENTS:                      'events',
  EVENT_ATTENDANCE_RESPONSES:  'eventAttendanceResponses',
  EVENT_ATTENDANCE_SUMMARIES:  'eventAttendanceSummaries',
  EVENT_RATES:                 'eventRates',
  EVENT_FEEDBACK:              'eventFeedback',
  // Notifications (2)
  NOTIFICATIONS:               'notifications',
  NOTIFICATION_DELIVERIES:     'notificationDeliveries',
  // Reporting & Settings (2)
  REPORTING_SNAPSHOTS:         'reportingSnapshots',
  APP_SETTINGS:                'appSettings',
};

module.exports = {
  TENANTS, DEPLOYMENT_MODELS, ROLES, ACCOUNT_STATUS, REGISTRATION_STATUS,
  FAILURE_REASONS, EMPLOYEE_TYPES, EMPLOYEE_PREFIXES, RESIDENCE_TYPES,
  DEFAULT_VIEWS, ACCOUNT_TYPES, MEMBER_RELATIONS, OFFICIAL_ACCOUNT_TYPES,
  FOOD_TYPE_CODES, MEAL_TYPE_CODES, ITEM_TYPES, SERVICE_CATEGORIES,
  RATE_TYPES, RATE_MODES, RATE_STATUS, RATE_ENTRY_STATUS,
  MENU_MODES, DISPLAY_STYLES, CYCLE_STATUS,
  BOOKING_SOURCES, SUBJECT_TYPES, MENU_OPTION_KEYS,
  DINING_MODES, SELECTION_MODES, BILLING_DESTINATIONS,
  RESERVATION_STATUS, ISSUE_STATUS, FEEDBACK_STATUS, CANCELLATION_REASONS,
  FEEDBACK_AREAS_MEAL, EVENT_TYPES, EVENT_CATEGORIES_OFFICIAL,
  EVENT_CATEGORIES_PERSONAL, EVENT_STATUS_OFFICIAL, EVENT_STATUS_PERSONAL,
  TARGET_SCOPES, ATTENDANCE_STATUS, EVENT_RATE_COMPONENTS,
  FEEDBACK_AREAS_EVENT_ATTENDED, FEEDBACK_AREAS_EVENT_NOT_ATTENDED,
  FEEDBACK_REVIEW_STATUS, NOTIFICATION_LAYERS, NOTIFICATION_TARGET_TYPES,
  NOTIFICATION_STATUS, NOTIFICATION_TYPES_IDENTITY, NOTIFICATION_TYPES_MESS,
  NOTIFICATION_TYPES_EVENTS, NOTIFICATION_TYPES_BILLING, NOTIFICATION_TYPES_ADMIN,
  DELIVERY_STATUS, IN_APP_STATUS, REVIEW_STATUS, REPORT_TYPES, PERIOD_TYPES,
  COLLECTIONS,
};