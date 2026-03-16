package admin

type CRMPage struct {
	Items []map[string]any
	Total int
	Page  int
	Limit int
}
