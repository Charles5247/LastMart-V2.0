export const userRoles = {
    CUSTOMER: 'customer',
    VENDOR: 'vendor',
    ADMIN: 'admin',
}

export const userTCRoles = {
    CUSTOMER: 'customer',
    VENDOR: 'vendor',
}

export const kycStatuses = {
    NOT_SUBMITTED: 'not_submitted',
    UNDER_REVIEW: 'under_review', 
    APPROVED: 'approved', 
    REJECTED: 'rejected',
}

export const kycIdTypes = {
    ID: 'national_id', 
    PASSPORT: 'passport', 
    LICENSE: 'drivers_license', 
    PVC: 'voters_card',
}

export const vendorStatuses = {
    PENDING: 'pending', 
    APPROVED: 'approved', 
    SUSPENDED: 'suspended',
}

export const rankingLevel = {
    NONE: 'none', 
    BRONZE: 'bronze', 
    SILVER: 'silver', 
    GOLD: 'gold', 
    PLATINUM: 'platinum',
}

export const rankingType = {
    VENDOR: 'vendor_ranking', 
    PRODUCT: 'product_ranking', 
    AD_BOOST: 'ad_boost',
}

export const rankingStatus = {
    PENDING: 'pending_payment', 
    ACTIVE: 'active', 
    EXPIRED: 'expired', 
    CANCELLED: 'cancelled',
}

export const rankingAdPlacement = {
    HOMEPAGE: 'homepage', 
    CATEGORY: 'category', 
    SEARCH: 'search', 
    ALL: 'all'
}

export const productVerificationStatus = {
    PENDING: 'pending', 
    VERIFIED: 'verified', 
    REJECTED: 'rejected',
}

export const productAvailability = {
    PENDING: 'pending', 
    IN_STOCK: 'in_stock', 
    FINISHED: 'out_of_stock', 
    PRE_ORDER: 'pre_order',
}

export const productAuthenticity = {
    PENDING: 'pending', 
    VERIFIED: 'verified', 
    DISPUTED: 'disputed', 
    REJECTED: 'rejected',
}

export const orderStatuses = {
    PENDING: 'pending', 
    PROCESSING: 'processing', 
    SHIPPED: 'shipped', 
    DELIVERED: 'delivered', 
    CANCELLED: 'cancelled',
}

export const deliveryModes = {
    STANDARD: 'standard', 
    EXPRESS: 'express', 
    PICKUP: 'pickup',
}

export const paymentMethods = {
    CARD: 'card', 
    BANK_TRANSFER: 'bank_transfer', 
    USSD: 'ussd', 
    CRYPTO: 'crypto', 
    GIFTCARD: 'giftcard',
}

export const paymentGateways = {
    PAYSTACK: 'paystack', 
    FLUTTERWAVE: 'flutterwave', 
    CRYPTO: 'crypto', 
    GIFTCARD: 'giftcard',
}

export const paymentStatus = {
    PENDING: 'pending', 
    PAID: 'paid', 
    FAILED: 'failed', 
    REFUNDED: 'refunded',
}

export const advertStatus = {
    ACTIVE: 'active', 
    INACTIVE: 'inactive',
}

export const transactionType = {
    PAYMENT: 'payment', 
    REFUND: 'refund', 
    PAYOUT: 'payout',
}

export const transactionStatus = {
    PENDING: 'pending', 
    COMPLETED: 'completed', 
    FAILED: 'failed',
}

export const budgetPeriods = {
    DAILY: 'daily', 
    WEEKLY: 'weekly', 
    MONTHLY: 'monthly', 
    QUATERLY: 'quarterly',
}

export const lamaInsightType = {
    MARKET_TREND: 'market_trend', 
    ADMIN_ALERT: 'admin_alert', 
    RECOMMENATION: 'recommendation', 
    BUDGET_ALERT: 'budget_alert',
}

export const lamaTargetRoles = {
    CUSTOMER: 'customer',
    VENDOR: 'vendor',
    ADMIN: 'admin',
    ALL: 'all',
}

export const businessType = {
    SOLO: 'sole_proprietorship', 
    PARTNERSHIP: 'partnership', 
    LLC: 'llc', 
    CORPORATION: 'corporation',
}

export const couponTypes = {
    FIXED: 'fixed', 
    PERCENT: 'percent', 
    REFERRAL: 'referral',
}

export const referralStatus = {
    PENDING: 'pending', 
    COMPLETED: 'completed', 
}