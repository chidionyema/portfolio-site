/**
 * Honesty contract — copy that flips when the backend is wired.
 * See docs/UI_FEATURES_PLAN.md §0.2.
 */

export const BACKEND_LIVE = true;

/**
 * Cluster identifier displayed in console-style labels across the site
 * ("Cluster_Healthy // {CLUSTER_LABEL}", "Region: {CLUSTER_LABEL}", etc.).
 * Set PUBLIC_CLUSTER_LABEL in your env to claim a real region/cluster id;
 * otherwise the label degrades to "demo_cluster" so unrelated visitors
 * don't read a region claim that isn't backed by anything.
 */
export const CLUSTER_LABEL = import.meta.env.PUBLIC_CLUSTER_LABEL || 'demo_cluster';

export const HERO_PRIMARY_CTA = 'Interact with Live Cluster';

export const DEMO_SECTION_HEADING = 'Live Infrastructure Modules';

export const DEMO_SECTION_SUBHEAD = 'This is not a simulation. Every interaction triggers a real command in our .NET 9 microservices cluster. Monitor the system\'s reaction in real-time via SignalR telemetry.';

export const DEMO_FOOTER = `All commands target endpoints on the ${CLUSTER_LABEL} cluster.`;

export const CHECKOUT_COPY = {
  ORDER_HEADER: 'Your order',
  PAY_IDLE: 'Pay £39.99',
  PAY_RESERVING: 'Reserving your items…',
  PAY_CONFIRMING: 'Confirming payment…',
  PAY_COMPLETING: 'Completing order…',
  PAY_DONE_PREFIX: 'Order', // followed by '#ABC-123 confirmed'
  FAIL_SOLD_OUT: 'Sorry — Demo Widget just sold out',
  FAIL_CARD_DECLINED: 'Card declined — your items are released',
  RECEIPT_HEADER: 'Order confirmed',
  RECEIPT_EMAIL_LINE: "We'll email you a receipt at demo@haworks.dev",
  RECEIPT_VIEW_LINK: 'View order details',
  RECEIPT_VIEW_TOOLTIP: 'Demo only — there is no real order page',
  RUN_ANOTHER: 'Run another',
  ENGINEERING_HEADER: 'Server events',
  COMPENSATION_HEADER: 'Compensation',
  SCENARIO_LABELS: {
    success: 'Pay',
    stockFailure: 'Sold out',
    paymentFailure: 'Card declined',
    stockRace: 'Two browsers, one item',
  },
} as const;
