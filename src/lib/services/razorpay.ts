import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const PLAN_ID = process.env.RAZORPAY_PLAN_ID!;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;

export interface CreateSubscriptionResult {
    subscriptionId: string;
    shortUrl: string;
    status: string;
}

export async function createCustomer(
    email: string,
    name: string,
    phone?: string
): Promise<string> {
    try {
        const customer = await razorpay.customers.create({
            name,
            email,
            contact: phone,
        });
        return customer.id;
    } catch (error) {
        console.error('Razorpay create customer error:', error);
        throw new Error('Failed to create customer');
    }
}

export async function createSubscription(
    customerId: string,
    totalCount: number = 12 // Default 12 months
): Promise<CreateSubscriptionResult> {
    try {
        const subscription = await razorpay.subscriptions.create({
            plan_id: PLAN_ID,
            customer_id: customerId,
            total_count: totalCount,
            quantity: 1,
            customer_notify: 1,
        });

        return {
            subscriptionId: subscription.id,
            shortUrl: subscription.short_url,
            status: subscription.status,
        };
    } catch (error) {
        console.error('Razorpay create subscription error:', error);
        throw new Error('Failed to create subscription');
    }
}

export async function cancelSubscription(
    subscriptionId: string,
    cancelAtCycleEnd: boolean = true
): Promise<boolean> {
    try {
        await razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
        return true;
    } catch (error) {
        console.error('Razorpay cancel subscription error:', error);
        return false;
    }
}

export async function getSubscription(subscriptionId: string) {
    try {
        return await razorpay.subscriptions.fetch(subscriptionId);
    } catch (error) {
        console.error('Razorpay fetch subscription error:', error);
        throw new Error('Failed to fetch subscription');
    }
}

export function verifyWebhookSignature(
    body: string,
    signature: string
): boolean {
    const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

export interface WebhookEvent {
    event: string;
    payload: {
        subscription?: {
            entity: {
                id: string;
                customer_id: string;
                status: string;
                current_start: number;
                current_end: number;
                ended_at?: number;
            };
        };
        payment?: {
            entity: {
                id: string;
                status: string;
                amount: number;
            };
        };
    };
}

export function parseWebhookEvent(body: string): WebhookEvent {
    return JSON.parse(body);
}

// Subscription status mapping
export function mapRazorpayStatus(
    razorpayStatus: string
): 'active' | 'cancelled' | 'expired' | 'pending' {
    switch (razorpayStatus) {
        case 'active':
            return 'active';
        case 'cancelled':
        case 'paused':
            return 'cancelled';
        case 'expired':
        case 'completed':
            return 'expired';
        default:
            return 'pending';
    }
}

export default razorpay;
