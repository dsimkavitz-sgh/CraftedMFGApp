-- Crafted MFG ships primarily via FedEx and UPS; add FedEx to the carrier enum.
-- (Run this in the Supabase SQL editor if the project was set up before this
-- migration existed.)
alter type public.carrier add value if not exists 'fedex' after 'ups';
