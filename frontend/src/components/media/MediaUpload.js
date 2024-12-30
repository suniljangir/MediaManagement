import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Grid,
  IconButton,
  LinearProgress,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Autocomplete,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

const MediaUpload = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [eventName, setEventName] = useState('');
  const [eventSuggestions, setEventSuggestions] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch event suggestions when user types
  const fetchEventSuggestions = async (query) => {
    if (!query) {
      setEventSuggestions([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/events/suggestions?query=${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEventSuggestions(response.data);
    } catch (error) {
      console.error('Error fetching event suggestions:', error);
    }
  };

  // Debounce function to limit API calls
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  };

  // Create debounced version of fetchEventSuggestions
  const debouncedFetchSuggestions = useCallback(
    debounce(fetchEventSuggestions, 300),
    []
  );

  const handleFilePreview = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  };

  const onDrop = useCallback(async (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer?.files || e.target.files);
    
    const validFiles = droppedFiles.filter(file => {
      const isValidType = /^(image\/(jpeg|png|gif)|video\/(mp4|quicktime))$/i.test(file.type);
      if (!isValidType) {
        setError('Some files were skipped. Only images (JPEG, PNG, GIF) and videos (MP4, MOV) are allowed.');
      }
      return isValidType;
    });

    const filesWithPreviews = await Promise.all(
      validFiles.map(async (file) => ({
        file,
        preview: await handleFilePreview(file),
      }))
    );

    setFiles(prev => [...prev, ...filesWithPreviews]);
    setError('');
  }, []);

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setUploadProgress(0);

    if (files.length === 0) {
      setError('Please select at least one file to upload');
      setLoading(false);
      return;
    }

    if (!eventName) {
      setError('Please enter an event name');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      files.forEach(({ file }) => formData.append('files', file));
      formData.append('eventName', eventName);
      formData.append('remarks', remarks);
      formData.append('tags', tags);

      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
        onUploadProgress: (progressEvent) => {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          setUploadProgress(Math.round(progress));
        },
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Upload Media
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Files uploaded successfully! Redirecting...
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Autocomplete
                freeSolo
                value={eventName}
                onChange={(event, newValue) => {
                  setEventName(newValue || '');
                }}
                onInputChange={(event, newInputValue) => {
                  setEventName(newInputValue);
                  debouncedFetchSuggestions(newInputValue);
                }}
                options={eventSuggestions}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Event Name"
                    required
                    helperText="Type an event name or select from suggestions"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Remarks"
                multiline
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                helperText="Separate tags with commas"
              />
            </Grid>

            <Grid item xs={12}>
              <Box
                sx={{
                  border: '2px dashed #ccc',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: 'primary.main',
                  },
                }}
                onDrop={onDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('fileInput').click()}
              >
                <input
                  type="file"
                  id="fileInput"
                  style={{ display: 'none' }}
                  onChange={onDrop}
                  accept="image/jpeg,image/png,image/gif,video/mp4,video/quicktime"
                  multiple
                />
                <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Drag and drop your files here
                </Typography>
                <Typography color="textSecondary">
                  or click to select files
                </Typography>
              </Box>
            </Grid>

            {files.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Selected Files ({files.length})
                </Typography>
                <Grid container spacing={2}>
                  {files.map((file, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card>
                        <CardMedia
                          component={file.file.type.startsWith('video/') ? 'video' : 'img'}
                          height="140"
                          image={file.preview}
                          alt={file.file.name}
                        />
                        <CardContent>
                          <Typography variant="body2" noWrap>
                            {file.file.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {(file.file.size / (1024 * 1024)).toFixed(2)} MB
                          </Typography>
                        </CardContent>
                        <CardActions>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveFile(index)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            )}

            {loading && (
              <Grid item xs={12}>
                <Box sx={{ width: '100%', mb: 2 }}>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                  <Typography variant="body2" color="textSecondary" align="center">
                    Uploading: {uploadProgress}%
                  </Typography>
                </Box>
              </Grid>
            )}

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || files.length === 0}
                >
                  {loading ? <CircularProgress size={24} /> : 'Upload Files'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default MediaUpload; 