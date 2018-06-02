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
  },

  update : function(candle)
  {
    this.updateState(candle);
    if(this.state.mode == 'scalp' && !this.checkForBreakout(candle)){
      this.scalp(candle);
    }
    else{
      this.checkForBreakoutEnd(candle);
    }
  },

  updateState : function(candle)
  {
    this.state.price = candle.close;
    
    if(candle.high > this.state.lastHighPrice)
      this.state.lastHighPrice = candle.high;
    
    if(candle.low < this.state.lastLowPrice)
      this.state.lastLowPrice = candle.low;
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

    if((price - smma)/smma * 100 > this.settings.scalpSellThreshold)
      this.state.position = 'short';

    if((price - smma)/smma * 100 < this.settings.scalpBuyThreshold)
      this.state.position = 'long';

  },
  checkForBreakout : function(candle) {
    const price = candle.close;
    const stopPrice = this.lastHighPrice * ((100 - this.settings.breakoutThreshold) / 100);
    const startPrice = this.lastLowPrice * ((100 + this.settings.breakoutThreshold) / 100);

    if(this.state.position == 'long' && price < stopPrice){
      this.state.mode = 'breakdown';
      this.short(price);
    }
    else if(this.state.position == 'short' && price > startPrice){
      this.state.mode = 'breakup';
      this.long(price);
    }
    
  },
  checkForBreakoutEnd : function(candle) {
    const smma = this.indicators.SMMA.result;
    const price = candle.close;
    return Math.abs(price - smma) < this.settings.breakoutEndThreshold;
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
    log.debug(JSON.stringify(this.state));
  },
  end : function() {
    log.debug(`Number of breakouts: ${this.numberOfBreakouts}`);
  }
};

module.exports = strategy;
