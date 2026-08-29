-- Schedule `notes` render verbatim under Hours on every market page. 31 rows held
-- sourcing logs instead of visitor copy ("FMO still lists...", "when fetched",
-- "that URL returned 404/500 at research time"), which reads as machine output in a
-- SERP snippet and on the page.
--
-- The sourcing is not deleted: it moves to `research_notes`, which is desk-only and
-- deliberately NOT granted to anon/authenticated. `notes` keeps only facts a shopper
-- can act on — parking, rain policy, special dates — and is NULL where the weekday,
-- hours and season columns already say everything.
--
-- To revert: update public.market_schedules set notes = research_notes where research_notes is not null;
--
-- DEPLOY ORDER: ship the app first, then run this. `market_schedules` has column-level
-- SELECT grants, and `research_notes` is deliberately not granted to anon, so a
-- `select("*")` would fail on it. The app now names its columns explicitly
-- (SCHEDULE_PUBLIC in src/lib/data/catalog.ts); older deployed code does not.

alter table public.market_schedules add column if not exists research_notes text;

comment on column public.market_schedules.research_notes is
  'Internal sourcing trail for the schedule. Never shown to visitors; not granted to anon.';

-- Preserve the current text before rewriting it.
update public.market_schedules
set research_notes = notes
where research_notes is null
  and notes is not null
  and (
    notes ~* '(FMO|when fetched|at research time|research time|still (lists|shows|displayed|printed|says)|was not used|per the live|Homepage|operator homepage|returned 404)'
    or length(notes) > 150
  );

update public.market_schedules as s
set notes = v.notes
from (values
  ('d4c1d7bc-942a-4c07-8ab5-c3ef3f3bb2d3'::uuid, null),
  ('e0177833-6104-49f1-a8eb-eabe0555be40'::uuid, null),
  ('c2f5012b-08a9-468a-a48e-67a32cbdb286'::uuid, 'Thanksgiving market on Thursday, October 8.'),
  ('dc91ce58-3a4f-4d8f-92c8-c57f0cc1b72c'::uuid, 'Rain or shine. The last market of the season is Hallowe''en, Saturday, October 31.'),
  ('f447b1d5-0fb3-4019-9207-50474e9301ad'::uuid, 'On Main Street North between Queen Street and Theatre Lane. Free municipal parking garages on market days.'),
  ('332c6804-fb0d-40cd-9f70-635a7d24ba48'::uuid, 'Haunts & Harvest closing market, Sunday, October 25.'),
  ('819cc658-3618-49c6-9f0a-6661b73d91b6'::uuid, 'Rain or shine. Brooklin Harvest Festival falls on Saturday, September 19.'),
  ('faa8a722-aadc-4f67-b82e-7e6d635d177b'::uuid, 'Wednesday evening market.'),
  ('8a75870d-e406-4853-ab4e-488648270957'::uuid, null),
  ('15e0e32e-2e37-4f50-8adc-058a0ebb8eea'::uuid, null),
  ('4b26e56b-c64d-4d26-ad37-18d34274a217'::uuid, null),
  ('9faf3b4e-2339-4df4-a52c-cc3e784f5a0d'::uuid, 'The opening market is on Mother''s Day, May 10.'),
  ('4082ae39-fadd-4cf9-b1ec-a073ca18a5cf'::uuid, null),
  ('38f6df7c-7810-4154-8b27-bcb351cffb3d'::uuid, 'Outdoors at The LINK.'),
  ('ada37c0a-28ce-428f-aa73-14d5c80918f5'::uuid, 'In the Carville parking lot.'),
  ('bbbcadce-be1c-4c88-93fc-f986c6ad13e7'::uuid, 'Indoor and outdoor, in the Dixie Road lot beside the Small Arms Inspection Building. A biweekly artisan market runs alongside it.'),
  ('31625684-b1c8-400f-a534-723fec8c7c61'::uuid, 'No market on Canada Day. Paid underground parking under City Hall and the Central Library on Duke of York Boulevard.'),
  ('737cca9a-766f-4944-ac60-ced27a8ff967'::uuid, 'Nearly 400 free parking spaces beside the market, with overflow at 4 Robert Speck Parkway. Shipp Drive itself is no parking.'),
  ('87f98f19-d596-4779-93e6-0f83a1eb7dc4'::uuid, 'Rain or shine.'),
  ('f3ae73d3-74ce-4025-a99c-03024c045620'::uuid, null),
  ('304585d4-2ef4-4f44-9222-d87700da8c3f'::uuid, 'Rain or shine.'),
  ('835de472-db69-416b-b14f-06aa895b6779'::uuid, 'In the southeast parking lot. Extra pop-up vendors on July 25, September 12 and October 10.'),
  ('6ddbfb86-e141-459c-b558-26d7bdd32da4'::uuid, null),
  ('847dd5a6-062c-47a3-8b31-02b422489670'::uuid, 'Outdoors, and it runs in the rain. Thunder, lightning or extreme wind closes the market.'),
  ('7ad2ef72-b888-4762-860b-dc750c16d1c4'::uuid, null),
  ('53422aa5-174f-4ec4-af95-34f64d0e534d'::uuid, 'Rain or shine.'),
  ('0132838d-ccef-46c1-bde7-6301b35a9343'::uuid, null),
  ('205f3be0-13b1-47a6-a4c0-83eb24b5d550'::uuid, 'Not weekly. Sundays November 1, 8, 15 and 22, then December 6 and 13. No market on November 29.'),
  ('bc597147-dce3-4527-90d0-2e3436fbc293'::uuid, null),
  ('9047153e-8cb9-4953-b22e-24662dda1944'::uuid, 'Rain or shine. Two holiday markets follow in November.'),
  ('4c209487-e5d3-40de-b982-2d7dae8e6f2a'::uuid, null)
) as v(id, notes)
where s.id = v.id;
