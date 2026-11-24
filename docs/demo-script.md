# KaamSetu: demo video script (≈4:30)

**Format:** 1440×900 screen recording plus a phone screen-mirror for Telegram, with a voice-over.
**Before recording:** run `npm run seed`, and keep `npm run dev`, `npm run bot` and the tunnel/deploy running. Close other tabs. Turn phone notifications off except Telegram.
**Fail-safe:** if anything external stalls, the landing page's phone demo (§5) plays the whole worker journey with real ElevenLabs audio and needs no network beyond the page itself.

| Time | On screen | Voice-over (say it slowly) |
|---|---|---|
| **0:00 – 0:15** · Hook | Landing hero: "Kaam milega. *Paas mein.*" with the live Pune map drawing match arcs. | "Every morning at 7 AM, thousands of workers in Pune stand at a labour *naka* hoping to be picked. Today, they can just *speak*." |
| **0:15 – 0:45** · Problem | Scroll into the pinned numbers: 450M · 10–30% · 0 · 7 AM. | "India has about 450 million informal workers. A *thekedar* (contractor) takes 10 to 30 percent of their wage. Job apps are built in English, for people who type. Ramesh, a plumber in Kothrud, speaks Marathi and owns a ₹7,000 phone." |
| **0:45 – 1:35** · Worker onboarding (live) | Phone mirror: Telegram → `/start` → pick हिन्दी → hear the consent message → tap *I agree* → hold the mic and say *"Mera naam Ramesh hai, main plumber hoon, Kothrud mein rehta hoon, 800 rupaye roz chahiye."* The bot replies with a **voice note** read-back plus a card: Plumber · Kothrud · ₹800/day → tap ✅. | "Ramesh joins with one voice note. ElevenLabs Scribe transcribes it, Amazon Bedrock pulls out a structured profile, Amazon Location maps 'Kothrud', and KaamSetu *speaks back* in his language to confirm. No typing, no forms. Consent comes first, and his number is never public." |
| **1:35 – 2:20** · Employer posts by voice | `/hire` → press the mic → *"Need a plumber in Kothrud tomorrow, 850 rupees a day, one day."* Words appear one by one, then the fields animate into the editable card → **Find workers**. | "A shop owner hires the same way: she speaks. The same pipeline turns her sentence into a job, and if she offers below minimum wage, we gently warn her." |
| **2:20 – 2:55** · Explainable matching | Map: job pin, radius ring and ranked pins. Hover the #1 card to show the score bar and the *why* line ("Plumber · 1.3 km away · asks ₹800 (you offer ₹850) · 4.8★ from 12 jobs"). | "Matching is transparent: 35% skill, 25% distance, 15% wage fit, 15% trust (our KaamScore) and 10% availability. Every match explains itself in one line. No black box, no paid boosts." |
| **2:55 – 3:25** · Voice alert → Accept (live) | Phone: a Telegram **voice alert** arrives in Hindi: "Ramesh जी, कोथरूड में 1.3 किलोमीटर दूर प्लंबर का काम है…". Tap ✅ *हाँ, काम चाहिए*. Cut to `/hire`: the status chip animates to **Accepted**, the hazard-stripe sweep plays, **Contact unlocked**. | "Top matches get a spoken job alert in their own language. One tap to accept, and only then do both sides see each other's number." |
| **3:25 – 3:50** · Kaam Didi phone agent | Landing → **Talk to KaamSetu** → short live exchange in Hindi (register → "जॉब बताइए" → she reads job 0407 → accept). | "Even without a smartphone app, a worker can call Kaam Didi, our ElevenLabs voice agent. She registers them, reads out nearby jobs and accepts one, all by voice, through the same backend." |
| **3:50 – 4:10** · Trust + scale | `/w/w_ramesh` ID card (KaamScore dial, Verified Plumber badge, QR) → `/live` ops view with ticking counters and event stream. | "Every completed job builds a portable work history: a KaamScore and verified badges a worker can forward on WhatsApp. And this is the network, live." |
| **4:10 – 4:30** · Architecture + close | `/about` architecture diagram. End on the footer wordmark. | "It's built on AWS (Bedrock, Lambda, API Gateway, DynamoDB, S3, Location Service, Amplify, CloudWatch) and ElevenLabs for every voice. KaamSetu: *kaam milega, paas mein.* Work, found by voice, within walking distance." |

## Recording checklist
- [ ] `npm run seed` right before recording (it resets the live statuses).
- [ ] Telegram: the test phone has already sent `/start` once, so the bot has a chat.
- [ ] `/hire` mic permission granted in the browser beforehand.
- [ ] Have a typed sample prompt ready as a backup (chip: *"Plumber in Kothrud today ₹800"*).
- [ ] Volume up for voice notes; record system audio.
- [ ] If the live Telegram leg fails: switch to the landing **Hear it work** phone demo (same story, pre-generated audio).
