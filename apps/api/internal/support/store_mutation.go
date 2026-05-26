package support

import (
	"context"
	"fmt"
	"strings"
)

func (s *Store) CreateTicket(ctx context.Context, customerID, email, subject, message string, metadata map[string]any) (map[string]any, error) {
	const query = `
select row_to_json(x)::jsonb
from (
  insert into shop.support_tickets (customer_id, email, subject, message, metadata)
  values (nullif($1, '')::uuid, nullif($2, ''), $3, $4, coalesce($5::jsonb, '{}'::jsonb))
  returning id::text as id, customer_id::text as customer_id, email, subject, message, status, priority, created_at, updated_at
) x
`

	item := map[string]any{}
	var raw []byte
	if err := s.pool.QueryRow(ctx, query, customerID, email, subject, message, metadata).Scan(&raw); err != nil {
		return nil, err
	}
	if err := jsonUnmarshal(raw, &item); err != nil {
		return nil, err
	}
	return item, nil
}

func (s *Store) UpdateTicket(ctx context.Context, id string, patch map[string]any) (map[string]any, error) {
	setParts := make([]string, 0, 4)
	args := make([]any, 0, 6)
	appendField := func(col, key string) {
		v, ok := patch[key]
		if !ok {
			return
		}
		args = append(args, v)
		setParts = append(setParts, fmt.Sprintf("%s = $%d", col, len(args)))
	}

	appendField("status", "status")
	appendField("priority", "priority")
	if assignedRaw, ok := patch["assigned_to"]; ok {
		args = append(args, strings.TrimSpace(fmt.Sprint(assignedRaw)))
		setParts = append(setParts, fmt.Sprintf("assigned_to = nullif($%d, '')::uuid", len(args)))
	}
	appendField("metadata", "metadata")
	if len(setParts) == 0 {
		return nil, fmt.Errorf("empty patch")
	}

	setParts = append(setParts, "updated_at = now()")
	args = append(args, id)
	query := fmt.Sprintf(`
select row_to_json(x)::jsonb
from (
  update shop.support_tickets
  set %s
  where id::text = $%d
  returning id::text as id, customer_id::text as customer_id, email, subject, message, status, priority, created_at, updated_at
) x
`, strings.Join(setParts, ",\n      "), len(args))

	item := map[string]any{}
	var raw []byte
	if err := s.pool.QueryRow(ctx, query, args...).Scan(&raw); err != nil {
		return nil, err
	}
	if err := jsonUnmarshal(raw, &item); err != nil {
		return nil, err
	}
	return item, nil
}
