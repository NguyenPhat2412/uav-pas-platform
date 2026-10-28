-- Paid plans now expire: plan_paid_until is the end of the period covered by the last paid plan
-- invoice. NULL means no expiry (free plan or a plan assigned by an administrator).
ALTER TABLE user_quotas ADD COLUMN IF NOT EXISTS plan_paid_until TIMESTAMP(6);

-- Backfill: quotas on a paid plan that was bought through an invoice get one billing period from
-- the latest payment of that plan. Admin-assigned paid plans (no paid invoice) keep no expiry.
UPDATE user_quotas q
SET plan_paid_until = paid.last_paid_at
    + CASE WHEN UPPER(p.billing_cycle) = 'YEARLY' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END
FROM service_plans p,
     (SELECT i.user_id, i.plan_id, MAX(i.paid_at) AS last_paid_at
      FROM invoices i
      WHERE i.mission_id IS NULL AND i.plan_id IS NOT NULL AND i.status = 'PAID' AND i.paid_at IS NOT NULL
      GROUP BY i.user_id, i.plan_id) paid
WHERE p.id = q.plan_id
  AND p.price > 0
  AND paid.user_id = q.user_id
  AND paid.plan_id = q.plan_id
  AND q.plan_paid_until IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_quotas_rollover ON user_quotas (cycle_end);

-- Financial events with no webhook subscriber are now completed locally instead of being re-polled
-- forever. Close the ones already waiting whose customer notification was created.
UPDATE financial_outbox_events
SET status = 'LOCAL_COMPLETED', last_error = NULL
WHERE status = 'WAITING_SUBSCRIBERS' AND notification_created = TRUE;
