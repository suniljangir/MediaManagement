import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Box,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Switch,
  Tooltip,
  TablePagination,
} from '@mui/material';
import {
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Storage as StorageIcon,
  School as SchoolIcon,
  Event as EventIcon,
  PhotoLibrary as PhotoLibraryIcon,
} from '@mui/icons-material';
import axios from 'axios';

const AdminDashboard = () => {
  const [schools, setSchools] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [schoolsResponse, statsResponse] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/schools', { headers }),
        axios.get('http://localhost:5000/api/admin/stats', { headers }),
      ]);

      setSchools(schoolsResponse.data);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleBanToggle = async (schoolId, currentBanStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/admin/schools/${schoolId}/ban`,
        { banned: !currentBanStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSchools(schools.map(school => 
        school.id === schoolId 
          ? { ...school, banned: !school.banned }
          : school
      ));
    } catch (error) {
      console.error('Error toggling ban status:', error);
      setError('Failed to update ban status');
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

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

      {/* Stats Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <SchoolIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Schools</Typography>
              </Box>
              <Typography variant="h4">{stats?.totalUsers || 0}</Typography>
              <Typography variant="body2" color="textSecondary">
                Active: {stats?.activeSchools || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
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
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <EventIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Events</Typography>
              </Box>
              <Typography variant="h4">{stats?.totalEvents || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <StorageIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Storage Used</Typography>
              </Box>
              <Typography variant="h4">{stats?.totalSize || '0 B'}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Schools Table */}
      <Paper sx={{ width: '100%', mb: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>School Name</TableCell>
                <TableCell>Contact Person</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Email</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {schools
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((school) => (
                  <TableRow key={school.id}>
                    <TableCell>{school.username}</TableCell>
                    <TableCell>{school.school_name || '-'}</TableCell>
                    <TableCell>{school.contact_person || '-'}</TableCell>
                    <TableCell>{school.phone || '-'}</TableCell>
                    <TableCell>{school.email || '-'}</TableCell>
                    <TableCell align="center">
                      {school.banned ? (
                        <Tooltip title="Banned">
                          <BlockIcon color="error" />
                        </Tooltip>
                      ) : (
                        <Tooltip title="Active">
                          <CheckCircleIcon color="success" />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={school.banned ? 'Unban User' : 'Ban User'}>
                        <Switch
                          checked={!school.banned}
                          onChange={() => handleBanToggle(school.id, school.banned)}
                          color="primary"
                        />
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={schools.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Container>
  );
};

export default AdminDashboard; 