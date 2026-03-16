package config

import (
	"bufio"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
)

var loadLocalEnvOnce sync.Once

func loadLocalEnvFiles() {
	loadLocalEnvOnce.Do(func() {
		candidates := localEnvCandidates()
		for _, candidate := range candidates {
			loadEnvFile(candidate)
		}
	})
}

func localEnvCandidates() []string {
	cwd, err := os.Getwd()
	if err != nil || strings.TrimSpace(cwd) == "" {
		return []string{".env.local", ".env", filepath.Join("apps", "api", ".env.local"), filepath.Join("apps", "api", ".env")}
	}

	deduped := []string{}
	seen := map[string]struct{}{}
	appendPath := func(path string) {
		clean := filepath.Clean(path)
		if _, exists := seen[clean]; exists {
			return
		}
		seen[clean] = struct{}{}
		deduped = append(deduped, clean)
	}

	dir := cwd
	for {
		appendPath(filepath.Join(dir, ".env.local"))
		appendPath(filepath.Join(dir, ".env"))
		appendPath(filepath.Join(dir, "apps", "api", ".env.local"))
		appendPath(filepath.Join(dir, "apps", "api", ".env"))

		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	return deduped
}

func loadEnvFile(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if strings.HasPrefix(line, "export ") {
			line = strings.TrimSpace(strings.TrimPrefix(line, "export "))
		}

		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		if _, exists := os.LookupEnv(key); exists {
			continue
		}

		value = strings.TrimSpace(value)
		if len(value) >= 2 {
			if unquoted, err := strconv.Unquote(value); err == nil {
				value = unquoted
			} else if (strings.HasPrefix(value, "'") && strings.HasSuffix(value, "'")) || (strings.HasPrefix(value, "\"") && strings.HasSuffix(value, "\"")) {
				value = value[1 : len(value)-1]
			}
		}

		_ = os.Setenv(key, value)
	}
}
