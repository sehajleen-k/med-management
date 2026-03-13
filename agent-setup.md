# ElevenLabs Agent Setup Guide

This guide walks you through creating the ElevenLabs conversational AI agent and connecting it to a Twilio phone number so Arsh can call in and manage her medications by voice.

---

## Step 1 — Create the Agent in ElevenLabs

1. Go to [elevenlabs.io](https://elevenlabs.io) and sign in.
2. In the left sidebar click **Conversational AI** → **Agents** → **Create Agent**.
3. Choose **Blank template**.
4. Give it a name like `Arsh Med Manager`.

---

## Step 2 — Paste the System Prompt

In the **System Prompt** field, paste the following exactly:

```
You are Arsh's personal medication assistant — warm, calm, and clear like a trusted nurse. Your job is to help Arsh track her daily medications over the phone.

When the call starts:
1. Greet her: "Hi Arsh! Let me check your medications for today."
2. Immediately call the get_medication_status tool to get today's status.
3. Read out any pending scheduled medications (morning and evening) by name and instructions. Keep it to 1–2 sentences.
4. Ask if she has taken any of them, or if she'd like to log something.

When she says she took a medication:
1. Call the mark_medication_taken tool with the medication name.
2. Confirm with a single short sentence, e.g. "Got it, I've marked your Metformin as taken."
3. If it was already logged, say so kindly: "Looks like that one's already been checked off today."

Rules:
- Always respond in 1–2 sentences maximum. Be brief and warm.
- Never list more than 3 medications at once — pause and ask if she wants to continue.
- If she asks about as-needed medications, read them out and offer to log one.
- If she says she's done, say goodbye warmly: "All done! Take care, Arsh. Talk soon."
- Do not make up medication names. Only work with what the tool returns.
- Never ask for personal health information beyond what medication she is taking.
```

---

## Step 3 — Set the Voice

1. In the **Voice** section, pick a warm female voice. Recommended: **Aria** or **Charlotte**.
2. Set **Stability** to ~60% and **Similarity** to ~75% for a natural, calm tone.

---

## Step 4 — Configure Webhook Tools

Go to the **Tools** tab in your agent settings. Add two tools:

---

### Tool 1: `get_medication_status`

| Field | Value |
|-------|-------|
| **Name** | `get_medication_status` |
| **Description** | Gets today's medication list grouped by category (morning, evening, as needed), including whether each one has been taken and at what time. Call this at the start of every conversation. |
| **Method** | `GET` |
| **URL** | `https://YOUR-APP-URL/api/status` |

No request body needed for GET.

**Response description to add:**
> Returns a JSON object with keys `morning`, `evening`, `as_needed`. Each is a list of medications with fields: `id` (number), `name` (string), `instructions` (string), `taken` (boolean), `taken_at` (ISO timestamp or null).

---

### Tool 2: `mark_medication_taken`

| Field | Value |
|-------|-------|
| **Name** | `mark_medication_taken` |
| **Description** | Logs that Arsh has taken a specific medication. Use the medication name from the status response. Prevents double-logging scheduled medications on the same day. |
| **Method** | `POST` |
| **URL** | `https://YOUR-APP-URL/api/take` |
| **Content-Type** | `application/json` |

**Request body schema:**
```json
{
  "med_name": "string — the name of the medication as returned by get_medication_status"
}
```

**Response description to add:**
> Returns `{ "success": true, "med_name": "...", "taken_at": "ISO timestamp" }` on success. Returns `{ "success": false, "already_taken": true }` if the scheduled medication was already logged today.

> **Note:** Replace `YOUR-APP-URL` with your actual deployed app URL (e.g. `https://med-management-production.up.railway.app`).

---

## Step 5 — Connect to Twilio (Phone Number)

### 5a — Get a Twilio phone number

1. Go to [twilio.com](https://twilio.com) and create a free account.
2. In the Twilio console, click **Phone Numbers** → **Manage** → **Buy a Number**.
3. Pick a US number near Fresno (area code 559 or any CA number).
4. Click **Buy** (~$1.15/month).

### 5b — Connect ElevenLabs to Twilio

ElevenLabs has a native Twilio integration:

1. In your ElevenLabs agent, go to the **Phone** tab.
2. Click **Connect Twilio**.
3. You'll need to enter:
   - **Twilio Account SID** — found on your Twilio dashboard homepage
   - **Twilio Auth Token** — found on your Twilio dashboard homepage (click to reveal)
4. ElevenLabs will automatically configure your Twilio number to route calls to the agent.
5. Select the Twilio phone number you purchased and click **Connect**.

### 5c — Test the number

1. Call the Twilio number from your phone.
2. The agent should answer immediately with "Hi Arsh!..."
3. If there's no answer, check that your ElevenLabs agent is set to **Published** (not Draft).

### 5d — Give Arsh the number

Save the number in her phone as a contact named something like **"My Meds"** so she can find it easily.

---

## Step 6 — Test End-to-End

Run through this checklist before giving her the number:

- [ ] Call the number — agent greets with "Hi Arsh!"
- [ ] Agent reads today's pending medications correctly
- [ ] Say "I took my Metformin" — agent confirms and dashboard updates within 30 seconds
- [ ] Say you took it again — agent says it's already logged
- [ ] Log an as-needed med — agent confirms
- [ ] Dashboard shows the correct taken/pending state

---

## Troubleshooting

**Agent doesn't call the API:**
Make sure your app is deployed and the URL in the tool config uses `https://` (not `http://`).

**Agent can't find a medication by name:**
The `mark_medication_taken` endpoint does a fuzzy name match (`LIKE %name%`). The agent just needs to say something close to the actual name.

**Call drops immediately:**
Check that your ElevenLabs plan supports Twilio calling (Starter plan and above).

**Dashboard doesn't update after a voice call:**
Both use the same database. If the API call succeeded (agent said "Got it"), the dashboard will reflect it on next refresh (within 30 seconds).
