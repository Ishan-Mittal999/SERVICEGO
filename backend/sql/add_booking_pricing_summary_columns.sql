ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS service_summary text,
ADD COLUMN IF NOT EXISTS estimated_amount numeric(10,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_estimated_amount_nonnegative_check'
  ) THEN
    ALTER TABLE bookings
    ADD CONSTRAINT bookings_estimated_amount_nonnegative_check
    CHECK (estimated_amount IS NULL OR estimated_amount >= 0);
  END IF;
END $$;
