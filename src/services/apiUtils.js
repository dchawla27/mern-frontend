import { getLocalStorageItem } from "../common/functions";

const API_HOST = process.env.REACT_APP_API_HOST;

const fetchData = async (endpoint, method = 'GET', body = null) => {
  const url = `${API_HOST}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'api_key': 'diDHdAha',         // Fetch from localStorage or use empty string
    'access_token': getLocalStorageItem('access_token'), // Fetch from localStorage or use empty string
    'feed_token': getLocalStorageItem('feed_token'),  
    'refresh_token': getLocalStorageItem('refresh_token'),  
    'client_code': 'AAAB104281',        
  };

  
  const options = {
    method,
    headers: defaultHeaders,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

export default fetchData;
