-- Migration: 029_instant_callback_banner_settings.sql
-- Description: Seed initial default settings for the 5-second delayed instant hotline callback banner

INSERT INTO site_settings (key, value)
VALUES
  ('callback_banner_enabled', 'true'),
  ('callback_banner_delay_seconds', '5'),
  ('callback_banner_destination_email', 'gstbro.com@gmail.com'),
  ('callback_banner_badge', '⭐ Instant CA Callback'),
  ('callback_banner_headline', 'Need Expert GST or Tax Help?'),
  ('callback_banner_description', 'Leave your number — our Senior Chartered Accountant will call you in 5 minutes.'),
  ('callback_banner_cta_text', 'Request Free Callback →'),
  ('callback_banner_success_msg', '🎉 Request Received! Our Senior CA is calling you in 5 minutes.')
ON CONFLICT (key) DO NOTHING;
