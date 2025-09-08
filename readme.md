# Real-Time Auction System

## Overview
This project is a mini real-time auction platform built with React (frontend) and Node.js/Express (backend).  
It allows sellers to create auctions and buyers to participate in real-time bidding with instant updates using WebSockets.  
Auctions automatically end after the set duration, notify participants, and send confirmation emails to both seller and winning bidder.

---

## Features
- Auction Creation: Sellers can create auctions with item details, starting price, bid increment, duration, and seller info.  
- Real-Time Bidding: Buyers can join active auctions and place bids instantly.  
- Live Updates: Current highest bid and bidder are updated live for all participants using WebSockets.  
- Countdown Timer: Auctions display a live timer until closing.  
- Auction End Handling: When time expires:
  - Winner and seller are notified in-app
  - Confirmation emails are sent via SendGrid
- Redis Integration: Highest bid tracking stored in Upstash Redis for fast retrieval  
- Database: PostgreSQL (Supabase) with Sequelize ORM for auctions and bids  
- Deployment: Backend containerized with Docker and deployable on Render.com  

---

## Tech Stack

**Frontend**
- React.js with hooks  
- Axios for API requests  
- Socket.IO client for real-time communication  

**Backend**
- Node.js + Express  
- PostgreSQL with Sequelize ORM  
- Socket.IO for WebSockets  
- Redis (Upstash) for bid state management  
- SendGrid for email notifications  

---


---

## Setup Instructions

### Prerequisites
- Node.js >= 16  
- PostgreSQL (Supabase recommended)  
- Redis (Upstash free tier)  
- SendGrid API key (for email notifications)  

## Environment Variables

Create a single `.env` file at the **project root** with the following variables:
Server configuration
PORT=3000

Database (PostgreSQL / Supabase)
DATABASE_URL=your_postgres_connection_url

Redis (Upstash)
UPSTASH_REDIS_URL=your_upstash_url

Email (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=your_verified_sender_email

Frontend configuration
REACT_APP_BACKEND_URL=http://localhost:3000

## Deployment

1. Dockerize the application  
   - Use a single `Dockerfile` that builds the frontend and serves the backend in one container.

2. Deploy on Render.com  
   - Push to a public GitHub repository.  
   - Create a new Render Web Service from the repo and choose the Docker option.  
   - Add all environment variables in Render’s dashboard (both backend and frontend values as needed).  
   - Deploy using the Dockerfile.

3. Keep the service warm (free tier)  
   - Set up a job on cron-job.org to hit a public endpoint of your app periodically (e.g., every 5–10 minutes).


