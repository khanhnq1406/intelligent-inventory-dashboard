package service

import (
	"sync"
	"time"

	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

// DashboardCache provides thread-safe in-memory caching for dashboard summary data.
type DashboardCache struct {
	mu     sync.RWMutex
	data   *models.DashboardSummary
	expiry time.Time
	ttl    time.Duration
}

func NewDashboardCache(ttl time.Duration) *DashboardCache {
	return &DashboardCache{ttl: ttl}
}

func (c *DashboardCache) Get() (*models.DashboardSummary, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if c.data == nil || time.Now().After(c.expiry) {
		return nil, false
	}
	return c.data, true
}

func (c *DashboardCache) Set(data *models.DashboardSummary) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data = data
	c.expiry = time.Now().Add(c.ttl)
}

func (c *DashboardCache) Invalidate() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data = nil
	c.expiry = time.Time{}
}
