Development:
docker compose up --build  # Port 5173, hot reload

Production:
docker compose -f docker-compose.prod.yml up --build  # Port 80, optimized