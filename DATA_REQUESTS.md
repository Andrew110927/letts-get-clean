# Handling a privacy request (see, fix or delete someone's data)

The internal checklist behind the "Privacy request" section of `privacy.html`. Answer within 30 days. Keep a private note of each request (date received, what was asked, date done) on your phone or in a notes app, **not in this repo**.

## 1. Check it's really them

- The request should come from the phone number their booking used, by text or call.
- If they've changed numbers, ask something only they would know: the appointment date, the car, or the street.
- If you can't confirm it, explain why and don't share or delete anything.

## 2. Find everything about them

- **LGC Pro → Clients:** their customer card, vehicles and the bookings linked to them.
- **LGC Pro → Invoices:** any invoices or quotes made out to them.
- **Reviews** (LGC Pro → Reviews): search by first name and the date.
- **Your phone:** the text thread.
- **Stripe** (only once card payments are live): their payments.

## 3. Do what they asked

- **See a copy:** text them the details: name, phone, address, car, the jobs with dates and amounts, and their review.
- **Correct it:** edit the customer card (and the booking if it's upcoming).
- **Delete it:**
  - Remove their **review** (LGC Pro → Reviews → Delete).
  - Clear their **name, phone, address, car and notes** from the customer card and their bookings. Today the app only archives customers, so for now do this by editing the fields to "Deleted customer". A proper "Forget this customer" button is planned and needs a small database change approved by you first.
  - **Keep** each job's date, service and amount, because tax rules can require those records for up to 7 years. Invoices may keep the amount and date but not the address or notes.
  - Delete the text thread on your phone if nothing open depends on it.
  - **Stripe:** card records stay with Stripe for their legal period. Tell the customer that if it applies.
- **Stop texts:** reply to confirm and don't text that number again unless they book.

## 4. Confirm

Text them what you did, the date, and what you had to keep and why. Mark the request done in your private note.

## Timing

- Aim for a few days.
- The policy promises 30 days at the most.
- If something truly needs longer, tell them why before the 30 days are up.
