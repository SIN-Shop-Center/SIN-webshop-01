package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

func findMigrationsDir() (string, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for dir := cwd; ; dir = filepath.Dir(dir) {
		candidate := filepath.Join(dir, "infra", "supabase", "migrations")
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			return candidate, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
	}
	return "", fmt.Errorf("unable to locate infra/supabase/migrations from cwd=%s", cwd)
}

func listMigrations(dir string) ([]migrationFile, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	out := make([]migrationFile, 0, len(entries))
	seen := map[string]struct{}{}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasSuffix(strings.ToLower(name), ".sql") {
			continue
		}
		match := migrationNameRE.FindStringSubmatch(name)
		if match == nil {
			return nil, fmt.Errorf("invalid migration filename: %s", name)
		}
		id := match[1]
		if _, ok := seen[id]; ok {
			return nil, fmt.Errorf("duplicate migration id: %s", id)
		}
		seen[id] = struct{}{}

		fullPath := filepath.Join(dir, name)
		checksum, err := sha256File(fullPath)
		if err != nil {
			return nil, err
		}
		out = append(out, migrationFile{ID: id, FileName: name, Path: fullPath, Checksum: checksum})
	}

	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	for index := 1; index < len(out); index++ {
		if out[index].ID <= out[index-1].ID {
			return nil, fmt.Errorf("migration order not strictly increasing: %s then %s", out[index-1].ID, out[index].ID)
		}
	}
	return out, nil
}

func sha256File(path string) (string, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(content)
	return hex.EncodeToString(sum[:]), nil
}
