# KaamSetu: pitch notes

Team **Meteora** · Devnovate Ideathon 2026 · Track 4 (Mystery Track "UnlockED") · Problem 3: Hyper-local job matching for informal and semi-skilled workers.

> One-liner: **KaamSetu lets India's informal workers find work near home just by speaking, in Hindi, Marathi or English, on Telegram or a phone call.**

---

## Slide 1: Problem
- ~**450M** informal workers in India: plumbers, masons, painters, cooks, drivers, helpers, domestic workers.
- They find work through a *thekedar* (contractor) who takes **10–30%** of the wage, or by standing at a labour *naka* at **7 AM** hoping to be picked.
- Job platforms are **English-first, text-first, desktop-first**. A mason in Pune who speaks Marathi on a ₹7,000 Android phone is effectively locked out.
- Small employers (a shop needing a helper for 3 days, a family needing a plumber *today*) have no fast way to find **verified, nearby** workers.

**Who it affects:** daily-wage and semi-skilled workers and local small employers in non-metro and peri-urban India.

## Slide 2: Solution
**KaamSetu (काम सेतु, "bridge to work")** is a voice-first, multilingual, hyper-local job network.
1. **Workers join by voice note** on Telegram. We transcribe it, extract a profile, map their area and **reply in their own voice and language** to confirm.
2. **Employers post by speaking** on the web dashboard and immediately see **ranked, explained matches on a map**.
3. **Top matches get a spoken job alert** in their language with *Accept / Not interested / Call*. On a mutual accept, contacts are unlocked.
4. **"Kaam Didi"**: an AI phone agent so workers who can't read or type can register, hear nearby jobs and accept them entirely by voice.
5. **Trust layer:** ratings build a **KaamScore** and **verified skill badges**, giving a portable work history and a shareable ID card.

## Slide 3: Architecture
```
Worker (Telegram voice note / Kaam Didi call)          Employer (web, voice or form)
        │                                                      │
        ▼                                                      ▼
 API Gateway ─► Lambda (bot + agent tools)          Next.js on Amplify (API routes)
        └──────────────► packages/core (one codebase) ◄────────┘
                 │ ElevenLabs Scribe (speech → text)
                 │ Amazon Bedrock · Nova (text → structured profile/job, strict JSON + zod)
                 │ Amazon Location Service (locality → lat/lng)
                 │ Matching engine (explainable score 0–100)
                 │ ElevenLabs TTS (alert in the worker's language) ──► Telegram voice alert
                 ▼
       DynamoDB (single table, geohash GSI)   S3 (voice notes, cached audio)   CloudWatch (dashboard + alarms)
```
- **One core package** powers the web app, the Telegram Lambda and the agent tools, so behaviour is identical everywhere.
- **Every external call sits behind an adapter with a mock**, so the demo never breaks (`DEMO_MODE=true` runs with zero external calls).
- **Channel interface:** the Telegram implementation today; WhatsApp Cloud API drops into the same interface.

## Slide 4: Tech stack
| Layer | Choice |
|---|---|
| Voice | **ElevenLabs**: Scribe STT, Multilingual v2 TTS (confirmations), Flash v2.5 (low-latency alerts), Conversational AI agent with server tools |
| AI | **Amazon Bedrock** Converse API with **Amazon Nova Pro** (model-agnostic adapter; switching to Claude is a one-line `.env` change) |
| Geo | **Amazon Location Service** (Places v2 geocoding, map tiles) + haversine + geohash |
| Data | **DynamoDB** single-table (workers, jobs, matches, ratings, feed; geohash-cell GSI for "nearby"), **S3** for audio |
| Compute | **AWS Lambda** + **API Gateway** (Telegram webhook, agent tools), **Amplify Hosting** (Next.js SSR) |
| Ops | **CloudWatch** dashboard + error alarm, X-Ray tracing |
| Web | Next.js 15, TypeScript strict, Tailwind v4, Framer Motion, GSAP, MapLibre GL |
| IaC | AWS CDK (one stack) |

## Slide 5: Prototype progress (what's real today)
- ✅ Telegram bot: language choice → spoken consent → **voice-note onboarding** → spoken read-back → profile live → **voice job alerts** with Accept/Decline/Call → "delete my data".
- ✅ Employer dashboard: **voice or typed job posting**, editable extracted card, **ranked + explained matches on a live map**, statuses updating in real time, contact unlock, ratings → KaamScore.
- ✅ **Kaam Didi** voice agent with three live tools (register, find jobs, accept). An automated ElevenLabs simulation test passes end to end against our real webhooks.
- ✅ Matching engine with **unit tests** (Vitest); a rule-based Hindi/Marathi/English parser as a fallback.
- ✅ Shareable worker ID card (`/w/[id]`), live ops view (`/live`), landing page with an in-browser voice demo.
- ✅ AWS infrastructure as code (CDK): DynamoDB, S3, Lambda, API Gateway, Amplify, CloudWatch.

