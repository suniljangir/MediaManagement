import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import EventList from './components/events/EventList';
import EventDetail from './components/events/EventDetail';
import MediaUpload from './components/media/MediaUpload';
import Navigation from './components/common/Navigation';
import Profile from './components/profile/Profile';
import AdminDashboard from './components/admin/AdminDashboard';

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const PrivateRoute = ({ children, allowedRoles = ['school', 'admin'] }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

const HomeRoute = () => {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AdminDashboard /> : <Dashboard />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Navigation />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <HomeRoute />
                </PrivateRoute>
              }
            />
            <Route
              path="/events"
              element={
                <PrivateRoute allowedRoles={['school']}>
                  <EventList />
                </PrivateRoute>
              }
            />
            <Route
              path="/events/:id"
              element={
                <PrivateRoute allowedRoles={['school']}>
                  <EventDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <PrivateRoute allowedRoles={['school']}>
                  <MediaUpload />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 