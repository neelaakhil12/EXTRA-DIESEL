export interface LegalClause {
  id: number;
  title: string;
  desc: string;
}

export const TERMS_AND_CONDITIONS_20: LegalClause[] = [
  {
    id: 1,
    title: '100% Certified BS-VI High-Speed Diesel (HSD)',
    desc: 'All fuel supplied by Extra Diesel is 100% genuine BS-VI grade High-Speed Diesel sourced directly from authorized public oil marketing terminal depots, guaranteeing compliance with national emission and purity benchmarks.',
  },
  {
    id: 2,
    title: 'Legal Metrology Calibrated Flow Meters',
    desc: 'Every mobile fuel bowser is outfitted with automated positive displacement electronic flow meters duly calibrated, verified, and stamped by the Department of Legal Metrology (Weights & Measures) with an accuracy tolerance within ±0.1%.',
  },
  {
    id: 3,
    title: 'Government Stamped Smart Dispensing',
    desc: 'Our dispensing units operate via tamper-proof microprocessors that initiate and stop fuel flow automatically upon reaching the ordered quantity, eliminating human error and manual meter manipulation.',
  },
  {
    id: 4,
    title: 'Minimum Order Quantity (MOQ)',
    desc: 'The minimum delivery volume per doorstep transaction is 100 Liters. Extra Diesel reserves the right to decline or reschedule orders submitted below this threshold.',
  },
  {
    id: 5,
    title: 'Free Delivery Threshold & Transparent Charges',
    desc: 'Doorstep deliveries for volumes of 200 Liters and above enjoy zero delivery charges. Orders below 200 Liters are subject to standard nominal logistic charges clearly displayed before payment checkout.',
  },
  {
    id: 6,
    title: 'Authorized Receptor Fueling Only',
    desc: 'Diesel will be dispensed directly into approved machinery fuel tanks, stationary Diesel Generator (DG) sets, commercial vehicle fuel tanks, agricultural equipment, or authorized storage tanks.',
  },
  {
    id: 7,
    title: 'Strict Prohibition of Loose Containers',
    desc: 'Under strict safety regulations and statutory petroleum norms, dispensing fuel into open buckets, plastic jerry cans, unapproved drums, or glass bottles is strictly forbidden.',
  },
  {
    id: 8,
    title: 'Mandatory Static Earthing & Bonding',
    desc: 'Before dispensing commencement, our certified bowser crew will attach a heavy-duty copper static earthing clip to the customer receptor to dissipate hazardous electrostatic charges.',
  },
  {
    id: 9,
    title: '15-Meter Hazardous Exclusion Safety Zone',
    desc: 'Customers must maintain a minimum 15-meter clearance around the bowser and intake receptor free from open fires, smoking, welding, naked sparks, or running electrical maintenance during discharge.',
  },
  {
    id: 10,
    title: 'Site Accessibility & Safe Ingress/Egress',
    desc: 'The customer is responsible for ensuring reasonable road width, vertical clearance, and unobstructed safe vehicular access for our smart mobile bowser to enter and exit the delivery premises.',
  },
  {
    id: 11,
    title: 'Authorized Site Representative Presence',
    desc: 'An authorized customer representative must be present at the site during delivery to verify the initial meter reading, inspect density, and sign off the digital delivery receipt.',
  },
  {
    id: 12,
    title: 'On-Site Density & Quality Verification Check',
    desc: 'Customers are entitled to witness an on-site density test using our certified ASTM hydrometer and temperature chart (standard density 820-845 kg/m³ at 15°C) before fuel is discharged.',
  },
  {
    id: 13,
    title: 'Dynamic State-Notified Daily Pricing',
    desc: 'Fuel rates are tied strictly to state-notified retail oil marketing prices. The per-liter rate locked at the exact timestamp of order placement remains firm for that order regardless of intraday terminal price shifts.',
  },
  {
    id: 14,
    title: 'Secure PCI-DSS Compliant Payment Gateway',
    desc: 'All online digital transactions via UPI, Credit/Debit cards, Net Banking, and corporate wallets are processed through RBI-authorized, 128-bit encrypted Razorpay payment gateways.',
  },
  {
    id: 15,
    title: 'Instant GST Compliant Tax Invoices',
    desc: 'Upon successful delivery, an authentic, digitally verifiable 100% GST tax invoice is generated with customer GSTIN, HSN code, state tax breakdown, and vehicle meter telemetry for corporate input tax credit.',
  },
  {
    id: 16,
    title: 'Automated Printed Meter Slip',
    desc: 'Our onboard micro-printer issues a physical or digital dispensing slip recording start reading, end reading, total net volume dispensed, time stamp, and bowser vehicle number.',
  },
  {
    id: 17,
    title: 'Free Cancellation Prior to Terminal Dispatch',
    desc: 'Customers may cancel an order free of charge at any time prior to the bowser departing the hub depot terminal. Once marked "Out for Delivery", nominal transit restocking fees may apply.',
  },
  {
    id: 18,
    title: 'Spill Prevention & Environmental Containment',
    desc: 'All bowsers carry dry-break automatic shut-off dispensing nozzles, emergency shut-down switches, non-sparking hoses, and absorbent chemical spill containment kits to safeguard the environment.',
  },
  {
    id: 19,
    title: 'Recurring Subscription & Slot Rescheduling',
    desc: 'Corporate and DG set subscription refill schedules can be paused, modified, or canceled up to 4 hours prior to the designated delivery time slot through the Extra Diesel application.',
  },
  {
    id: 20,
    title: '24/7 Operations Control & Dispute Resolution',
    desc: 'Any operational dispute, delivery variance, or fueling query is subject to review by our 24x7 Central Dispatch Control Room with GPS audit trails and meter logs within Hyderabad jurisdiction.',
  },
];

