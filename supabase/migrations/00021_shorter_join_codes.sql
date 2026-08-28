-- Generate 6-char uppercase alphanumeric join codes
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no O/0 I/1 confusion
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, (floor(random() * length(chars)) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Update existing courses to use short codes (only if they still have the old hex format)
UPDATE public.courses
  SET join_code = generate_short_code()
  WHERE length(join_code) <> 6 OR join_code ~ '^[0-9a-f]+$';

-- Change default for new courses
ALTER TABLE public.courses
  ALTER COLUMN join_code SET DEFAULT generate_short_code();