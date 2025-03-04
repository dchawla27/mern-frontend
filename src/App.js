// src/App.js

import React, { useEffect, useRef, memo, useState } from "react";
import MenuIcon from '@mui/icons-material/Menu';
import { AppBar, Box, Toolbar, Button, IconButton,  Typography, Stack, Divider } from "@mui/material";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Card,CardContent,Grid, Container } from '@mui/material';
import moment from 'moment';
import ATRCalculator from "./ATRCalculator";
import StockPrice from "./StickPrice";
import LoginForm from "./LoginForm";
import fetchData from "./services/apiUtils";
import { clearSession, isSessionDetailsAvailable } from "./common/functions";
import './App.css'
const optionsExpiryMonth = process.env.REACT_APP_OPTIONS_EXPIRY_MONTH;


const NIFTY_FUTURES = [
  {
    "symboltoken": "35013",
    "tradingsymbol": "NIFTY27FEB25FUT",
  },
  {
    "symboltoken": "35001",
    "tradingsymbol": "NIFTY27MAR25FUT",
  },
  {
    "symboltoken": "54452",
    "tradingsymbol": "NIFTY24APR25FUT",
  }
]
const reasonsMapping =  {
    TREND_DIRECTION_CHANGE:"Trend Direction Changed.",
    STOP_LOSS_HIT: "Stop loss trigger",
    DAY_TIME_END: "Time limit end for the day.",
    "":""
}

const NIFTY_50 = {
  symboltoken: 99926000,
  exchage: 'NSE'
}
const NIFTY_FUTURE = {
  symboltoken: 35013,
  exchage: 'NFO'
}


