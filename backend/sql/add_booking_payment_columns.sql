ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS payment_status text,
ADD COLUMN IF NOT EXISTS payment_provider text,
ADD COLUMN IF NOT EXISTS payment_order_id text,
ADD COLUMN IF NOT EXISTS payment_id text,
ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_payment_method_allowed_check'
  ) THEN
    ALTER TABLE bookings
    ADD CONSTRAINT bookings_payment_method_allowed_check
    CHECK (
      payment_method IS NULL
      OR payment_method IN ('cod', 'upi', 'card', 'netbanking')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_payment_status_allowed_check'
  ) THEN
    ALTER TABLE bookings
    ADD CONSTRAINT bookings_payment_status_allowed_check
    CHECK (
      payment_status IS NULL
      OR payment_status IN ('pending', 'paid', 'failed', 'refunded')
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_status
ON bookings(payment_status);
