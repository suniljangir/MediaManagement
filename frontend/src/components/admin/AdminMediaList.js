import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Box,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import axios from 'axios';

const AdminMediaList = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    event: '',
    school: '',
    dateFrom: '',
    dateTo: '',
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [schools, setSchools] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [mediaRes, schoolsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/media', { headers }),
        axios.get('http://localhost:5000/api/admin/schools', { headers }),
      ]);

      setMedia(mediaRes.data);
      setSchools(schoolsRes.data);

      // Extract unique events
      const uniqueEvents = [...new Set(mediaRes.data.map(item => item.event_name))];
      setEvents(uniqueEvents);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load media files');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (event) => {
    setFilters({
      ...filters,
      [event.target.name]: event.target.value,
    });
  };

  const clearFilters = () => {
    setFilters({
      event: '',
      school: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  const handleCheckboxChange = (mediaId) => {
    setSelectedFiles(prev => {
      if (prev.includes(mediaId)) {
        return prev.filter(id => id !== mediaId);
      } else {
        return [...prev, mediaId];
      }
    });
  };

  const downloadFile = async (filename) => {
    try {
      const response = await fetch(`http://localhost:5000/uploads/${filename}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download file');
    }
  };

  const downloadSelectedFiles = async () => {
    if (selectedFiles.length === 0) return;

    try {
      const selectedMedia = media.filter(item => selectedFiles.includes(item.id));
      
      if (selectedFiles.length === 1) {
        // Single file download
        downloadFile(selectedMedia[0].filename);
      } else {
        // Multiple files download as zip
        const token = localStorage.getItem('token');
        const response = await axios.post(
          'http://localhost:5000/api/admin/media/download',
          { files: selectedFiles },
          {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob',
          }
        );

        const blob = new Blob([response.data], { type: 'application/zip' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'media-files.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading files:', error);
      setError('Failed to download files');
    }
  };

  const filteredMedia = media.filter(item => {
    const matchesEvent = !filters.event || item.event_name === filters.event;
    const matchesSchool = !filters.school || item.user_id.toString() === filters.school;
    const matchesDateFrom = !filters.dateFrom || new Date(item.upload_date) >= new Date(filters.dateFrom);
    const matchesDateTo = !filters.dateTo || new Date(item.upload_date) <= new Date(filters.dateTo);
    return matchesEvent && matchesSchool && matchesDateFrom && matchesDateTo;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Event</InputLabel>
            <Select
              name="event"
              value={filters.event}
              onChange={handleFilterChange}
              label="Event"
            >
              <MenuItem value="">All Events</MenuItem>
              {events.map(event => (
                <MenuItem key={event} value={event}>{event}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>School</InputLabel>
            <Select
              name="school"
              value={filters.school}
              onChange={handleFilterChange}
              label="School"
            >
              <MenuItem value="">All Schools</MenuItem>
              {schools.map(school => (
                <MenuItem key={school.id} value={school.id.toString()}>
                  {school.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            name="dateFrom"
            label="From Date"
            type="date"
            value={filters.dateFrom}
            onChange={handleFilterChange}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            name="dateTo"
            label="To Date"
            type="date"
            value={filters.dateTo}
            onChange={handleFilterChange}
            InputLabelProps={{ shrink: true }}
          />

          <IconButton onClick={clearFilters} color="primary">
            <ClearIcon />
          </IconButton>

          {selectedFiles.length > 0 && (
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={downloadSelectedFiles}
            >
              Download Selected ({selectedFiles.length})
            </Button>
          )}
        </Box>
      </Paper>

      {/* Media Grid */}
      <Grid container spacing={3}>
        {filteredMedia.map((item) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
            <Card>
              <Box sx={{ position: 'relative' }}>
                <Checkbox
                  checked={selectedFiles.includes(item.id)}
                  onChange={() => handleCheckboxChange(item.id)}
                  sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
                />
                <CardMedia
                  component={item.type.startsWith('.mp4') ? 'video' : 'img'}
                  height="200"
                  image={`http://localhost:5000/uploads/${item.filename}`}
                  alt={item.filename}
                  sx={{ objectFit: 'cover' }}
                />
              </Box>
              <CardContent>
                <Typography variant="subtitle2" noWrap>
                  Event: {item.event_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  School: {schools.find(s => s.id === item.user_id)?.username || 'Unknown'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Date: {new Date(item.upload_date).toLocaleDateString()}
                </Typography>
              </CardContent>
              <CardActions>
                <Tooltip title="Download">
                  <IconButton onClick={() => downloadFile(item.filename)}>
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredMedia.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="textSecondary">
            No media files found
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default AdminMediaList; 