export const PRIVACY_POLICY_20: LegalClause[] = [
  {
    id: 1,
    title: 'Commitment to User Data Privacy',
    desc: 'Extra Diesel ("we", "our", "us") respects your privacy and is firmly committed to protecting the personal, financial, and organizational data collected through our mobile and web applications.',
  },
  {
    id: 2,
    title: 'Information Collected at Registration',
    desc: 'When you create an account, we collect your full name, mobile telephone number, email address, company or business name, and optional GSTIN for tax invoice generation.',
  },
  {
    id: 3,
    title: 'Precise Geolocation & Site Address Data',
    desc: 'With your explicit device permission, we collect precise GPS coordinates and physical site addresses (including door numbers, colony names, and landmarks) solely to navigate delivery bowsers to your receptor.',
  },
  {
    id: 4,
    title: 'Equipment & Receptor Details',
    desc: 'We store equipment metadata you provide (such as DG set kVA capacity, machinery fleet type, or commercial vehicle numbers) to ensure appropriate bowser hose fittings and delivery safety.',
  },
  {
    id: 5,
    title: 'Zero Card / Banking Data Storage',
    desc: 'Extra Diesel does not store, process, or retain credit card numbers, debit card PINs, CVV codes, or net banking passwords. All payment transactions are handled directly by PCI-DSS Level 1 certified Razorpay.',
  },
  {
    id: 6,
    title: 'Purpose of Personal Data Utilization',
    desc: 'Collected information is used exclusively to process fuel orders, route bowsers, generate legally compliant GST invoices, verify customer accounts via OTP, and deliver transaction push notifications.',
  },
  {
    id: 7,
    title: 'Transactional SMS & Push Notifications',
    desc: 'We use your mobile phone number and device tokens to send critical real-time status alerts: order confirmation, bowser dispatch, captain arrival notifications, and OTP verification codes.',
  },
  {
    id: 8,
    title: 'Restricted Data Sharing with Delivery Captains',
    desc: 'Our assigned bowser captain receives only your site destination address, contact phone number, and requested fuel volume necessary to fulfill the delivery. Captains have no access to your financial or billing records.',
  },
  {
    id: 9,
    title: 'No Sale or Commercial Renting of Data',
    desc: 'Extra Diesel has a strict zero-spam policy: we do not sell, rent, trade, or monetize your personal information or ordering history to third-party marketing agencies or advertisers under any circumstance.',
  },
  {
    id: 10,
    title: 'Enterprise-Grade Data Encryption (SSL/TLS)',
    desc: 'All communications between our mobile application, cloud web application, and backend databases are encrypted using modern Transport Layer Security (TLS 1.3) with SHA-256 SSL certificates.',
  },
  {
    id: 11,
    title: 'Secure Cloud Infrastructure',
    desc: 'Our servers are securely hosted on Amazon Web Services (AWS) infrastructure within secure Indian virtual private cloud (VPC) availability zones featuring strict firewall and access control policies.',
  },
  {
    id: 12,
    title: 'Statutory GST & Legal Compliance Archival',
    desc: 'In compliance with Indian tax laws, commercial purchase invoices and delivery fulfillment records are retained securely for the statutory period required by the Goods and Services Tax (GST) Act.',
  },
  {
    id: 13,
    title: 'Local Device Session Storage',
    desc: 'We use secure device storage (AsyncStorage / LocalStorage) to keep you logged into the application securely on your trusted device and to save your preferred delivery site locations locally.',
  },
  {
    id: 14,
    title: 'Device Permissions & User Control',
    desc: 'The application may request device permissions for Location (to pinpoint site destination) and Notifications (for live order status). You may revoke these permissions at any time in device system settings.',
  },
  {
    id: 15,
    title: 'User Rights to Access & Update Profile',
    desc: 'You have full rights to access, review, modify, or update your personal profile details, contact telephone number, business GSTIN, and saved delivery sites at any time through the "My Account" screen.',
  },
  {
    id: 16,
    title: 'Account Deletion & Data Purge',
    desc: 'Users may request complete account deactivation and removal of personal identifiers by writing to our support desk. Non-tax audit records will be purged from our active operational databases.',
  },
  {
    id: 17,
    title: 'Third-Party Map Services Integration',
    desc: 'When using map-assisted location lookups, anonymized geographic coordinate strings are transmitted to OpenStreetMap / Mapbox reverse-geocoding engines strictly to resolve street and colony names.',
  },
  {
    id: 18,
    title: 'Cookies & Analytical Telemetry',
    desc: 'Our web platform uses essential functional cookies and performance telemetry to monitor API uptime, application load speed, and server health. No tracking cookies are shared with ad networks.',
  },
  {
    id: 19,
    title: 'Policy Revisions & Transparency',
    desc: 'Any updates or regulatory amendments to our Privacy Policy will be reflected immediately within the application footer and profile center, with significant policy updates notified via in-app alert.',
  },
  {
    id: 20,
    title: 'Data Protection Officer & Grievance Contact',
    desc: 'For questions, privacy grievances, or data requests regarding this Privacy Policy, contact our Grievance Officer at legal@extradiesel.in or call our Hyderabad Central Operations Control at 1800-343-7353.',
  },
];
