-- Migration 026: Welcome Code Support Phone Setting
-- Adds welcome_code_support_phone to site_settings so Super Admin can dynamically configure
-- the call redirection number when prospective clients or CA firms click 'GET' on the welcome code field.

INSERT INTO site_settings (key, value, updated_at)
VALUES ('welcome_code_support_phone', '+91 98765 43210', NOW())
ON CONFLICT (key) DO NOTHING;
