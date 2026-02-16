import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Subscription } from '@/lib/models';
import { verifyWebhookSignature, parseWebhookEvent, mapRazorpayStatus } from '@/lib/services/razorpay';

// POST /api/webhooks/razorpay - Handle Razorpay webhooks
export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const signature = request.headers.get('x-razorpay-signature');

        if (!signature) {
            return new Response('Missing signature', { status: 400 });
        }

        // Verify webhook signature
        const isValid = verifyWebhookSignature(body, signature);
        if (!isValid) {
            console.error('Invalid Razorpay webhook signature');
            return new Response('Invalid signature', { status: 401 });
        }

        await connectDB();

        const event = parseWebhookEvent(body);
        console.log('Razorpay webhook event:', event.event);

        switch (event.event) {
            case 'subscription.authenticated':
            case 'subscription.activated': {
                const subEntity = event.payload.subscription?.entity;
                if (!subEntity) break;

                await Subscription.findOneAndUpdate(
                    { razorpaySubscriptionId: subEntity.id },
                    {
                        status: 'active',
                        currentPeriodStart: new Date(subEntity.current_start * 1000),
                        currentPeriodEnd: new Date(subEntity.current_end * 1000),
                    }
                );
                break;
            }

            case 'subscription.charged': {
                const subEntity = event.payload.subscription?.entity;
                if (!subEntity) break;

                await Subscription.findOneAndUpdate(
                    { razorpaySubscriptionId: subEntity.id },
                    {
                        status: 'active',
                        currentPeriodStart: new Date(subEntity.current_start * 1000),
                        currentPeriodEnd: new Date(subEntity.current_end * 1000),
                    }
                );
                break;
            }

            case 'subscription.pending':
            case 'subscription.halted': {
                const subEntity = event.payload.subscription?.entity;
                if (!subEntity) break;

                await Subscription.findOneAndUpdate(
                    { razorpaySubscriptionId: subEntity.id },
                    { status: mapRazorpayStatus(subEntity.status) }
                );
                break;
            }

            case 'subscription.cancelled':
            case 'subscription.completed': {
                const subEntity = event.payload.subscription?.entity;
                if (!subEntity) break;

                await Subscription.findOneAndUpdate(
                    { razorpaySubscriptionId: subEntity.id },
                    {
                        status: mapRazorpayStatus(subEntity.status),
                        currentPeriodEnd: subEntity.ended_at
                            ? new Date(subEntity.ended_at * 1000)
                            : undefined,
                    }
                );
                break;
            }

            case 'payment.captured': {
                console.log('Payment captured:', event.payload.payment?.entity.id);
                break;
            }

            case 'payment.failed': {
                console.error('Payment failed:', event.payload.payment?.entity.id);
                break;
            }

            default:
                console.log('Unhandled webhook event:', event.event);
        }

        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('Webhook error:', error);
        return new Response('Webhook processing failed', { status: 500 });
    }
}
