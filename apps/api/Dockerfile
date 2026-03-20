FROM golang:1.24-alpine AS builder
WORKDIR /src

# Download dependencies first
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build API with CGO disabled for alpine
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/api ./cmd/api
# Build Worker
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/worker ./cmd/worker

# Final minimal stage
FROM alpine:3.20

# Install CA certificates for SSL
RUN apk add --no-cache ca-certificates tzdata

# Create non-root user (important for HF spaces)
RUN adduser -D -u 1000 app
WORKDIR /app

# Copy binaries
COPY --from=builder /out/api /app/api
COPY --from=builder /out/worker /app/worker

# Set ownership
RUN chown -R app:app /app

# Expose standard HF Spaces port
EXPOSE 7860

USER app

# Environment variables for dev mode
ENV APP_ENV=development
ENV PORT=7860
ENV CORS_ALLOWLIST=https://delqhi.com,http://localhost:3000
ENV SITE_URL=https://delqhi.com

# Start API
CMD ["/app/api"]
