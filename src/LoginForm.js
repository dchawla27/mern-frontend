import React, { useState } from 'react';
import { TextField, Button, Grid, Paper, Typography } from '@mui/material';
import fetchData from './services/apiUtils';
import { setItemIntoLocalStorage } from './common/functions';

const LoginForm = ({setIsUserLoggedIn}) => {
  const [formData, setFormData] = useState({
    clientcode: 'AAAB104281',
    password: '2019',
    totp: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetchData('login','POST',formData)
      if(response?.success){
        let result = response.data
        setItemIntoLocalStorage("access_token",result.jwtToken)
        setItemIntoLocalStorage("feed_token",result.feedToken)
        setItemIntoLocalStorage("refresh_token",result.refreshToken)
        setIsUserLoggedIn(true)
      }else{
        setError('Login failed. Please check your credentials.');  
      }
    //   console.log('Login successful:', response.data);
      // Handle success (e.g., redirect to another page or show success message)
    } catch (err) {
    //   console.error('Login failed:', err);
      setError('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container justifyContent="center" alignItems="center" style={{ minHeight: '100vh' }}>
      <Grid item xs={12} sm={8} md={4}>
        <Paper elevation={3} style={{ padding: '20px' }}>
          <Typography variant="h5" align="center" gutterBottom>
            Login Form
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Client Code"
              variant="outlined"
              fullWidth
              margin="normal"
              name="clientcode"
              value={formData.clientcode}
              onChange={handleChange}
            />
            <TextField
              label="Password"
              type="password"
              variant="outlined"
              fullWidth
              margin="normal"
              name="password"
              value={formData.password}
              onChange={handleChange}
            />
            <TextField
              label="TOTP"
              variant="outlined"
              fullWidth
              margin="normal"
              name="totp"
              value={formData.totp}
              onChange={handleChange}
            />
            {error && (
              <Typography color="error" variant="body2" align="center">
                {error}
              </Typography>
            )}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default LoginForm;
