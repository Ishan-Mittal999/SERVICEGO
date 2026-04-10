ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS customer_rating integer,
ADD COLUMN IF NOT EXISTS customer_review text,
ADD COLUMN IF NOT EXISTS customer_rated_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_customer_rating_check'
  ) THEN
    ALTER TABLE bookings
    ADD CONSTRAINT bookings_customer_rating_check
    CHECK (customer_rating IS NULL OR (customer_rating BETWEEN 1 AND 5));
  END IF;
END $$;
