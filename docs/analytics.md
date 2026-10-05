# GA4 measurement

Production measurement ID: G-02CCFQWHZ1. Tag loads only on findyoursole.app / www.findyoursole.app in a production build. Local development and direct admin visits do not load it.

## Required GA4 setup before deployment

In Admin > Data streams > web stream > Enhanced measurement, turn **Enhanced measurement OFF**. This app sends manual hash-route page views and selected events; automatic form, search, outbound-link and history measurement must remain off to avoid duplicate events and collection of unreviewed inputs. See https://developers.google.com/analytics/devguides/collection/ga4/views.

Events: page_view, recommendation_start (form entered), recommendation_complete (successful API response including zero results), explanation_open (explanation requested), favorite_add, favorite_remove, shopping_click. Allowed parameters: mode, shoe_id, result_count. No pain, weight, budget, free text, admin token or shoe portfolio input is passed. URLs are canonical allowlisted hash routes without query strings; initial referrer is origin only. Advertising personalization and Google signals are disabled in tag configuration.

After merging/deploying, check Realtime / DebugView or Tag Assistant with a public recommendation flow. Browser tests intercept the Google script and inspect the queued commands; they do not send test traffic to Google.

The app suppresses its own events on admin routes. A tag already loaded on a public page can continue Google's session/engagement behavior: use a separate browser/private session for admin work. Blocking scripts or browser tracking protection can reduce measured totals. This is aggregate browser analytics, not an exact count of people.
