import React, { useEffect, useState } from 'react';
import {Typography } from "@mui/material";

const StockPrice = () => {
  const [ltp, setLtp] = useState(null);

  useEffect(() => {
    const API_HOST = process.env.REACT_APP_API_HOST;
    const eventSource = new EventSource(`${API_HOST}stock-price`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLtp(data.ltp);
    };

    return () => eventSource.close(); // Cleanup on unmount
  }, []);

  return (
   <>
        <Typography variant="h6" >NIFTY</Typography>
        <Typography variant="h6">
            {ltp ? ltp.toFixed(2) : 'Loading...'}
        </Typography>
    </>
  );
};

export default StockPrice;
