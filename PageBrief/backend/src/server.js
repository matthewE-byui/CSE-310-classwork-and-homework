import "dotenv/config";
import crypto from "crypto";
import express from "express";
import cors from "cors";
import Stripe from "stripe";
import { cleanExpiredSessions, findUserByEmail, loadStore, saveStore, usageForToday } from "./store.js";

const app = express();
const port = Number(process.env.PORT || 8787);
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const PLANS = {
  free: { id: "free", name: "Free", dailyLimit: 15 },
  pro: { id: "pro", name: "Pro", dailyLimit: 500 },
  team: { id: "team", name: "Team", dailyLimit: 5000 },
  enterprise: { id: "enterprise", name: "Enterprise", dailyLimit: 100000 }
};

const PRICE_TO_PLAN = {
  [process.env.STRIPE_PRICE_PRO_MONTHLY || "price_pro_placeholder"]: "pro",
  [process.env.STRIPE_PRICE_TEAM_MONTHLY || "price_team_placeholder"]: "team"
};

app.use(cors({ origin: true }));

app.post("/v1/billing/webhook", express.raw({ type: "application/json" }), (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(200).send("Stripe not configured");

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const data = loadStore();
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const plan = PRICE_TO_PLAN[session.metadata?.priceId] || "pro";
    const user = data.users.find((u) => u.id === userId);
    if (user) {
      user.plan = plan;
      user.stripeCustomerId = session.customer || user.stripeCustomerId;
      user.updatedAt = Date.now();
      data.events.push({ id: crypto.randomUUID(), type: "billing.upgraded", userId, plan, date: Date.now() });
      saveStore(data);
    }
  }

  return res.json({ received: true });
});

app.use(express.json());

function auth(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ error: "Missing token" });

  const data = loadStore();
  cleanExpiredSessions(data);
  const session = data.sessions.find((s) => s.token === token);
  if (!session) {
    saveStore(data);
    return res.status(401).json({ error: "Invalid session" });
  }

  const user = data.users.find((u) => u.id === session.userId);
  if (!user) return res.status(401).json({ error: "User not found" });

  req.store = data;
  req.user = user;
  req.session = session;
  next();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "pagebrief-backend" });
});

app.get("/v1/plans", (_req, res) => {
  res.json({ plans: Object.values(PLANS) });
});

app.post("/v1/auth/login", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email is required" });
  }

  const data = loadStore();
  cleanExpiredSessions(data);

  let user = findUserByEmail(data, email);
  if (!user) {
    user = {
      id: crypto.randomUUID(),
      email,
      plan: "free",
      niche: "academic",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usage: { date: new Date().toISOString().slice(0, 10), count: 0 }
    };
    data.users.push(user);
  }

  const token = crypto.randomUUID();
  data.sessions.push({ token, userId: user.id, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30 });
  saveStore(data);

  return res.json({ token, user: { id: user.id, email: user.email, plan: user.plan, niche: user.niche } });
});

app.post("/v1/auth/logout", auth, (req, res) => {
  req.store.sessions = req.store.sessions.filter((s) => s.token !== req.session.token);
  saveStore(req.store);
  res.json({ ok: true });
});

app.get("/v1/auth/me", auth, (req, res) => {
  const usage = usageForToday(req.user);
  const plan = PLANS[req.user.plan] || PLANS.free;
  saveStore(req.store);
  res.json({ user: { id: req.user.id, email: req.user.email, plan: req.user.plan, niche: req.user.niche }, usage: { count: usage.count, dailyLimit: plan.dailyLimit } });
});

app.get("/v1/usage", auth, (req, res) => {
  const usage = usageForToday(req.user);
  const plan = PLANS[req.user.plan] || PLANS.free;
  saveStore(req.store);
  res.json({ count: usage.count, dailyLimit: plan.dailyLimit, remaining: Math.max(0, plan.dailyLimit - usage.count) });
});

app.post("/v1/usage/track", auth, (req, res) => {
  const units = Math.max(1, Number(req.body?.units || 1));
  const usage = usageForToday(req.user);
  const plan = PLANS[req.user.plan] || PLANS.free;

  if (usage.count + units > plan.dailyLimit) {
    return res.status(402).json({ error: "Daily plan limit reached", count: usage.count, dailyLimit: plan.dailyLimit });
  }

  usage.count += units;
  req.user.updatedAt = Date.now();
  req.store.events.push({
    id: crypto.randomUUID(),
    type: "usage.summary",
    userId: req.user.id,
    units,
    date: Date.now(),
    meta: req.body?.meta || {}
  });

  saveStore(req.store);
  res.json({ ok: true, count: usage.count, dailyLimit: plan.dailyLimit, remaining: Math.max(0, plan.dailyLimit - usage.count) });
});

app.post("/v1/billing/create-checkout-session", auth, async (req, res) => {
  const priceId = String(req.body?.priceId || "").trim();
  if (!priceId) return res.status(400).json({ error: "priceId is required" });

  if (!stripe) {
    return res.json({
      url: `${process.env.APP_BASE_URL || "http://localhost:8787"}/mock-checkout?priceId=${encodeURIComponent(priceId)}&user=${encodeURIComponent(req.user.email)}`,
      mocked: true
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: `${process.env.APP_BASE_URL || "http://localhost:8787"}/billing/success`,
      cancel_url: `${process.env.APP_BASE_URL || "http://localhost:8787"}/billing/cancel`,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: req.user.email,
      metadata: { userId: req.user.id, priceId }
    });

    res.json({ url: session.url, mocked: false });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to create checkout session" });
  }
});

app.listen(port, () => {
  console.log(`PageBrief backend listening on http://localhost:${port}`);
});
