import catchAsyncErrors from "../middlewares/catchAsyncErrors.js";
import Order from "../models/order.js";
import Stripe from "stripe";


const getStripeInstance = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY nije definisan u .env fajlu!");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};


export const stripeCheckoutSession = catchAsyncErrors(async (req, res, next) => {
  const stripe = getStripeInstance();
  const body = req.body;

  const line_items = body.orderItems.map((item) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: item.name,
        images: [item.image],
        metadata: { productId: item.product },
      },
      unit_amount: item.price * 100,
    },
    tax_rates: ["txr_1SLShjE1ceSJxoah1tD3AlEL"],
    quantity: item.quantity,
  }));

  const shipping_rate =
    body.itemsPrice >= 200
      ? "shr_1SLSb4E1ceSJxoahC1dvo6eZ"
      : "shr_1SLScQE1ceSJxoah6MNmIxQj";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    success_url: `${process.env.FRONTEND_URL}/me/orders`,
    cancel_url: `${process.env.FRONTEND_URL}`,
    customer_email: req.user.email,
    client_reference_id: req.user._id.toString(),
    mode: "payment",
    metadata: {
      ...body.shippingInfo,
      itemsPrice: body.itemsPrice.toString(),
    },
    shipping_options: [{ shipping_rate }],
    line_items,
  });

  res.status(200).json({ url: session.url });
});


const getOrderItems = async (line_items) => {
  const stripe = getStripeInstance();
  const cartItems = [];
  for (const item of line_items.data) {
    const product = await stripe.products.retrieve(item.price.product);
    cartItems.push({
      product: product.metadata.productId,
      name: product.name,
      price: item.price.unit_amount_decimal / 100,
      quantity: item.quantity,
      image: product.images[0],
    });
  }
  return cartItems;
};

export const stripeWebhook = catchAsyncErrors(async (req, res, next) => {
  const stripe = getStripeInstance();
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Neuspešna verifikacija Stripe potpisa:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const line_items = await stripe.checkout.sessions.listLineItems(session.id);
    const orderItems = await getOrderItems(line_items);

    const orderData = {
      shippingInfo: {
        address: session.metadata.address,
        city: session.metadata.city,
        phoneNo: session.metadata.phoneNo,
        zipCode: session.metadata.zipCode,
        country: session.metadata.country,
      },
      orderItems,
      itemsPrice: parseFloat(session.metadata.itemsPrice),
      taxAmount: session.total_details.amount_tax / 100,
      shippingAmount: session.total_details.amount_shipping / 100,
      totalAmount: session.amount_total / 100,
      paymentInfo: {
        id: session.payment_intent,
        status: session.payment_status,
      },
      paymentMethod: "Card",
      user: session.client_reference_id,
    };

    await Order.create(orderData);
  }


  res.status(200).end();
});
