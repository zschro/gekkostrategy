var log = require('../core/log.js');
var config = require ('../core/util.js').getConfig();

var strategy = {

  init : function() {
    this.name = 'zschro camarilla points';
    this.requiredHistory = config.tradingAdvisor.historySize;
    this.state = {
      position : 'none', //long, short
      mode : 'scalp', //scalp, breakup, breakdown
      price : 0,
      lastBuyPrice : 0,
      lastSellPrice : 0
    }
  },

  update : function(candle)
  {
    

  },
  check : function(candle) {
    
    
  },
  long : function(price){
    log.debug(`Buying at: ${price}, Last sell price: ${this.state.lastSellPrice}`);
    this.state.lastBuyPrice = price;
    this.state.position = 'long';
    this.advice('long');
  },
  short : function(price){
    log.debug(`Selling at: ${price}, Last buy price: ${this.state.lastBuyPrice}`);
    this.state.lastSellPrice = price;
    this.state.position = 'short';
    this.advice('short');
  },
  log : function() {
    
  },
  end : function() {
    log.debug(`Number of breakouts: ${this.breakouts}`);
  }
};

module.exports = strategy;
