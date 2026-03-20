package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"regexp"
	"strings"
	"time"
)

var (
	flagMigrationsDir = flag.String("migrations", "", "Path to migrations dir (default: find infra/supabase/migrations from cwd)")
	flagVerify        = flag.Bool("verify", false, "Verify DB connectivity and expected tables")
	flagList          = flag.Bool("list", false, "List migrations and applied status")
)

var migrationNameRE = regexp.MustCompile(`^(\d{14})_(.+)\.sql$`)

type migrationFile struct {
	ID       string
	FileName string
	Path     string
	Checksum string
}

func main() {
	flag.Parse()
	ctx := context.Background()

	dsn := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dsn == "" {
		fatal(errors.New("DATABASE_URL is required"))
	}

	migrationsDir := strings.TrimSpace(*flagMigrationsDir)
	if migrationsDir == "" {
		found, err := findMigrationsDir()
		if err != nil {
			fatal(err)
		}
		migrationsDir = found
	}

	files, err := listMigrations(migrationsDir)
	if err != nil {
		fatal(err)
	}
	if len(files) == 0 {
		fatal(fmt.Errorf("no SQL migrations found in %s", migrationsDir))
	}

	conn, err := connect(ctx, dsn)
	if err != nil {
		fatal(err)
	}
	defer conn.Close(ctx)

	if err := ensureMigrationsTable(ctx, conn); err != nil {
		fatal(err)
	}

	applied, err := readApplied(ctx, conn)
	if err != nil {
		fatal(err)
	}

	if *flagList {
		for _, mf := range files {
			checksum, ok := applied[mf.ID]
			if ok {
				status := "applied"
				if checksum != mf.Checksum {
					status = "checksum_mismatch"
				}
				fmt.Printf("%s %s %s\n", mf.ID, status, mf.FileName)
				continue
			}
			fmt.Printf("%s pending %s\n", mf.ID, mf.FileName)
		}
		return
	}

	if *flagVerify {
		if err := verifySchema(ctx, conn); err != nil {
			fatal(err)
		}
		fmt.Printf("ok: verify\n")
		return
	}

	start := time.Now()
	countApplied := 0
	for _, mf := range files {
		if existing, ok := applied[mf.ID]; ok {
			if existing != mf.Checksum {
				fatal(fmt.Errorf("migration_checksum_mismatch id=%s file=%s", mf.ID, mf.FileName))
			}
			continue
		}

		fmt.Printf("apply %s %s\n", mf.ID, mf.FileName)
		if err := applyOne(ctx, conn, mf); err != nil {
			fatal(err)
		}
		countApplied++
	}

	if err := verifySchema(ctx, conn); err != nil {
		fatal(err)
	}

	fmt.Printf("ok: applied=%d total=%d elapsed=%s\n", countApplied, len(files), time.Since(start).Truncate(time.Millisecond))
}

func fatal(err error) {
	os.Stderr.WriteString(err.Error() + "\n")
	os.Exit(1)
}
