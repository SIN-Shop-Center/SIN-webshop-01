package admin

import "time"

type TrendSignalsIngestResult struct {
	Received int       `json:"received"`
	Inserted int       `json:"inserted"`
	Updated  int       `json:"updated"`
	At       time.Time `json:"at"`
}

type ChannelEventsIngestResult struct {
	Channel          string    `json:"channel"`
	Received         int       `json:"received"`
	Inserted         int       `json:"inserted"`
	Duplicates       int       `json:"duplicates"`
	Projected        int       `json:"projected"`
	ProjectionErrors int       `json:"projection_errors"`
	At               time.Time `json:"at"`
}
