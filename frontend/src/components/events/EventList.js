import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import { PhotoLibrary as PhotoLibraryIcon } from '@mui/icons-material';
import axios from 'axios';

const EventList = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/events', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((event) =>
    event.event_name?.toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Events
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          fullWidth
          label="Search Events"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 3 }}
        />
      </Box>

      {filteredEvents.length > 0 ? (
        <Grid container spacing={3}>
          {filteredEvents.map((event) => (
            <Grid item xs={12} sm={6} md={4} key={event.event_name}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <PhotoLibraryIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="h2">
                      {event.event_name}
                    </Typography>
                  </Box>
                  <Typography color="textSecondary" gutterBottom>
                    Media Files: {event.mediaCount}
                  </Typography>
                  <Typography color="textSecondary">
                    Last Upload: {new Date(event.lastUpload).toLocaleDateString()}
                  </Typography>
                  <Tooltip title="View media from this event">
                    <IconButton
                      color="primary"
                      onClick={() => navigate(`/?event=${encodeURIComponent(event.event_name)}`)}
                      sx={{ mt: 1 }}
                    >
                      <PhotoLibraryIcon />
                    </IconButton>
                  </Tooltip>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="textSecondary">
            {searchTerm ? 'No events found matching your search' : 'No events yet'}
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default EventList; 