import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Event as EventIcon,
  PhotoLibrary as PhotoLibraryIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import axios from 'axios';

const Dashboard = () => {
  const navigate = useNavigate();
  const [recentMedia, setRecentMedia] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchDashboardData();
  }, [sortBy, sortOrder]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [mediaResponse, statsResponse] = await Promise.all([
        axios.get(`http://localhost:5000/api/media?sortBy=${sortBy}&order=${sortOrder}&limit=8`, { headers }),
        axios.get('http://localhost:5000/api/stats', { headers }),
      ]);

      setRecentMedia(mediaResponse.data);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Stats Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <PhotoLibraryIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Files</Typography>
              </Box>
              <Typography variant="h4">{stats?.totalFiles || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <EventIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Events</Typography>
              </Box>
              <Typography variant="h4">{stats?.totalEvents || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <StorageIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Storage Used</Typography>
              </Box>
              <Typography variant="h4">{stats?.totalSize || '0 MB'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Button
                fullWidth
                variant="contained"
                startIcon={<CloudUploadIcon />}
                onClick={() => navigate('/upload')}
                sx={{ height: '100%', minHeight: '80px' }}
              >
                Upload New Media
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Events Section */}
      {stats?.recentEvents?.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Recent Events
          </Typography>
          <Grid container spacing={2}>
            {stats.recentEvents.map((event, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{event.event_name}</Typography>
                    <Typography color="textSecondary">
                      Last Upload: {new Date(event.last_upload).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Media Section */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Recent Media</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small">
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="date">Date</MenuItem>
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="event">Event</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Order</InputLabel>
            <Select
              value={sortOrder}
              label="Order"
              onChange={(e) => setSortOrder(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="desc">Newest First</MenuItem>
              <MenuItem value="asc">Oldest First</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {recentMedia.map((media) => (
          <Grid item xs={12} sm={6} md={3} key={media.id}>
            <Card>
              <CardMedia
                component={media.type.startsWith('.mp4') ? 'video' : 'img'}
                height="160"
                image={`http://localhost:5000/uploads/${media.filename}`}
                alt={media.filename}
              />
              <CardContent>
                <Typography variant="subtitle2" noWrap>
                  {media.event_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {new Date(media.upload_date).toLocaleDateString()}
                </Typography>
                {media.remarks && (
                  <Tooltip title={media.remarks}>
                    <Typography variant="body2" color="textSecondary" noWrap>
                      {media.remarks}
                    </Typography>
                  </Tooltip>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {recentMedia.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="textSecondary">
            No media uploaded yet
          </Typography>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => navigate('/upload')}
            sx={{ mt: 2 }}
          >
            Upload Your First Media
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default Dashboard; 