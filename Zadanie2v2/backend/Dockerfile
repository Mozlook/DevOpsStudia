FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY . .

RUN CGO_ENABLED=0 go build -o backend .

FROM alpine:3.23

WORKDIR /app

COPY --from=builder /app/backend ./backend

EXPOSE 8080

CMD ["./backend"]
