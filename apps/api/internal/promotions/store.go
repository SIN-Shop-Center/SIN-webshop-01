package promotions

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) ListActive(ctx context.Context, q ActivePromotionQuery) ([]PromotionBanner, error) {
	where := []string{
		"p.is_active = true",
		"p.start_date <= now()",
		"(p.end_date is null or p.end_date >= now())",
		"coalesce(nullif(trim(p.banner_text), ''), '') <> ''",
	}
	args := make([]any, 0, 3)

	if q.Segment != "" {
		args = append(args, q.Segment)
		where = append(where, fmt.Sprintf("(p.segment_scope = 'all' or p.segment_scope = $%d)", len(args)))
	}
	if q.Placement != "" {
		args = append(args, q.Placement)
		where = append(where, fmt.Sprintf("(p.banner_placement = 'all' or p.banner_placement = $%d)", len(args)))
	}

	args = append(args, q.Limit)
	query := fmt.Sprintf(`
select
  p.id::text,
  p.name,
  p.type,
  p.code,
  p.banner_text,
  coalesce(nullif(trim(p.banner_color), ''), '#1f8c72'),
  p.banner_placement,
  p.segment_scope,
  p.discount_value,
  p.discount_percentage,
  p.minimum_order,
  p.start_date,
  p.end_date
from shop.promotions p
where %s
order by p.start_date desc, p.created_at desc
limit $%d
`, strings.Join(where, " and "), len(args))

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]PromotionBanner, 0, q.Limit)
	for rows.Next() {
		var item PromotionBanner
		if err := rows.Scan(
			&item.ID,
			&item.Name,
			&item.Type,
			&item.Code,
			&item.BannerText,
			&item.BannerColor,
			&item.Placement,
			&item.SegmentScope,
			&item.DiscountValue,
			&item.DiscountPct,
			&item.MinimumOrder,
			&item.StartDate,
			&item.EndDate,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