const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [candleData, setCandleData] = useState([]);
  const [candleDataNiftyFuture, setCandleDataNiftyFuture] = useState([]);
  const [ltp, setLTP] = useState(-1);
  const [isOrderPlaced, setIsOrderPlaced] = useState(false);
  const [orderDirection, setOrderDirection] = useState(null);
  const [superTrend, setSuperTrend] = useState(null);
  const [ordersList, setOrdersList] = useState([]);
  const [ordersListTemp, setOrdersListTemp] = useState([]);
  const [totalReturn, setTotalReturn] = useState(0);
  const [openOrder, setOpenOrder] = useState(null);
  const [instrumentsList, setInstrumentsList] = useState(null)
  const [jsonAPIResponse, setJsonAPIResponse] = useState({})

  const isOrderAllowed = false
  const orderQty = 75;
  const instrument = "NIFTY 50";
  const invested = 200000
  const marketStartTime = moment().hour(9).minute(20);
  const marketEndTime = moment().hour(15).minute(0);
  const threePm = moment().hour(15).minute(0);


  useEffect(() => {
    const healthCheck = async () => {
      try {
        const response = await fetchData("healthCheck", "GET");
        setIsLoading(false)
        if (!response?.success && response?.message === "Invalid Token") {
          setIsUserLoggedIn(false);
        } else {
          setIsUserLoggedIn(true);
        }
      } catch (error) {
        console.error("Health Check Error:", error);
        setIsUserLoggedIn(false);
      }
    };

    healthCheck();
    const intervalId = setInterval(healthCheck, 15 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);


  useEffect(() => {
    if (!isLoading && isUserLoggedIn) {
      // fetchCandleData();
      // fetchAllOrders();
    }

    // if(isUserLoggedIn && !instrumentsList){
    //   fetchInstruments()
    // }
  }, [isUserLoggedIn, isLoading]);


  // useEffect(() => {
  //   if (ltp > 0 && superTrend) {
  //     prepareForOrder();
  //   }
  // }, [ltp, superTrend, openOrder]);


  // useEffect(() => {
  //   !isLoading && fetchAllOrders();
  // }, [isOrderPlaced]);


  // const fetchInstruments = async() => {
  //   if(isUserLoggedIn){
  //     try{
  //       const data = {
  //         "symboltoken": optionsExpiryMonth,
  //       }
  //       const response = await fetchData("searchScrip", "POST", data);
  //       setInstrumentsList(response)
  //     }catch(e){
  //       console.log(e)
  //     }
  //   }
  // }

  const fetchAllOrders = async () => {
    try {
      const response = await fetchData("getAllOrders", "GET");
      if (!response || response.length === 0) return;
      let consideredOrdersList = []

      let formatedOrders = []
      let orderChecked = []
      for(let i = 0; i < response.length; i++){
        if(!orderChecked.includes(response[i].orderid) && response[i].orderStatus == "complete" && response[i+1].orderStatus == "complete"){
          
          const initialOrd = response[i];
          const squareOffOrd = response[i+1];

          orderChecked.push(initialOrd.orderid)
          orderChecked.push(squareOffOrd.orderid)

          let diff = null;
          if(initialOrd.optiontype == "CE"){
            diff = squareOffOrd.instrumentPrice - initialOrd.instrumentPrice
          }else{
            diff = initialOrd.instrumentPrice - squareOffOrd.instrumentPrice
          }
          
          formatedOrders.push({
            instrument:initialOrd.instrument,
            orderStatus: "Executed",
            orderPlaceTime: initialOrd.date,
            orderSettleTime: squareOffOrd.date,
            orderTypeSeq1: initialOrd.type,
            orderTypeSeq2: squareOffOrd.type,
            difference: diff.toFixed(2),
            percentage: ((diff / initialOrd.price) * 100).toFixed(2),
            isPositive: diff >= 0,
            qty: initialOrd.qty,
            pnl: diff,
            superTrendValueAtOrderPlace: initialOrd.superTrendValue,
            superTrendValueAtSettleOrder: squareOffOrd.superTrendValue,
            price1: initialOrd.price,
            price2: squareOffOrd.price,
            invested: initialOrd.price * initialOrd.qty,
            description: squareOffOrd['description'],
            instrumentPrice1 : initialOrd.instrumentPrice,
            instrumentPrice2 : squareOffOrd.instrumentPrice
          })

        }


        if(!orderChecked.includes(response[i].orderid) && response[i].orderStatus == "open"){

          const initialOrd = response[i];
          orderChecked.push(initialOrd.orderid)

          formatedOrders.push({
            instrument:initialOrd.instrument,
            orderStatus: "OPEN",
            orderPlaceTime: initialOrd.date,
            orderSettleTime: null,
            orderTypeSeq1: initialOrd.type,
            orderTypeSeq2: null,
            difference: null,
            percentage: null,
            isPositive: null,
            qty: initialOrd.qty,
            pnl: null,
            superTrendValueAtOrderPlace: initialOrd.superTrendValue,
            superTrendValueAtSettleOrder: null,
            price1: initialOrd.price,
            price2: null,
            invested: initialOrd.price * initialOrd.qty,
            description: null,
            instrumentPrice1 : initialOrd.instrumentPrice,
            instrumentPrice2 : null
          })

        }
        
      }
      
      setOrdersList(response.reverse());
      setOrdersListTemp(formatedOrders.reverse());

      const completeOrders = response.filter((x) => x.orderStatus === "complete");
      
      // const totalPnl = completeOrders.reduce((acc, order) => {
      //   return order.type === "Sell" ? acc + order.price : acc - order.price;
      // }, 0);

      const totalPnl = 0
      setTotalReturn(totalPnl);
    } catch (e) {
      console.error("Error fetching orders:", e);
    }
  };

  // const createDBOrder = async (order) => {
  //   try {
  //     await fetchData("placeOrder", "POST", order);
  //   } catch (e) {
  //     console.error("Error placing order:", e);
  //   }
  // };

  // const prepareForOrder = async () => {
  //   if(!isOrderAllowed) return 
  //   if (!isAllowedTime() && !isOrderPlaced) return;

  //   const { direction, upperBands, lowerBands } = superTrend;
  //   const currentSuperTrendValue = direction === "up" ? upperBands : lowerBands;
  //   let targetPrice = null
  //   let description = ''
  //   let orderType = direction === "up" ? "Buy" : "Sell";

  //   if (isOrderPlaced) {
  //     orderType = orderDirection === "Sell" ? "Buy" : "Sell";

  //     if (isTimeAfterThreePm()) {
  //       targetPrice = +ltp.toFixed();
  //       description = "DAY_TIME_END"
  //     } else if ((orderDirection === "Sell" && direction === "up") || (orderDirection === "Buy" && direction === "down")) {
  //       targetPrice = ltp;
  //       description = "TREND_DIRECTION_CHANGE"
  //     } else {
  //       const { price } = openOrder;
  //       if(orderDirection === "Sell"){
  //         const diff = ltp - price;
  //         if (diff >= 30) {
  //           targetPrice = ltp
  //           description = "STOP_LOSS_HIT"
  //         }
  //       }
  //       if(orderDirection === "Buy"){
  //         const diff = price - ltp;  
  //         if (diff >= 30) {
  //           targetPrice = ltp
  //           description = "STOP_LOSS_HIT"
  //         }
  //       }
  //     } 
  //   }else{
  //     targetPrice = direction === "up" ? currentSuperTrendValue + 20 : currentSuperTrendValue - 20;
  //   }

  //   if (targetPrice && +ltp.toFixed() === targetPrice) {
  //     const newOrder = {
  //       date: moment().format(),
  //       price: +ltp,
  //       type: orderType,
  //       qty: orderQty,
  //       superTrendValue: +currentSuperTrendValue,
  //       orderStatus: "open",
  //       description
  //     };

  //     await createDBOrder(newOrder);

  //     setIsOrderPlaced(!isOrderPlaced);
  //     setOrderDirection(isOrderPlaced ? null : orderType);
  //   }
  // };

  const fetchCandleData = async () => {
    try {
      const symboltoken =  99926000;
      const exchage= 'NSE';
      const response = await fetchData(`getCandleData?symboltoken=${symboltoken}&exchange=${exchage}`, "GET");
      setCandleData(response || []);
      // if(symboltoken ==  NIFTY_50.symboltoken){
      //   setCandleData(response || []);
      // }else{
      //   setCandleDataNiftyFuture(response || []);
      // }
      
    } catch (error) {
      console.error("Error fetching candle data:", error);
    }
  };

  const isAllowedTime = () => moment().isBetween(marketStartTime, marketEndTime);
  // const isTimeAfterThreePm = () => moment().isAfter(threePm);

  const calculatePnL = (orders) => {
    let closedTrades = [];
    let openTrades = [];
    let totalPnL = 0;
  
    for (let i = 0; i < orders.length - 1; i++) {
      if (orders[i].orderStatus === "complete" && orders[i + 1].orderStatus === "complete") {
        let pnl = (orders[i + 1].price - orders[i].price) * orders[i].qty;
        totalPnL += pnl;
        closedTrades.push({
          buyPrice: orders[i].price,
          sellPrice: orders[i + 1].price,
          pnl,
        });
        i++; // Skip the next order since it's part of the square-off pair
      } else {
        openTrades.push(orders[i]);
      }
    }
  
    return { closedTrades, openTrades, totalPnL };
  };

  const selectOption = (options, orderType, ltp) => {
    const isBuy = orderType === "Buy";
    const suffix = isBuy ? "CE" : "PE";

    // Extract available strike prices
    const filteredOptions = options
        .filter(o => o.tradingsymbol.endsWith(suffix)) // Filter by CE or PE
        .map(o => {
            const match = o.tradingsymbol.match(/(\d{5})(?=CE|PE)/); // Extract last 5 digits before CE/PE
            return {
                ...o,
                strike: match ? parseInt(match[1]) : null
            };
        })
        .filter(o => o.strike !== null); // Ensure valid strike prices


        console.log('filteredOptions',filteredOptions)
    // Sort by nearest strike price >= LTP
    filteredOptions.sort((a, b) => a.strike - b.strike);

    // Find the first strike price that is >= LTP
    let selectedOption;
    if (isBuy) {
        // For Buy (CE): ITM means strike price ≤ LTP
        selectedOption = [...filteredOptions].reverse().find(o => o.strike <= ltp);
    } else {
        // For Sell (PE): ITM means strike price ≥ LTP
        selectedOption = filteredOptions.find(o => o.strike >= ltp);
    }
        console.log('important', selectedOption || null)
    return selectedOption || null; // Return the selected option or null if none found
  }

  const logout = async() => {
    clearSession();
    setIsUserLoggedIn(false);
    await fetchData("logout");
  }

  const fetchOrderBook = async() => {
    try{
      const response = await fetchData(`getOrderBook`, "GET");
      setJsonAPIResponse(response)

    }catch(e){
      console.log(e)
    }
  }

  const fetchTredBook = async() => {
    try{
      const response = await fetchData(`getTredBook`, "GET");
      setJsonAPIResponse(response)

    }catch(e){
      console.log(e)
    }
  }
  

  return (
    <>
      {
        isLoading ? "Loading..."
        :
        <Container fixed>
          <Paper elevation={3} >
              
              {!isUserLoggedIn && <LoginForm setIsLoading = {setIsLoading} setIsUserLoggedIn = {setIsUserLoggedIn} />}
              {!isAllowedTime() && isUserLoggedIn && <Paper elevation={3} className="notice"> <h3>Orders will be executed only between {marketStartTime.format("hh:mm A")} and {marketEndTime.format("hh:mm A")}.</h3> </Paper>}
              
              {
                isUserLoggedIn && 
                  <>
                          <AppBar position="static">
                            <Toolbar>
                              <IconButton size="large" edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }} >
                                <MenuIcon />
                              </IconButton>
                              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                              Algo Treding
                              </Typography>
                              {isUserLoggedIn ? <Button color="inherit" onClick={() => {logout()}}>Logout</Button> : <Button color="inherit">Login</Button>}
                            </Toolbar>
                          </AppBar>
                          <Box sx={{px: 2 }}>
                            {/* <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2, md: 4 }}  sx={{mt:'20px'}}  alignItems="center" justifyContent={'space-evenly'}>
                              <Box sx={{ width: { xs: "100%", sm: "auto" }, px: { xs: 2, sm: 0 } }}>
                                <Card variant="outlined" >
                                  <CardContent >
                                    <StockPrice getLTP={setLTP} />
                                  </CardContent>
                                </Card>
                              </Box>
                              <ATRCalculator candles={candleData} multiplier={2} limit={20} setSuperTrendToParent={setSuperTrend} />
                            </Stack> */}

                            {/* <Button variant="contained" onClick={() => {fetchOrderBook()}}> Get All Orders</Button>
                            <Button variant="contained" onClick={() => {fetchTredBook()}}> Get Settled Orders</Button> */}
                            {/* <Box>
                              {JSON.stringify(jsonAPIResponse)}
                            </Box> */}

                            <Stack direction="column" spacing={2}   sx={{mt:'20px'}}>
                              <Box className="header">
                                <Box><span className="instrument">P&L:</span>  <span className={totalReturn >= 0 ? 'profit':'loss'}>{totalReturn * orderQty} </span> </Box>
                                <Box><Button  variant="contained" onClick={()=>(fetchAllOrders())}>Get orders</Button></Box>
                              </Box>
                              
                              {
                                ordersListTemp?.length > 0 && 
                                <>
                                  {ordersListTemp.map((row, ind) => {
                                    
                                    return (
                                      <>
                                      <Box>{}</Box>
                                      <Box key={ind} className="trade-card">
                                        <div className="trade-header">
                                          <label className="instrument">{row.instrument}</label>
                                          <label className={`order-status ${row.orderStatus.toLowerCase()}`}>
                                            {row.orderStatus}
                                          </label>
                                        </div>
                                        <div className="trade-timing">
                                          <label>{moment(row?.orderPlaceTime).format("YYYY-MM-DD hh:mm A")}</label>
                                          <label>{row?.orderSettleTime && moment(row.orderSettleTime).format("YYYY-MM-DD hh:mm A")}</label>
                                        </div>
                                        <div className="trade-timing">
                                          <label>Nifty Price: {row.instrumentPrice1}</label>
                                          <label>{row?.instrumentPrice2 && 'Nifty Price:'}  {row?.instrumentPrice2} </label>
                                        </div>
                                        <div className="supertrend">
                                          <label>SuperTrend: <span>{row?.superTrendValueAtOrderPlace}</span></label>
                                          <label>{ row.superTrendValueAtSettleOrder && <>SuperTrend: <span>{row.superTrendValueAtSettleOrder}</span></>}</label>
                                        </div>
                                        <div className="trade-prices">
                                          <label>
                                            <span className="ord-seq">{row?.orderTypeSeq1}</span> @ {row?.price1}
                                          </label>
                                          <label>
                                            {row?.orderTypeSeq2 && <>
                                              <span className="ord-seq">{row?.orderTypeSeq2}</span> @ {row?.price2} 
                                              <span className={row.isPositive ? "profit" : "loss"}>
                                                  {/* ({row?.percentage}%) */}
                                                </span>
                                            </>}
                                          </label>
                                        </div>
                                        {
                                          row?.orderTypeSeq2 && <>
                                            <div className="divider"></div>
                                            <div className="trade-investment">
                                              <label>Invested: ₹{row.invested}</label>
                                              <label>{reasonsMapping[row.description]}</label>
                                              <label>
                                                {row.isPositive ? (
                                                  <span className="profit">Gain +{row?.difference } Points</span>
                                                ) : (
                                                  <span className="loss">Loss {row?.difference } Points</span>
                                                )}
                                              </label>
                                            </div>
                                          </>
                                        }
                                        
                                      </Box>
                                      </>
                                    );
                                  })}
                                </>
                              }
                            </Stack>
                            {/* <Divider  sx={{ borderWidth: 2, margin:'0 0 20px 0' }} /> */}
                            {/* <Box>
                            { 
                              isOrderPlaced && <>
                                <Stack direction="row" spacing={1} padding={'20px'} alignItems="center" justifyContent={'space-between'}>
                                  <Typography variant="h6" gutterBottom>
                                    Open Positions
                                  </Typography>
                                  <Button variant="contained" onClick={() => {fetchAllOrders()}}>Refresh</Button>
                                </Stack>
                                <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2, overflow: 'hidden' }}>
                                  <Table sx={{ minWidth: 650 }} aria-label="simple table">
                                    <TableHead>
                                      <TableRow sx={{  color: 'white' }}>
                                        <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Price</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>SuperTrend Value</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Qty</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {ordersList.filter(x=>x.orderStatus == 'open').map((row, ind) => (
                                        <TableRow
                                          key={row.ind}
                                          sx={{
                                            '&:nth-of-type(even)': {
                                              backgroundColor: '#f4f6f8',
                                            },
                                            '&:hover': {
                                              backgroundColor: '#e0e0e0',
                                            },
                                          }}
                                        >
                                          <TableCell>{ind + 1}</TableCell>
                                          <TableCell
                                            sx={{
                                              backgroundColor: row.type === 'Buy' ? 'green' : 'red',
                                              color: '#fff',
                                              fontWeight: 'bold',
                                              padding: '12px',
                                              textAlign: 'center',
                                            }}
                                          >
                                            {row.type}
                                          </TableCell>
                                          <TableCell >{row.date}</TableCell>
                                          <TableCell >{row.price.toFixed(2)}</TableCell>
                                          <TableCell >{row.superTrendValue}</TableCell>
                                          <TableCell >{row.qty}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              </>
                            }
                            
                            {
                              ordersList?.length > 0 && <>
                              <Stack direction="row" spacing={1} padding={'20px'} alignItems="center" justifyContent={'space-between'}>
                                <Typography variant="h6" gutterBottom>
                                  Completed Orders
                                </Typography>
                                <Button variant="contained" onClick={() => {fetchAllOrders()}}>Refresh</Button>
                              </Stack>
                              <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2, overflow: 'hidden' }}>
                                <Table sx={{ minWidth: 650 }} aria-label="simple table">
                                  <TableHead>
                                    <TableRow sx={{  color: 'white' }}>
                                      <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Price</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>SuperTrend Value</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Qty</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {ordersList.filter(x=>x.orderStatus !== 'open').map((row, ind) => (
                                      <TableRow
                                        key={row.ind}
                                        sx={{
                                          '&:nth-of-type(even)': {
                                            backgroundColor: '#f4f6f8',
                                          },
                                          '&:hover': {
                                            backgroundColor: '#e0e0e0',
                                          },
                                        }}
                                      >
                                        <TableCell>{ind + 1}</TableCell>
                                        <TableCell
                                          sx={{
                                            backgroundColor: row.type === 'Buy' ? 'green' : 'red',
                                            color: '#fff',
                                            fontWeight: 'bold',
                                            padding: '12px',
                                            textAlign: 'center',
                                          }}
                                        >
                                          {row.type}
                                        </TableCell>
                                        <TableCell >{row.date}</TableCell>
                                        <TableCell >{row.price.toFixed(2)}</TableCell>
                                        <TableCell >{row.superTrendValue}</TableCell>
                                        <TableCell >{row.qty}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                              </>
                            }
                            
                            </Box> */}
                          </Box>
                                
                  </>
              }
              </Paper>
              </Container>
      }
    </>
    
  );
};

export default App;
