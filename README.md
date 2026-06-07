# CloudWear Distribution

Production-ready full-stack web application for a Pearson BTEC "Networking in the Cloud" assignment.

CloudWear Distribution demonstrates a wholesale clothing distributor migrating ERP, CRM, WMS, and order workflows to cloud-hosted infrastructure.

## Tech Stack

- React + Vite + TypeScript frontend
- Node.js + Express + TypeScript backend
- PostgreSQL database using `pg`
- Single deployable app on one port
- Docker and AWS EC2 deployment ready
- External PostgreSQL compatible, including Render PostgreSQL SSL

## Project Structure

```text
cloudwear-networking/
  client/
  server/
  package.json
  Dockerfile
  .env.example
  README.md
```

## Required Environment Variables

Create a `.env` file in the project root or provide these variables through your host:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
PORT=3000
NODE_ENV=production
```

Do not hardcode database credentials. The app reads PostgreSQL credentials only from `DATABASE_URL`.

Render PostgreSQL requires SSL. The backend configures:

```ts
ssl: { rejectUnauthorized: false }
```

## Local Production Run

```bash
npm install
npm run build
npm start
```

Open:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/api/health
```

Expected response:

```json
{ "status": "OK", "service": "CloudWear Distribution API" }
```

## Development Run

Use this only for local development:

```bash
npm install
npm run dev
```

The Vite frontend runs on port `5173` and proxies `/api` to the Express backend on port `3000`.

## Database Behavior

On server startup the backend automatically creates these tables if they do not exist:

- `products`
- `customers`
- `warehouse_items`
- `orders`

If each table is empty, sample data is inserted so the dashboard is useful immediately.

## API Endpoints

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/products`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/customers`
- `POST /api/customers`
- `PUT /api/customers/:id`
- `DELETE /api/customers/:id`
- `GET /api/warehouse-items`
- `POST /api/warehouse-items`
- `PUT /api/warehouse-items/:id`
- `DELETE /api/warehouse-items/:id`
- `GET /api/orders`
- `POST /api/orders`

## Docker

Build:

```bash
docker build -t cloudwear-networking .
```

Run:

```bash
docker run -p 3000:3000 --env-file .env cloudwear-networking
```

## AWS EC2 Deployment Steps

1. Create an Ubuntu EC2 instance and allow inbound traffic for:
   - SSH port `22`
   - HTTP port `80`
   - App port `3000` if you are not using Nginx

2. SSH into the instance:

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

3. Install Node.js 20:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

4. Upload or clone the project:

```bash
git clone YOUR_REPOSITORY_URL
cd cloudwear-networking
```

5. Create the production environment file:

```bash
nano .env
```

Add:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
PORT=3000
NODE_ENV=production
```

6. Install, build, and start:

```bash
npm install
npm run build
npm start
```

7. Optional: run with PM2 so the app keeps running:

```bash
sudo npm install -g pm2
pm2 start server/dist/index.js --name cloudwear-networking
pm2 save
pm2 startup
```

8. Optional: configure Nginx reverse proxy from port `80` to `3000`:

```bash
sudo apt-get install -y nginx
sudo nano /etc/nginx/sites-available/cloudwear
```

Example Nginx config:

```nginx
server {
    listen 80;
    server_name YOUR_EC2_PUBLIC_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/cloudwear /etc/nginx/sites-enabled/cloudwear
sudo nginx -t
sudo systemctl restart nginx
```

## Acceptance Checklist

- `npm install` installs frontend and backend workspace dependencies
- `npm run build` builds React and Express TypeScript
- `npm start` serves the app from Express
- `/api/health` returns OK
- Frontend opens from the same deployed URL
- CRUD operations use PostgreSQL
- Database credentials are environment variables only
- App uses one production port: `process.env.PORT || 3000`
