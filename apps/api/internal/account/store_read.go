package account

import (
	"context"

	"github.com/jackc/pgx/v5"
)

func (s *Store) GetByUserID(ctx context.Context, userID string) (*Profile, error) {
	const profileQuery = `
select p.id::text, p.email, p.first_name, p.last_name, coalesce(c.name, ''), c.phone, p.role, p.created_at, p.updated_at,
       coalesce(c.metadata, '{}'::jsonb)::text
from shop.profiles p
left join shop.customers c on c.auth_user_id = p.id
where p.id = $1
limit 1
`

	var profile Profile
	var firstName, lastName *string
	var name string
	var phone *string
	var metadataRaw string
	err := s.pool.QueryRow(ctx, profileQuery, userID).Scan(
		&profile.ID,
		&profile.Email,
		&firstName,
		&lastName,
		&name,
		&phone,
		&profile.Role,
		&profile.CreatedAt,
		&profile.UpdatedAt,
		&metadataRaw,
	)
	if err != nil {
		return nil, err
	}

	company, vatID, purchaseOrderRef := metadataToStrings([]byte(metadataRaw))
	profile.FirstName = firstName
	profile.LastName = lastName
	profile.Name = toOptional(name)
	profile.Phone = phone
	profile.CompanyName = company
	profile.VATID = vatID
	profile.PurchaseOrderRef = purchaseOrderRef

	addresses, err := s.listAddresses(ctx, userID)
	if err != nil {
		return nil, err
	}
	profile.Addresses = addresses
	return &profile, nil
}

func (s *Store) listAddresses(ctx context.Context, userID string) ([]Address, error) {
	const query = `
select id::text, name, first_name, last_name, street1, street2, city, zip, country, phone, is_default
from shop.addresses
where user_id = $1
order by is_default desc, created_at asc
`

	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []Address{}
	for rows.Next() {
		var item Address
		if err := rows.Scan(
			&item.ID,
			&item.Name,
			&item.FirstName,
			&item.LastName,
			&item.Street1,
			&item.Street2,
			&item.City,
			&item.Zip,
			&item.Country,
			&item.Phone,
			&item.IsDefault,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

func IsNotFound(err error) bool {
	return err == pgx.ErrNoRows
}
