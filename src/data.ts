export interface Category {
  id: string
  name: string
  icon: string
  count: number
}

export interface Page {
  id: string
  categoryId: string
  title: string
  author: string
  authorInitials: string
  date: string
  status: string
  tags: string[]
  content: string
}

export const CATEGORIES: Category[] = [
  { id: 'account', name: 'Account Issues', icon: '👤', count: 8 },
  { id: 'network', name: 'Network Related Issues', icon: '📶', count: 12 },
  { id: 'apps', name: 'Apps & Transaction Issues', icon: '📱', count: 6 },
  { id: 'prepaid', name: 'Prepaid Issues', icon: '💳', count: 9 },
  { id: 'postpaid', name: 'Postpaid Issues', icon: '📄', count: 7 },
  { id: 'billing', name: 'Billing Issues', icon: '💰', count: 10 },
  { id: 'power', name: 'Power & Device Issues', icon: '🔋', count: 5 },
  { id: 'roaming', name: 'Roaming & International', icon: '🌐', count: 4 },
  { id: 'porting', name: 'Number Porting', icon: '🔄', count: 3 },
  { id: 'datapack', name: 'Data Pack Issues', icon: '📦', count: 10 },
]

export const TAG_COLORS: Record<string, string> = {
  Postpaid: 'bg-blue-100 text-blue-700',
  Upgrade: 'bg-purple-100 text-purple-700',
  Billing: 'bg-green-100 text-green-700',
  Dispute: 'bg-red-100 text-red-700',
  Network: 'bg-indigo-100 text-indigo-700',
  LTE: 'bg-cyan-100 text-cyan-700',
  Signal: 'bg-teal-100 text-teal-700',
  Account: 'bg-orange-100 text-orange-700',
  SIM: 'bg-yellow-100 text-yellow-700',
  Replacement: 'bg-pink-100 text-pink-700',
  AutoPay: 'bg-emerald-100 text-emerald-700',
  Payment: 'bg-lime-100 text-lime-700',
  Prepaid: 'bg-violet-100 text-violet-700',
  Recharge: 'bg-fuchsia-100 text-fuchsia-700',
  Balance: 'bg-rose-100 text-rose-700',
  Default: 'bg-gray-100 text-gray-600',
}

export function getTagColor(tag: string): string {
  return TAG_COLORS[tag] ?? TAG_COLORS['Default']
}

export const PAGES: Page[] = [
  {
    id: '1',
    categoryId: 'postpaid',
    title: 'Plan Upgrade Mid-Cycle — Proration Calculation',
    author: 'Arjun Mehta',
    authorInitials: 'AM',
    date: '2026-08-22',
    status: 'Live',
    tags: ['Postpaid', 'Upgrade', 'Billing'],
    content: `<h2>Policy</h2><p>When a postpaid customer upgrades mid-billing cycle, charges are prorated based on days remaining in cycle. The new plan's features are activated immediately.</p><h2>Formula</h2><p>Prorated charge = (New Plan MRC / Days in cycle) × Days remaining</p><p>Old plan charges are frozen at day of upgrade. Customer receives two line items on next bill: partial old plan + full new plan.</p><h2>Steps to Process</h2><p>1. Verify customer's current plan and billing cycle date.</p><p>2. Calculate remaining days in cycle.</p><p>3. Apply proration formula to new plan MRC.</p><p>4. Update system with new plan effective date.</p>`,
  },
  {
    id: '2',
    categoryId: 'postpaid',
    title: 'Postpaid Bill Dispute Resolution Process',
    author: 'Priya Sharma',
    authorInitials: 'PS',
    date: '2026-08-20',
    status: 'Live',
    tags: ['Postpaid', 'Billing', 'Dispute'],
    content: `<h2>Overview</h2><p>This document outlines the standard process for handling postpaid bill disputes raised by customers.</p><h2>Resolution Steps</h2><p>1. Listen to customer complaint and note the disputed amount.</p><p>2. Pull the bill statement and verify all charges.</p><p>3. Check for any system errors or duplicate charges.</p><p>4. If valid dispute: initiate credit within 24 hours.</p><p>5. If invalid: explain charges clearly to customer.</p>`,
  },
  {
    id: '3',
    categoryId: 'network',
    title: 'LTE Signal Troubleshooting Guide',
    author: 'Rahul Verma',
    authorInitials: 'RV',
    date: '2026-08-18',
    status: 'Live',
    tags: ['Network', 'LTE', 'Signal'],
    content: `<h2>Problem</h2><p>Customer experiencing weak or no LTE signal in their area.</p><h2>Diagnosis Steps</h2><p>1. Check network coverage map for customer's location.</p><p>2. Verify if there are any active network outages in the area.</p><p>3. Ask customer to restart device and re-insert SIM.</p><p>4. Check if APN settings are correctly configured.</p><h2>Resolution</h2><p>If coverage issue: escalate to network team with customer location coordinates.</p>`,
  },
  {
    id: '4',
    categoryId: 'account',
    title: 'SIM Card Replacement Procedure',
    author: 'Sneha Patel',
    authorInitials: 'SP',
    date: '2026-08-15',
    status: 'Live',
    tags: ['Account', 'SIM', 'Replacement'],
    content: `<h2>When to Replace SIM</h2><p>SIM replacement is required when: physical damage, lost/stolen SIM, upgrade to newer SIM format (2G to 4G/5G).</p><h2>Process</h2><p>1. Verify customer identity with OTP and account number.</p><p>2. Block old SIM immediately upon request.</p><p>3. Issue new SIM with same number.</p><p>4. Activation takes 2-4 hours.</p>`,
  },
  {
    id: '5',
    categoryId: 'billing',
    title: 'Auto-Pay Setup and Troubleshooting',
    author: 'Kiran Rao',
    authorInitials: 'KR',
    date: '2026-08-12',
    status: 'Live',
    tags: ['Billing', 'AutoPay', 'Payment'],
    content: `<h2>Setting Up Auto-Pay</h2><p>Customers can set up auto-pay via the MyApp or website. Supported payment methods: credit/debit card, net banking, UPI.</p><h2>Common Issues</h2><p>1. Payment failure: Check card expiry and billing address.</p><p>2. Double deduction: Raise reversal request within 48 hours.</p><p>3. Auto-pay not triggering: Verify mandate is active in bank settings.</p>`,
  },
  {
    id: '6',
    categoryId: 'prepaid',
    title: 'Prepaid Recharge Not Reflecting',
    author: 'Amit Kumar',
    authorInitials: 'AK',
    date: '2026-08-10',
    status: 'Live',
    tags: ['Prepaid', 'Recharge', 'Balance'],
    content: `<h2>Problem</h2><p>Customer reports recharge amount deducted from bank but not reflecting in account balance.</p><h2>Steps</h2><p>1. Verify transaction ID from customer.</p><p>2. Check payment gateway logs.</p><p>3. If payment confirmed: manually credit recharge within 2 hours.</p><p>4. If payment failed: advise customer to retry after 30 minutes.</p>`,
  },
]
