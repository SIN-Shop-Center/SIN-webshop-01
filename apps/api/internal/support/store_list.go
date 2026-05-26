package support

import (
	"context"
	"fmt"
	"strings"
)

func (s *Store) ListTickets(ctx context.Context, status, priority string, limit, offset int) ([]map[string]any, error) {
	where := []string{"1=1"}
	args := []any{}
	if strings.TrimSpace(status) != "" {
		args = append(args, strings.TrimSpace(status))
		where = append(where, fmt.Sprintf("t.status = $%d", len(args)))
	}
	if strings.TrimSpace(priority) != "" {
		args = append(args, strings.TrimSpace(priority))
		where = append(where, fmt.Sprintf("t.priority = $%d", len(args)))
	}
	args = append(args, limit, offset)

	query := fmt.Sprintf(`
select row_to_json(x)::jsonb
from (
  select t.id::text as id,
         t.customer_id::text as customer_id,
         t.order_id::text as order_id,
         t.email,
         t.subject,
         t.message,
         t.status,
         t.priority,
         t.assigned_to::text as assigned_to,
         t.metadata,
         t.created_at,
         t.updated_at
  from shop.support_tickets t
  where %s
  order by t.created_at desc
  limit $%d offset $%d
) x
`, strings.Join(where, " and "), len(args)-1, len(args))

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]map[string]any, 0, limit)
	for rows.Next() {
		item := map[string]any{}
		var raw []byte
		if err := rows.Scan(&raw); err != nil {
			return nil, err
		}
		if err := jsonUnmarshal(raw, &item); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}
