import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.appAddress);
let owner;

let oracleAccounts;

/**
 * Oracle {
 *  address: string
 *  indexes: Array<number>
 * }
 */
const oracles = [];

const ORACLE_REGISTRATION_FEE = web3.utils.toWei('1', 'ether');

async function authorizeAppContractToUseDataContract() {
  try {
    await flightSuretyData.methods.authorizeCaller(config.appAddress);
    console.log('authorizeAppContractToUseDataContract >> success');
  } catch (error) {
    console.log('authorizeAppContractToUseDataContract >> error=', error);
  }
}

// authorize contract
async function init () {
  console.log('>> async init called.');
  const accounts = await web3.eth.getAccounts();
  console.log('init >> accounts.length=', accounts.length);
  console.log('init >> accounts=', accounts);
  owner = accounts[0];
  console.log('init >> owner=', owner);

  await authorizeAppContractToUseDataContract();

  // Upon startup, 20 oracles are registered
  const oracleAccounts = accounts.slice(20, 40);
  console.log('init >> oraclesAccounts.legnth=', oracleAccounts.length);
  console.log('init >> oraclesAccounts=', oracleAccounts);
  for (let i = 0; i < oracleAccounts.length; i++) {
    const oracleAccount = oracleAccounts[i];
    console.log(`init >> index=${i} oracleAccount=${oracleAccount} registering`);
    try {
      await flightSuretyApp.methods.registerOracle().send({
        from: oracleAccount,
        value: ORACLE_REGISTRATION_FEE,
        gas: 6721975,
      });
      console.log(`init >> index=${i} oracleAccount=${oracleAccount} registered`);
    } catch (error) {
      console.log(`init >> index=${i} oracleAccount=${oracleAccount} register failed with error=`, error);
    }
  }
  // Oracles assigned indexes are persisted in memory
  for (let i = 0; i < oracleAccounts.length; i++) {
    const oracleAccount = oracleAccounts[i];
    try {
      console.log(`init >> index=${i} oracleAccount=${oracleAccount} quering indexes`);
      const indexes = await flightSuretyApp.methods.getMyIndexes().call({ from: oracleAccount });
      console.log(`init >> index=${i} oracleAccount=${oracleAccount} queried indexes=`, indexes);
      const oracle = {
        address: oracleAccount,
        indexes,
      };
      console.log('init >> persist the oracle=', JSON.stringify(oracle, null, 2));
      oracles.push(oracle);
    } catch (error) {
      console.log(`init >> index=${i} oracleAccount=${oracleAccount} query failed`);
    }
  }
  console.log('init >> persisted oracles=', JSON.stringify(oracles, null, 2));
}
init();


flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error)
    console.log(event)
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