## Slide 6: Impact
- **Wage kept by the worker:** removing a 10–30% middleman cut on a ₹800/day job means **₹80–240 more per day** for the worker.
- **Time to hire:** from "stand at the naka at 7 AM and hope" to **a voice alert within seconds** of a job being posted.
- **Inclusion:** no literacy, no typing, no English required. Works on Telegram and by phone call.
- **Trust and mobility:** a portable, verifiable work history (KaamScore + badges) that a worker owns and can take anywhere.
- **Fair-wage nudges:** offers below the local minimum wage are flagged to the employer before posting.

## Slide 7: Business model
- **Free for workers, always.** No commission on wages.
- **Employers pay per successful hire**, a small flat fee (e.g. ₹29–49) that is far below a thekedar's cut, charged only on a mutual accept.
- **Subscriptions** for repeat hirers (housing societies, small contractors, restaurants): priority alerts, multi-worker jobs, invoices.
- **B2G / CSR partnerships:** state labour departments, skill-development missions and NGOs use KaamSetu as a voice front-end for job linkage, with e-Shram integration.
- **Unit economics (estimate, list prices):** one onboarding plus one alert is roughly a 15 s STT clip, a few hundred TTS characters and one Nova extraction call. That's on the order of **a few rupees per worker interaction**, recovered by a single hire fee.

## Slide 8: Future scope
- **WhatsApp Cloud API** channel (same interface as Telegram) and a **missed-call → callback** number via ElevenLabs + Twilio.
- More languages: Tamil, Telugu, Kannada, Bengali (a config change plus translations).
- **UPI wage escrow:** the employer deposits, the worker is paid on completion, building payment history.
- **ONDC / e-Shram integration** for identity and benefits linkage.
- **Skill verification** via short work videos and peer endorsements.
- Demand forecasting for nakas: tell workers *where* work is likely tomorrow.

---

## 10 likely judge questions and sharp answers

**1. How does this scale beyond a demo?**
Everything stateless runs on Lambda/Amplify; data is DynamoDB on-demand with a geohash-cell GSI, so a "nearby" query is 9 key lookups regardless of city size. Voice and LLM are managed APIs. Adding a city means adding localities; there is nothing to re-architect.

**2. What does a match cost?**
Roughly: one Scribe transcription of a ~15 s voice note, one Nova Pro extraction (~600 input / ~100 output tokens), and one short Flash TTS alert per alerted worker. At list prices that's a few rupees per interaction, and TTS is cached by text hash, so repeated phrases are free. A single per-hire fee covers many interactions.

**3. Privacy and consent?**
The bot explains what it stores, out loud in the worker's language, before saving anything. Phone numbers are never shown publicly; they're revealed only after a mutual accept. Public profiles show locality, never coordinates. "Delete my data" (by voice or command) removes the profile, ratings and match history.

**4. How do you stop fake profiles or fake jobs?**
Each worker is tied to a Telegram account or phone number. Trust is earned: KaamScore uses Bayesian-smoothed ratings, so one 5★ can't beat 40 jobs at 4.8★, and the "Verified" badge needs 3+ completed, rated jobs. Job posts are rate-limited, and below-minimum-wage offers are flagged. Next: OTP on the employer side and video skill checks.

**5. Why Telegram and not WhatsApp?**
Telegram's bot API is free, instant to set up and supports voice notes plus inline buttons, which made it right for a hackathon. Our channel layer is an interface; WhatsApp Cloud API (audio messages + reply buttons) is a drop-in implementation and is first on the roadmap.

**6. What about workers with feature phones or no data?**
That's exactly why **Kaam Didi** exists: an ElevenLabs voice agent that works over a phone call and does registration, job search and acceptance entirely by voice through the same backend. A missed-call → callback number is the next step.

**7. How do you make money without hurting workers?**
Workers never pay. Employers pay a small flat fee *only* when a hire happens, far less than a thekedar's 10–30%, plus subscriptions for frequent hirers and B2G/CSR partnerships.

**8. How is this different from Apna or WorkIndia?**
They're app-and-text-first, focused on salaried entry-level roles and require reading and typing. KaamSetu is **voice-first in the worker's language**, built for **daily-wage, same-day, walking-distance** work, with **explainable** matching and a portable trust score.

**9. How accurate is Hindi/Marathi understanding?**
ElevenLabs Scribe handles Hindi and Marathi speech, including code-mixed "Hinglish". In our (synthetic-speech) round-trip tests it transcribed every Hindi alert word-perfectly, including amounts like ₹850; real field audio with street noise is the next thing to test. Extraction uses Nova with strict JSON + schema validation and a retry, with a rule-based Hindi/Marathi/English parser (handles "aath sau", "पाचशे", Devanagari digits) filling any gaps. Workers always hear a spoken read-back and can tap **Fix**.

**10. Who owns the data?**
The worker. Their profile and work history are theirs to share (ID card + QR) or delete at any time. We don't sell data, and matching uses no hidden or paid ranking signals; every score is explained.
