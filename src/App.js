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

const reasonsMapping =  {
    TREND_DIRECTION_CHANGE:"Trend Direction Changed.",
    STOP_LOSS_HIT: "Stop loss trigger",
    DAY_TIME_END: "Time limit end for the day.",
    "":""
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
  const [brokerage, setBrokerage] = useState(0);
  const [openOrder, setOpenOrder] = useState(null);
  const [instrumentsList, setInstrumentsList] = useState(null)
  const [jsonAPIResponse, setJsonAPIResponse] = useState()
  const [isLoadingSuperTrend, setIsLoadingSuperTrend] = useState(false)
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)

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
    return () => {clearInterval(intervalId)};
  }, []);


  const fetchAllOrders = async () => {
    try {
      setIsLoadingOrders(true)
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

          let diff = squareOffOrd.price - initialOrd.price;
          // if(initialOrd.optiontype == "CE"){
          //   diff = squareOffOrd.instrumentPrice - initialOrd.instrumentPrice
          // }else{
          //   diff = initialOrd.instrumentPrice - squareOffOrd.instrumentPrice
          // }
          
          formatedOrders.push({
            instrument: `NIFTY ${initialOrd.expirydate} ${initialOrd.strikeprice} ${initialOrd.optiontype}` ,
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
            instrument: `NIFTY ${initialOrd.expirydate} ${initialOrd.strikeprice} ${initialOrd.optiontype}` ,
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

      const completeOrders = formatedOrders.filter((x) => x.orderStatus === "Executed");
      
      const totalPnl = completeOrders?.reduce((acc, order) => acc + (Number(order.difference) || 0), 0) || 0;

      const brokerage = response.length * 20
      setBrokerage(brokerage)
      setTotalReturn(totalPnl.toFixed(2));
    } catch (e) {
      console.error("Error fetching orders:", e);
    } finally{
      setIsLoadingOrders(false)
    }
  };

  const isAllowedTime = () => moment().isBetween(marketStartTime, marketEndTime);

  const logout = async() => {
    clearSession();
    setIsUserLoggedIn(false);
    await fetchData("logout");
  }

  const fetchSuperTrend = async() => {
    try{
      setIsLoadingSuperTrend(true)
      const response = await fetchData(`getSuperTrend`, "GET");
      setJsonAPIResponse(response.reverse())

    }catch(e){
      console.log(e)
    }finally{
      setIsLoadingSuperTrend(false)
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
              {!isAllowedTime() && isUserLoggedIn && <Paper elevation={2} className="notice"> <label>Orders will be executed only between {marketStartTime.format("hh:mm A")} and {marketEndTime.format("hh:mm A")}.</label></Paper>}
              
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
                              <Box className="header" sx={{m: 2 }}>
                                {/* <Box><span className="instrument">Brokerage:</span>  <span>{brokerage } Rs</span> </Box> */}
                                <Box><Button  variant="contained" onClick={()=>(fetchSuperTrend())}>Get SuperTrend</Button></Box>
                                <Box><Button  variant="contained" onClick={()=>(fetchAllOrders())}>Get orders</Button></Box>
                              </Box>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2, md: 4 }}  sx={{mt:'20px'}}  alignItems="center" justifyContent={'space-evenly'}>
                              <Box sx={{ width: { xs: "100%", sm: "auto" }, px: { xs: 2, sm: 0 } }}>
                                <Card variant="outlined" >
                                  <CardContent >
                                    <StockPrice getLTP={setLTP} />
                                  </CardContent>
                                </Card>
                              </Box>
                               
                              
                              <Box sx={{ width: { xs: "100%", sm: "auto" }, px: { xs: 2, sm: 0 } }}>
                                <Card variant="outlined">
                                  <CardContent>
                                    <Typography variant="h6" >Direction</Typography>
                                    {
                                      jsonAPIResponse?.length > 0 ? 
                                        <>
                                          <Typography variant="h6" color={jsonAPIResponse[0]['superTrendDirection']  == 'up' ? "green" : "red"}>
                                            {jsonAPIResponse[0]['superTrendDirection'] }
                                          </Typography>
                                        </> 
                                        : "-"
                                    }
                                    
                        
                                  </CardContent>
                                </Card>
                              </Box>
                              
                              
                              <Box sx={{ width: { xs: "100%", sm: "auto" } , px: { xs: 2, sm: 0 } }}>
                                <Card variant="outlined">
                                  <CardContent>
                                    <Typography variant="h6" >SuperTrend</Typography>
                                    {
                                      jsonAPIResponse?.length > 0 ?  <>
                                          <Typography variant="h6">
                                          {jsonAPIResponse[0]['superTrendValue'] }
                                          </Typography>
                                        </> 
                                      : "-" 
                                    }
                                    
                        
                                  </CardContent>
                                </Card>
                              </Box>

                             
                                  
                              {/* <ATRCalculator candles={candleData} multiplier={2} limit={20} setSuperTrendToParent={setSuperTrend} /> */}
                            </Stack>

                           
                            {
                              jsonAPIResponse?.length > 0 && <div className="container">
                              <h2>Super Trend History</h2>
                              <div className="data-container">
                                {isLoadingSuperTrend && "Loading..."}
                                {!isLoadingSuperTrend && jsonAPIResponse?.length > 0 && jsonAPIResponse.map((item) => (
                                  <div key={item._id} className={`data-card ${item.superTrendDirection}`}>
                                    <p><strong>Time:</strong> {item.createdAt}</p>
                                    <p><strong>Value:</strong> {item.superTrendValue}</p>
                                    <p><strong>Direction:</strong> <span>{item.superTrendDirection}</span></p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            }
                            
                            <Stack direction="column" spacing={2}   sx={{mt:'20px'}}>
                              
                              <Box><span className="instrument">P&L:</span>  <span className={totalReturn >= 0 ? 'profit':'loss'}>{totalReturn} Points;  ({(totalReturn * orderQty).toLocaleString('en-IN')} Rs.)</span> </Box>
                              
                              {
                                isLoadingOrders && "Loading ..."
                              }
                              {
                                !isLoadingOrders && ordersListTemp?.length > 0 && 
                                <>
                                  {ordersListTemp.map((row, ind) => {
                                    
                                    return (
                                      <>
                                      
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
                                              <label style={{fontSize:'12px'}}>{reasonsMapping[row.description]}</label>
                                              <label>
                                                {row.isPositive ? (
                                                  <span className="profit">Gain +{row?.difference }</span>
                                                ) : (
                                                  <span className="loss">Loss {row?.difference }</span>
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
