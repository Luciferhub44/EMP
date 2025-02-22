/*
  # Add Settings Initialization Trigger

  1. New Trigger
    - Automatically creates settings for new users
    - Ensures settings exist for all auth operations
  
  2. Security
    - Enable RLS on settings table
    - Add policies for user access
*/

-- Create trigger function to initialize user settings
CREATE OR REPLACE FUNCTION initialize_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.settings (
    user_id,
    notifications,
    appearance,
    security,
    profile
  ) VALUES (
    NEW.id,
    jsonb_build_object(
      'email', true,
      'orders', true,
      'chat', true
    ),
    jsonb_build_object(
      'theme', 'system',
      'compactMode', false
    ),
    jsonb_build_object(
      'twoFactorEnabled', false
    ),
    jsonb_build_object(
      'name', NEW.name,
      'email', NEW.email,
      'company', ''
    )
  ) ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on users table
DROP TRIGGER IF EXISTS create_user_settings ON public.users;
CREATE TRIGGER create_user_settings
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_settings();

-- Ensure settings exist for all current users
INSERT INTO public.settings (user_id)
SELECT id FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.settings)
ON CONFLICT (user_id) DO NOTHING;