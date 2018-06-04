var log = require('../core/log.js');
var config = require ('../core/util.js').getConfig();

var strategy = {

  init : function() {
    this.name = 'zschro breakout strategy';
    this.requiredHistory = config.tradingAdvisor.historySize;
    this.state = {
      position : 'none', //long, short
      previousPosition : 'short',
      mode : 'scalp', //scalp, breakup, breakdown
      price : 0,
      lastBuyPrice : 0,
      lastSellPrice : 0,
      lastHighPrice : 0,
      lastLowPrice : Number.MAX_SAFE_INTEGER,
    }
    this.addIndicator('SMMA', 'SMMA', this.settings.SMMA);
    this.addIndicator('EMALong', 'EMA', this.settings.EMALong);
    this.addIndicator('EMAShort', 'EMA', this.settings.EMAShort);
    this.numberOfBreakouts = 0;
  },

  update : function(candle)
  {
    this.updateState(candle);
    if(this.state.mode == 'scalp' && !this.checkForBreakout(candle)){
      this.scalp(candle);
    }
    else if(this.checkForBreakoutEnd(candle)) {
      this.state.mode = 'scalp';
    }
  },

  updateState : function(candle)
  {
    this.state.price = candle.close;
    
    if(candle.high > this.state.lastHighPrice && this.state.position == 'long')
      this.state.lastHighPrice = candle.high;
    
    if((candle.low < this.state.lastLowPrice || this.state.lastLowPrice == 0) && this.state.position == 'short')
      this.state.lastLowPrice = candle.low;

    if (this.state.lastBuyPrice == 0 || this.state.lastSellPrice == 0){
      this.state.lastBuyPrice = candle.close;
      this.state.lastSellPrice = candle.close;
    }
  },

  check : function(candle) {
    if(this.state.position == 'long' && this.state.previousPosition == 'short'){
      this.long(candle.close);
    }
    if(this.state.position == 'short' && this.state.previousPosition == 'long'){
      this.short(candle.close);
    }
  },
  scalp : function(candle) {
    const price = candle.close;
    const smma = this.indicators.SMMA.result;
    const diff = ((price - smma)/smma) * 100;
    
    if(diff > this.settings.scalpSellThreshold && 
      price > (this.state.lastBuyPrice * this.settings.profitFactor) &&
      this.state.position != 'short')
    {
      this.state.position = 'short';
      log.debug('scalp short');
    }
      

    if(diff < this.settings.scalpBuyThreshold && 
      price < (this.state.lastSellPrice * this.settings.profitFactor) && 
      this.state.position != 'long')
    {
      this.state.position = 'long';
      log.debug('scalp long');
    }
      

  },
  checkForBreakout : function(candle) {
    const price = candle.close;
    const stopPrice = this.state.lastHighPrice * ((100 - this.settings.breakoutThreshold) / 100);
    const startPrice = this.state.lastLowPrice * ((100 + this.settings.breakoutThreshold) / 100);
    //log.debug(`startPrice: ${startPrice}, stopPrice ${stopPrice}, price: ${price}`);
    if(this.state.position == 'long' && price < stopPrice){
      this.state.mode = 'breakdown';
      this.state.position = 'short';
      log.debug("\nBREAKOUT down\n");
      this.numberOfBreakouts ++;
      return true;
    }
    else if(this.state.position == 'short' && price > startPrice){
      this.state.mode = 'breakup';
      this.state.position = 'long';
      log.debug("\nBREAKOUT up\n");
      this.numberOfBreakouts ++;
      return true;
    }
    
  },
  checkForBreakoutEnd : function(candle) {
    const smma = this.indicators.SMMA.result;
    const emaLong = this.indicators.EMALong.result;
    const emaShort = this.indicators.EMAShort.result;
    const price = candle.close;
    const stable = Math.abs(price - smma) < this.settings.breakoutEndThreshold;
    const trendReset = this.state.mode == 'breakup' ? emaShort < emaLong : emaShort > emaLong;
    const profit = this.state.position == 'long' ?  price > this.state.lastBuyPrice : price < this.state.lastSellPrice ;
    
    //console.log(`breakout end check price: ${price}, smma${smma}, diff ${Math.abs(price - smma)} ${Math.abs(price - smma) < this.settings.breakoutEndThreshold}`);
    return stable && profit && trendReset;
  },
  long : function(price){
    log.debug(`Buying at: ${price}, Last sell price: ${this.state.lastSellPrice}`);
    this.state.lastBuyPrice = price;
    this.state.lastHighPrice = price;
    this.state.previousPosition = 'long';
    this.advice('long');
  },
  short : function(price){
    log.debug(`Selling at: ${price}, Last buy price: ${this.state.lastBuyPrice}`);
    this.state.lastLowPrice = price;
    this.state.lastSellPrice = price;
    this.state.previousPosition = 'short';
    this.advice('short');
  },
  log : function() {
    //log.debug(JSON.stringify(this.state));
  },
  end : function() {
    log.debug(`Number of breakouts: ${this.numberOfBreakouts}`);
  }
};

module.exports = strategy;
