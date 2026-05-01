# Repull Revenue Commercial Use — Plain English

> **TL;DR:** Free for almost everybody. Pay us if you build a service for *other people's* listings AND you cross 100 listings or $1M ARR. Always keep the "Powered by Repull" footer.

This is a non-binding plain-English summary of [`LICENSE.md`](./LICENSE.md). Read the legal text for the actual rules.

## You can use Repull Revenue FREE if you are…

- A solo developer evaluating the template, prototyping, or learning.
- A research project, academic project, or open-source contributor.
- A vacation-rental host running your own listings (or your own LLC's listings) — up to **100 active listings**.
- Any team experimenting internally with no live customers.

> "Active listings" means listings that are syncing or being managed through Repull at the time of measurement, on a 30-day rolling window.

## You need a commercial license if you are…

You need a paid commercial license **only if BOTH** of the following are true:

1. **You're operating Repull Revenue on behalf of third parties.** That means: you are running a service, agency, revenue-management product, market-data product, or any other tool where the listings being priced or analyzed are *not* owned by you or your legal entity. They belong to your clients/customers/users.
2. **AND** at least one of:
   - You manage **more than 100 active listings** at any one time (across all third-party clients combined), or
   - **$1M+ ARR** of your product comes from, or materially uses, Repull Revenue.

If you cross either threshold, email `hello@repull.dev` with the subject `Repull Revenue Commercial License — [your company]` and tell us: your company, what you're building, current listing count, projected ARR, timeline. We'll work out terms.

## The "Powered by Repull" badge

Every publicly-deployed app you ship on top of Repull Revenue or its derivatives needs a visible "Powered by Repull" link in the footer (or about page, or docs page) pointing to `https://repull.dev`. Doesn't matter if you're under the threshold — this is required for everyone who deploys publicly.

> If you ship Repull Revenue *to your end users* embedded inside a finished product (e.g. you sell a desktop app that bundles it), end users don't need to repeat the badge — but you do.

## What about modifications?

Yes, fork and modify freely. Same license carries forward. Don't strip the attribution.

## What about competing products?

Don't use Repull Revenue or anything you build on top of it to train or improve a competing dynamic-pricing engine or market-data product. Build cool stuff on top of Repull; don't build a Repull-clone with Repull-as-the-fuel.

## Termination

If your Repull API access is revoked (e.g., terms of service violation, non-payment), the license auto-terminates for so long as the revocation lasts. The template is non-functional without an active API key by design — this clause is mostly belt-and-suspenders.

## Why isn't this MIT?

Because the template is free to use, but the underlying API at `api.repull.dev` is what costs us money to run, secure, maintain, and keep partner-approved with Airbnb/Booking/VRBO. We give the template away to seed the ecosystem; we charge gatecrossers (commercial operators of meaningful scale) so we can keep the API alive for everyone else.

## Questions

- **Licensing**: `hello@repull.dev`
- **Abuse / TOS**: `hello@repull.dev`
- **Engineering / GitHub issues**: open in this repo
