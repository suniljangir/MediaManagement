# Media Management System

A full-stack application for managing media files (images and videos) with event organization capabilities.

## Features

- User authentication and authorization
- Event management (create, read, update, delete)
- Media upload and organization
- Tag-based media search
- Event-based media grouping
- Responsive design for all devices

## Tech Stack

### Backend
- Node.js with Express
- SQLite database
- JWT for authentication
- Multer for file uploads

### Frontend
- React
- Material-UI for components
- React Router for navigation
- Axios for API calls

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd media-management
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Create necessary directories:
```bash
cd ../backend
mkdir uploads
```

## Configuration

1. Create a `.env` file in the backend directory:
```env
PORT=5000
JWT_SECRET=your-secret-key
```

## Running the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## API Endpoints

### Authentication
- POST /api/register - Register a new user
- POST /api/login - Login user

### Events
- GET /api/events - Get all events
- GET /api/events/:id - Get specific event
- POST /api/events - Create new event
- PUT /api/events/:id - Update event
- DELETE /api/events/:id - Delete event

### Media
- GET /api/media - Get all media
- GET /api/media?eventId=:id - Get media by event
- POST /api/upload - Upload new media
- DELETE /api/media/:id - Delete media

## Project Structure

```
media-management/
├── backend/
│   ├── server.js
│   ├── database.sqlite
│   ├── uploads/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── README.md
```

## Security Considerations

- JWT tokens are used for authentication
- File uploads are restricted to specific types
- Passwords are hashed before storage
- API endpoints are protected with authentication middleware

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 