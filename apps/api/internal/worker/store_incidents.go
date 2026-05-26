package worker

import (
	"context"
	"encoding/json"
	"fmt"
)

func (s *Store) recordDLQIncident(ctx context.Context, j Job, reason string) error {
	critical := isCriticalJobType(j.JobType)
	severity := "warning"
	if critical {
		severity = "critical"
	}
	summary := fmt.Sprintf("Job moved to DLQ: %s", j.JobType)
	payload, err := json.Marshal(map[string]any{
		"queue_job_id": j.ID,
		"queue_name":   j.QueueName,
		"job_type":     j.JobType,
		"attempt":      j.Attempt,
		"max_attempts": j.MaxAttempts,
		"reason":       reason,
	})
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `
insert into shop.budget_incidents (channel, incident_type, severity, status, summary, payload)
values ('all', 'dlq_job', $1, 'open', $2, $3::jsonb)
`, severity, summary, string(payload))
	return err
}

func isCriticalJobType(jobType string) bool {
	switch jobType {
	case "payment.succeeded", "supplier.order.requested", "supplier.order.placed", "shipment.updated":
		return true
	default:
		return false
	}
}
