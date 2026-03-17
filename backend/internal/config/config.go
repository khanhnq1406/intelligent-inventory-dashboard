package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	DatabaseURL string
	Port        int
	CORSOrigins []string
	LogLevel    string
}

func Load() (*Config, error) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is required")
	}

	port := 8080
	if p := os.Getenv("PORT"); p != "" {
		var err error
		port, err = strconv.Atoi(p)
		if err != nil {
			return nil, fmt.Errorf("PORT must be a valid integer: %w", err)
		}
	}

	corsOrigins := []string{"*"}
	if c := os.Getenv("CORS_ORIGINS"); c != "" {
		corsOrigins = strings.Split(c, ",")
		for i := range corsOrigins {
			corsOrigins[i] = strings.TrimSpace(corsOrigins[i])
		}
	}

	logLevel := "info"
	if l := os.Getenv("LOG_LEVEL"); l != "" {
		logLevel = l
	}

	return &Config{
		DatabaseURL: dbURL,
		Port:        port,
		CORSOrigins: corsOrigins,
		LogLevel:    logLevel,
	}, nil
}
