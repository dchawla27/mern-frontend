import React, { useState, useEffect } from "react";
import { Typography, Stack, Box, Card, CardContent } from "@mui/material";


const ATRCalculator = ({ candles, multiplier, limit, setSuperTrendToParent }) => {
  const [atrResult, setAtrResult] = useState(null);
  const [superTrendResult, setSuperTrendResult] = useState(null);
  const [upperBands, setUpperBands] = useState(null);
  const [lowerBands, setLowerBands] = useState(null);

  // Function to calculate ATR
  const calculateATR = async (candles, multiplier, limit) => {
    const lows = candles.map((c) => +c.low);
    const highs = candles.map((c) => +c.high);
    const closes = candles.map((c) => +c.close);

    let TRResults = [];
    for (let x = 1; x < candles.length; x++) {
      TRResults.push(
        Math.max(
          highs[x] - lows[x],
          Math.abs(highs[x] - closes[x - 1]),
          Math.abs(lows[x] - closes[x - 1])
        )
      );
    }

    let RMA_TR_Results = [TRResults[0]];
    const alpha = 1 / limit;
    for (let x = 1; x < TRResults.length; x++) {
      RMA_TR_Results.push(
        alpha * TRResults[x] + (1 - alpha) * RMA_TR_Results[x - 1]
      );
    }

    return RMA_TR_Results[RMA_TR_Results.length - 1] * multiplier;
  };

  // Function to calculate SuperTrend
  const calculateSuperTrend = async (candles, multiplier, limit) => {
    let upperBands = [];
    let lowerBands = [];
    let superTrends = [];

    for (let i = 0; i < candles.length; i++) {
      if (i >= limit * 4) {
        const lastCandle = +candles[i - 1].close;
        const currentCandle = +candles[i].close;
        const candlesATR = await calculateATR(
        //   candles.slice(i - limit * 4, i),
        candles.slice(i - (limit * 4), i),
          multiplier,
          limit
        );

        const basicUpperBand =
          (candles[i].high + candles[i].low) / 2 - candlesATR;
        const basicLowerBand =
          (candles[i].high + candles[i].low) / 2 + candlesATR;

        if (i === limit * 4) {
          upperBands.push(basicUpperBand);
          lowerBands.push(basicLowerBand);
          superTrends.push(true);
        } else {
          const lastUpperBand = upperBands[upperBands.length - 1];
          const lastLowerBand = lowerBands[lowerBands.length - 1];

          upperBands.push(
            lastCandle > lastUpperBand
              ? Math.max(basicUpperBand, lastUpperBand)
              : basicUpperBand
          );
          lowerBands.push(
            lastCandle < lastLowerBand
              ? Math.min(basicLowerBand, lastLowerBand)
              : basicLowerBand
          );

          const lastSuperTrend = superTrends[superTrends.length - 1];
          superTrends.push(
            !lastSuperTrend && currentCandle > lastLowerBand
              ? true
              : lastSuperTrend && currentCandle < lastUpperBand
              ? false
              : lastSuperTrend
          );
        }
      }
    }

    setUpperBands(upperBands[upperBands.length-1])
    setLowerBands(lowerBands[lowerBands.length-1])
    return superTrends[superTrends.length - 1];
  };

  useEffect(()=>{
    if(superTrendResult !== null && upperBands && lowerBands){
        console.log('superTrendResult',superTrendResult)
        setSuperTrendToParent({
            direction: superTrendResult? 'up':'down',
            upperBands: +upperBands.toFixed(),
            lowerBands: +lowerBands.toFixed()
        })
    }
  },[superTrendResult,upperBands,lowerBands])
  // Compute ATR and SuperTrend when the component mounts or props change
  useEffect(() => {
    if (candles.length > 0) {
      (async () => {
        const atr = await calculateATR(candles, multiplier, limit);
        setAtrResult(atr);

        const superTrend = await calculateSuperTrend(candles, multiplier, limit);
        setSuperTrendResult(superTrend);
      })();
    }
  }, [candles, multiplier, limit]);

  let res = "Calculating..."
  if(superTrendResult !== null){
    res = superTrendResult? upperBands : lowerBands
  }
  return (
    <>
      <Box sx={{ width: { xs: "100%", sm: "auto" }, px: { xs: 2, sm: 0 } }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" >Direction</Typography>
            {
              atrResult !== null ? 
                <>
                  <Typography variant="h6" color={superTrendResult ? "green" : "red"}>
                    {superTrendResult ? "UP" : "DOWN"}
                  </Typography>
                </> 
                : "Calculating..."
            }
            

          </CardContent>
        </Card>
      </Box>
      <Box sx={{ width: { xs: "100%", sm: "auto" } , px: { xs: 2, sm: 0 } }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" >SuperTrend</Typography>
            {
              atrResult !== null ? <>
                  <Typography variant="h6">
                  {superTrendResult ? upperBands.toFixed() : lowerBands.toFixed()}
                  </Typography>
                </> 
              : "Calculating..." 
            }
            

          </CardContent>
        </Card>
      </Box>
    </>
  );
};

export default ATRCalculator;
