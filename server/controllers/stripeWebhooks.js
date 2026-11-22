
import Stripe from "stripe";
import Booking from "../models/Booking.js";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (request, response) => {

    const sig = request.headers["stripe-signature"];

    // Check whether webhook secret is available
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    console.log("Webhook environment check:", {
        secretExists: !!webhookSecret,
        secretStartsCorrectly: webhookSecret?.startsWith("whsec_")
    });

    if (!webhookSecret) {
        console.error("STRIPE_WEBHOOK_SECRET is missing in environment variables");
        return response.status(500).send("Webhook secret is not configured");
    }

    let event;

    // Verify Stripe webhook signature
    try {
        event = stripeInstance.webhooks.constructEvent(
            request.body,
            sig,
            webhookSecret
        );

    } catch (error) {
        console.error("Webhook signature verification failed:", error.message);
        return response.status(400).send(`Webhook Error: ${error.message}`);
    }

    // Process Stripe event
    try {

        switch (event.type) {

            case "payment_intent.succeeded": {

                const paymentIntent = event.data.object;

                console.log("Payment succeeded:", paymentIntent.id);

                // Find Checkout Session using Payment Intent ID
                const sessionList = await stripeInstance.checkout.sessions.list({
                    payment_intent: paymentIntent.id
                });

                if (!sessionList.data.length) {
                    throw new Error("No checkout session found");
                }

                const session = sessionList.data[0];

                // Get booking ID from session metadata
                const bookingId = session.metadata?.bookingId;

                if (!bookingId) {
                    throw new Error("Booking ID missing in session metadata");
                }

                // Update booking in MongoDB
                const updatedBooking = await Booking.findByIdAndUpdate(
                    bookingId,
                    {
                        isPaid: true,
                        paymentLink: ""
                    },
                    { new: true }
                );

                if (!updatedBooking) {
                    throw new Error("Booking not found in database");
                }

                console.log("Booking payment updated successfully:", bookingId);

                break;
            }

            default:
                console.log("Unhandled event type:", event.type);
        }

        return response.status(200).json({ received: true });

    } catch (error) {
        console.error("Webhook processing error:", error);
        return response.status(500).send("Internal Server Error");
    }
};
