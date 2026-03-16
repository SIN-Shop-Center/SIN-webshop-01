package checkout

import (
	"regexp"
	"strings"
)

const (
	maxCheckoutItems   = 50
	maxItemQuantity    = 20
	minZipLength       = 3
	maxZipLength       = 12
	minCountryLength   = 2
	maxCountryLength   = 56
	maxAddressLineSize = 120
	maxPhoneLength     = 32
)

var checkoutEmailPattern = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

func normalizeEmail(raw string) string {
	return strings.TrimSpace(strings.ToLower(raw))
}

func validCheckoutEmail(email string) bool {
	if email == "" {
		return false
	}
	if len(email) > 254 {
		return false
	}
	return checkoutEmailPattern.MatchString(email)
}

func normalizeAndValidateAddress(addr *ShippingAddress) bool {
	addr.FirstName = strings.TrimSpace(addr.FirstName)
	addr.LastName = strings.TrimSpace(addr.LastName)
	addr.Street1 = strings.TrimSpace(addr.Street1)
	addr.Street2 = strings.TrimSpace(addr.Street2)
	addr.City = strings.TrimSpace(addr.City)
	addr.Zip = strings.TrimSpace(addr.Zip)
	addr.Country = strings.TrimSpace(addr.Country)
	addr.Phone = strings.TrimSpace(addr.Phone)

	required := []string{addr.FirstName, addr.LastName, addr.Street1, addr.City, addr.Zip, addr.Country}
	for _, entry := range required {
		if entry == "" {
			return false
		}
	}

	if len(addr.Zip) < minZipLength || len(addr.Zip) > maxZipLength {
		return false
	}
	if len(addr.Country) < minCountryLength || len(addr.Country) > maxCountryLength {
		return false
	}
	if len(addr.Street1) > maxAddressLineSize || len(addr.Street2) > maxAddressLineSize {
		return false
	}
	if addr.Phone != "" && (len(addr.Phone) < 6 || len(addr.Phone) > maxPhoneLength) {
		return false
	}

	return true
}

func invalidItemQuantity(quantity int) bool {
	return quantity <= 0 || quantity > maxItemQuantity
}
