import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Box,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openEdit, setOpenEdit] = useState(false);
  const [editedEvent, setEditedEvent] = useState({
    name: '',
    date: '',
    description: '',
  });

  useEffect(() => {
    fetchEventData();
  }, [id]);

  const fetchEventData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [eventResponse, mediaResponse] = await Promise.all([
        axios.get(`http://localhost:5000/api/events/${id}`, { headers }),
        axios.get(`http://localhost:5000/api/media?eventId=${id}`, { headers }),
      ]);

      setEvent(eventResponse.data);
      setEditedEvent({
        name: eventResponse.data.name,
        date: eventResponse.data.date,
        description: eventResponse.data.description,
      });
      setMedia(mediaResponse.data);
    } catch (error) {
      console.error('Error fetching event data:', error);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleEditEvent = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/events/${id}`,
        editedEvent,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setEvent({ ...event, ...editedEvent });
      setOpenEdit(false);
    } catch (error) {
      console.error('Error updating event:', error);
      setError('Failed to update event');
    }
  };

  const handleDeleteEvent = async () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/events/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        navigate('/events');
      } catch (error) {
        console.error('Error deleting event:', error);
        setError('Failed to delete event');
      }
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!event) {
    return (
      <Container>
        <Alert severity="error">Event not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
        }}
      >
        <Typography variant="h4" component="h1">
          {event.name}
        </Typography>
        <Box>
          <Button
            startIcon={<EditIcon />}
            onClick={() => setOpenEdit(true)}
            sx={{ mr: 1 }}
          >
            Edit
          </Button>
          <Button
            startIcon={<DeleteIcon />}
            color="error"
            onClick={handleDeleteEvent}
          >
            Delete
          </Button>
        </Box>
      </Box>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Event Details
          </Typography>
          <Typography color="textSecondary" gutterBottom>
            Date: {new Date(event.date).toLocaleDateString()}
          </Typography>
          <Typography variant="body1">{event.description}</Typography>
        </CardContent>
      </Card>

      <Typography variant="h5" gutterBottom>
        Media
      </Typography>

      <Grid container spacing={3}>
        {media.map((item) => (
          <Grid item xs={12} sm={6} md={4} key={item.id}>
            <Card>
              <CardMedia
                component={item.type.startsWith('.mp4') ? 'video' : 'img'}
                height="200"
                image={`http://localhost:5000/uploads/${item.filename}`}
                alt={item.filename}
              />
              <CardContent>
                <Typography variant="body2" color="textSecondary">
                  Uploaded: {new Date(item.upload_date).toLocaleDateString()}
                </Typography>
                {item.tags && (
                  <Typography variant="body2" color="textSecondary">
                    Tags: {item.tags}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Edit Event Dialog */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)}>
        <DialogTitle>Edit Event</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Event Name"
            fullWidth
            value={editedEvent.name}
            onChange={(e) =>
              setEditedEvent({ ...editedEvent, name: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="Event Date"
            type="date"
            fullWidth
            value={editedEvent.date.split('T')[0]}
            onChange={(e) =>
              setEditedEvent({ ...editedEvent, date: e.target.value })
            }
            InputLabelProps={{
              shrink: true,
            }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={editedEvent.description}
            onChange={(e) =>
              setEditedEvent({ ...editedEvent, description: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
          <Button onClick={handleEditEvent} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EventDetail; 