
-- Prerequisites for SMS/Email notification dispatch.
--
-- profiles.email: the app has only ever collected a phone number (OTP
-- auth), so there's currently no address to send email notifications
-- to at all. Nullable/optional — email notifications simply don't fire
-- for a user who never sets one.
ALTER TABLE public.profiles ADD COLUMN email TEXT;

-- Dispatch tracking, so the periodic dispatcher can tell which
-- notifications it has already handled per channel instead of
-- re-sending on every run. NULL means "not yet attempted for this
-- channel" — the dispatcher also uses this to mark a channel as
-- not-applicable (e.g. no email on file) so it stops being rescanned.
ALTER TABLE public.notifications ADD COLUMN sms_sent_at TIMESTAMPTZ;
ALTER TABLE public.notifications ADD COLUMN email_sent_at TIMESTAMPTZ;
