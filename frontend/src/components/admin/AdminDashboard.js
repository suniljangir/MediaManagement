import React, { useState } from 'react';
import {
  Container,
  Paper,
  Tabs,
  Tab,
  Box,
} from '@mui/material';
import SchoolsList from './SchoolsList';
import AdminMediaList from './AdminMediaList';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

const AdminDashboard = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="Schools" />
          <Tab label="Media Files" />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <SchoolsList />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <AdminMediaList />
      </TabPanel>
    </Container>
  );
};

export default AdminDashboard; 