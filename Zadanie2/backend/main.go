package main

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

type Product struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Category  string    `json:"category"`
	Price     float64   `json:"price"`
	CreatedAt time.Time `json:"createdAt"`
}

type CreateProductRequest struct {
	Name     string  `json:"name"`
	Category string  `json:"category"`
	Price    float64 `json:"price"`
}

type StatsResponse struct {
	TotalProducts int       `json:"totalProducts"`
	InstanceID    string    `json:"instanceId"`
	GeneratedAt   time.Time `json:"generatedAt"`
}

type App struct {
	mu         sync.RWMutex
	products   []Product
	nextID     int
	instanceID string
}

func NewApp(instanceID string) *App {
	now := time.Now().UTC()

	initialProducts := []Product{
		{
			ID:        1,
			Name:      "Laptop Pro 14",
			Category:  "Elektronika",
			Price:     4999.99,
			CreatedAt: now.Add(-72 * time.Hour),
		},
		{
			ID:        2,
			Name:      "Monitor 27",
			Category:  "Elektronika",
			Price:     1299.50,
			CreatedAt: now.Add(-48 * time.Hour),
		},
		{
			ID:        3,
			Name:      "Biurko Smart",
			Category:  "Meble",
			Price:     899.00,
			CreatedAt: now.Add(-24 * time.Hour),
		},
	}

	return &App{
		products:   initialProducts,
		nextID:     4,
		instanceID: instanceID,
	}
}

func (a *App) routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/items", a.handleItems)
	mux.HandleFunc("/stats", a.handleStats)

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		writeError(w, http.StatusNotFound, "route not found")
	})

	return loggingMiddleware(mux)
}

func (a *App) handleItems(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.listItems(w)
	case http.MethodPost:
		a.createItem(w, r)
	case http.MethodOptions:
		w.Header().Set("Allow", "GET, POST, OPTIONS")
		w.WriteHeader(http.StatusNoContent)
	default:
		methodNotAllowed(w, http.MethodGet, http.MethodPost, http.MethodOptions)
	}
}

func (a *App) handleStats(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.getStats(w)
	case http.MethodOptions:
		w.Header().Set("Allow", "GET, OPTIONS")
		w.WriteHeader(http.StatusNoContent)
	default:
		methodNotAllowed(w, http.MethodGet, http.MethodOptions)
	}
}

func (a *App) listItems(w http.ResponseWriter) {
	a.mu.RLock()
	items := make([]Product, len(a.products))
	copy(items, a.products)
	a.mu.RUnlock()

	response := map[string]any{
		"items": items,
	}

	writeJSON(w, http.StatusOK, response)
}

func (a *App) createItem(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	var req CreateProductRequest
	if err := decoder.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, decodeErrorMessage(err))
		return
	}

	var extra any
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "request body must contain a single JSON object")
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Category = strings.TrimSpace(req.Category)

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "field 'name' is required")
		return
	}

	if req.Category == "" {
		writeError(w, http.StatusBadRequest, "field 'category' is required")
		return
	}

	if req.Price < 0 {
		writeError(w, http.StatusBadRequest, "field 'price' must be greater than or equal to 0")
		return
	}

	a.mu.Lock()
	product := Product{
		ID:        a.nextID,
		Name:      req.Name,
		Category:  req.Category,
		Price:     req.Price,
		CreatedAt: time.Now().UTC(),
	}
	a.products = append(a.products, product)
	a.nextID++
	a.mu.Unlock()

	writeJSON(w, http.StatusCreated, product)
}

func (a *App) getStats(w http.ResponseWriter) {
	a.mu.RLock()
	total := len(a.products)
	a.mu.RUnlock()

	response := StatsResponse{
		TotalProducts: total,
		InstanceID:    a.instanceID,
		GeneratedAt:   time.Now().UTC(),
	}

	writeJSON(w, http.StatusOK, response)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)

	encoder := json.NewEncoder(w)
	encoder.SetEscapeHTML(false)

	if err := encoder.Encode(payload); err != nil {
		log.Printf("json encode error: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{
		"error": message,
	})
}

func methodNotAllowed(w http.ResponseWriter, allowedMethods ...string) {
	w.Header().Set("Allow", strings.Join(allowedMethods, ", "))
	writeError(w, http.StatusMethodNotAllowed, "method not allowed")
}

func decodeErrorMessage(err error) string {
	switch {
	case errors.Is(err, io.EOF):
		return "request body must not be empty"
	default:
		return "request body must be valid JSON"
	}
}

type statusRecorder struct{
	http.ResponseWriter
	statusCode int
}

func (sr *statusRecorder) WriteHeader(statusCode int) {
	sr.statusCode = statusCode
	sr.ResponseWriter.WriteHeader(statusCode)
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		recorder := &statusRecorder{
			ResponseWriter: w,
			statusCode:     http.StatusOK,
		}

		start := time.Now()
		next.ServeHTTP(recorder, r)
		duration := time.Since(start)

		log.Printf("%s %s -> %d (%s)", r.Method, r.URL.Path, recorder.statusCode, duration)
	})
}

func getInstanceID() string {
	if value := strings.TrimSpace(os.Getenv("INSTANCE_ID")); value != "" {
		return value
	}

	hostname, err := os.Hostname()
	if err == nil && strings.TrimSpace(hostname) != "" {
		return hostname
	}

	return "unknown-instance"
}

func getPort() string {
	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		return "8080"
	}

	if _, err := strconv.Atoi(port); err != nil {
		log.Printf("invalid PORT=%q, using default 8080", port)
		return "8080"
	}

	return port
}

func main() {
	instanceID := getInstanceID()
	port := getPort()

	app := NewApp(instanceID)

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           app.routes(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	log.Printf("backend started on port %s (instance: %s)", port, instanceID)

	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("server error: %v", err)
	}
}
