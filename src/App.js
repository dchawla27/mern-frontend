// src/App.js

import React, { useEffect, useState } from "react";
import { AppBar, Box, Toolbar, Button,  Typography, Stack } from "@mui/material";
import { styled } from '@mui/material/styles';
import { Paper, Card,CardContent, Container, Switch, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import moment from 'moment';
import StockPrice from "./StickPrice";
import LoginForm from "./LoginForm";
import fetchData from "./services/apiUtils";
import { clearSession } from "./common/functions";
import './App.css'


const reasonsMapping =  {
    TREND_DIRECTION_CHANGE:"Trend Direction Changed.",
    STOP_LOSS_HIT: "Stop loss trigger",
    DAY_TIME_END: "Time limit end for the day.",
    "":""
}




const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [ordersListTemp, setOrdersListTemp] = useState([]);
  const [totalReturn, setTotalReturn] = useState(0);
  const [jsonAPIResponse, setJsonAPIResponse] = useState()
  const [isLoadingSuperTrend, setIsLoadingSuperTrend] = useState(false)
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [settings, setSettings] = useState(null)
  const [isLiveOrdersAllowed, setIsLiveOrdersAllowed] = useState(null);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [pendingState, setPendingState] = useState(false);


  
  const orderQty = 75;
  const marketStartTime = moment().hour(9).minute(20);
  const marketEndTime = moment().hour(15).minute(0);


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
    fetchAllOrders();
    fetchSuperTrend();  
    fetchSettings()
    const intervalId = setInterval(healthCheck, 15 * 60 * 1000);
    return () => {clearInterval(intervalId)};
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetchData("getAllSettings", "GET");
      setSettings(response)
      setIsLiveOrdersAllowed(response.isLiveOrdresAllowed)
    }catch(e){
      console.log(e)
    }
  }

  const fetchAllOrders = async () => {
    try {
      setIsLoadingOrders(true)
      const response = await fetchData("getAllOrders", "GET");
      if (!response || response.length === 0) return;

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
      
      // setOrdersList(response.reverse());
      setOrdersListTemp(formatedOrders.reverse());

      const completeOrders = formatedOrders.filter((x) => x.orderStatus === "Executed");
      
      const totalPnl = completeOrders?.reduce((acc, order) => acc + (Number(order.difference) || 0), 0) || 0;

      // const brokerage = response.length * 20
      // setBrokerage(brokerage)
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
      setJsonAPIResponse(response)

    }catch(e){
      console.log(e)
    }finally{
      setIsLoadingSuperTrend(false)
    }
  }


  const AntSwitch = styled(Switch)(({ theme }) => ({
    width: 28,
    height: 16,
    padding: 0,
    display: "flex",
    "&:active": {
      "& .MuiSwitch-thumb": {
        width: 15,
      },
      "& .MuiSwitch-switchBase.Mui-checked": {
        transform: "translateX(9px)",
      },
    },
    "& .MuiSwitch-switchBase": {
      padding: 2,
      "&.Mui-checked": {
        transform: "translateX(12px)",
        color: "#fff",
        "& + .MuiSwitch-track": {
          opacity: 1,
          backgroundColor: theme.palette.mode === "dark" ? "#177ddc" : "#1890ff",
        },
      },
    },
    "& .MuiSwitch-thumb": {
      boxShadow: "0 2px 4px 0 rgb(0 35 11 / 20%)",
      width: 12,
      height: 12,
      borderRadius: 6,
      transition: theme.transitions.create(["width"], {
        duration: 200,
      }),
    },
    "& .MuiSwitch-track": {
      borderRadius: 16 / 2,
      opacity: 1,
      backgroundColor:
        theme.palette.mode === "dark" ? "rgba(255,255,255,.35)" : "rgba(0,0,0,.25)",
      boxSizing: "border-box",
    },
  }));

  const handleToggle = (event) => {
    setPendingState(event.target.checked); // Save new state temporarily
    setOpenConfirm(true); // Open confirmation dialog
  };

  const handleConfirm = async () => {
    setOpenConfirm(false);
    
    try {
      const {_id} = settings
      let dataToPass = {
        id: _id,
        isLiveOrdresAllowed: pendingState
      }
      await fetchData(`updateLiveOrdersSetting`, "POST",dataToPass);
      setIsLiveOrdersAllowed(pendingState)
      // setIsLiveOrdersAllowed(); // Apply new state only after success
    } catch (error) {
      console.error("API Error:", error);
    }
  };

  const handleCancel = () => {
    setOpenConfirm(false);
    // setPendingState(isLiveOrdersAllowed); // Revert switch
  };

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
                              {/* <IconButton size="large" edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }} >
                                <MenuIcon />
                              </IconButton> */}
                              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                                Algo Treding
                              </Typography>
                              {isUserLoggedIn ? <Button color="inherit" onClick={() => {logout()}}>Logout</Button> : <Button color="inherit">Login</Button>}
                            </Toolbar>
                          </AppBar>
                          
                          {isLiveOrdersAllowed !== null && <Stack direction="row" spacing={1} sx={{ alignItems: "center", px: 2, my: 2 }}>
                            <Typography sx={{ flexGrow: 1 }}>Live Orders:</Typography>
                            <Typography>{isLiveOrdersAllowed ? "Allowed" : "Not Allowed"}</Typography>
                            <AntSwitch
                              checked={isLiveOrdersAllowed}
                              onChange={handleToggle}
                              inputProps={{ "aria-label": "ant design" }}
                            />
                          </Stack>
                          }
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
                                    <StockPrice />
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
                            
                          </Box>
                                
                  </>
              }

                <Dialog open={openConfirm} onClose={handleCancel}>
                  <DialogTitle>Confirm Action</DialogTitle>
                  <DialogContent>
                    <Typography>
                      Are you sure you want to {pendingState ? "enable" : "disable"} Live Orders?
                    </Typography>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={handleCancel} color="secondary">Cancel</Button>
                    <Button onClick={handleConfirm} color="primary" variant="contained">Confirm</Button>
                  </DialogActions>
                </Dialog>
              </Paper>
              </Container>
      }
    </>
    
  );
};

export default App;
