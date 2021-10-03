import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

let config = Config['localhost'];
let web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws'))
);
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(
  FlightSuretyApp.abi,
  config.appAddress
);
let flightSuretyData = new web3.eth.Contract(
  FlightSuretyData.abi,
  config.appAddress
);
let owner;

/**
 * Oracle {
 *  address: string
 *  indexes: Array<number>
 * }
 */
const oracles = [];

const ORACLE_REGISTRATION_FEE = web3.utils.toWei('1', 'ether');

const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;
const STATUS_CODES = [
  STATUS_CODE_UNKNOWN,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_WEATHER,
  STATUS_CODE_LATE_TECHNICAL,
  STATUS_CODE_LATE_OTHER,
];

async function authorizeAppContractToUseDataContract() {
  try {
    await flightSuretyData.methods.authorizeCaller(config.appAddress);
    console.log('authorizeAppContractToUseDataContract >> success');
  } catch (error) {
    console.log('authorizeAppContractToUseDataContract >> error=', error);
  }
}

// authorize contract
async function init() {
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
    console.log(
      `init >> index=${i} oracleAccount=${oracleAccount} registering`
    );
    try {
      await flightSuretyApp.methods.registerOracle().send({
        from: oracleAccount,
        value: ORACLE_REGISTRATION_FEE,
        gas: 6721975,
      });
      console.log(
        `init >> index=${i} oracleAccount=${oracleAccount} registered`
      );
    } catch (error) {
      console.log(
        `init >> index=${i} oracleAccount=${oracleAccount} register failed with error=`,
        error
      );
    }
  }
  // Oracles assigned indexes are persisted in memory
  for (let i = 0; i < oracleAccounts.length; i++) {
    const oracleAccount = oracleAccounts[i];
    try {
      console.log(
        `init >> index=${i} oracleAccount=${oracleAccount} quering indexes`
      );
      const indexes = await flightSuretyApp.methods
        .getMyIndexes()
        .call({ from: oracleAccount });
      console.log(
        `init >> index=${i} oracleAccount=${oracleAccount} queried indexes=`,
        indexes
      );
      const oracle = {
        address: oracleAccount,
        indexes,
      };
      console.log(
        'init >> persist the oracle=',
        JSON.stringify(oracle, null, 2)
      );
      oracles.push(oracle);
    } catch (error) {
      console.log(
        `init >> index=${i} oracleAccount=${oracleAccount} query failed`
      );
    }
  }
  console.log('init >> persisted oracles=', JSON.stringify(oracles, null, 2));
}
init();

/**
 * example event:
 * { logIndex: 0,
  transactionIndex: 0,
  transactionHash: '0x096813cf02cdb247729cf25e54cb8b5391838d1847b3865f7b073dd19c508e31',
  blockHash: '0xd42a7c8b0c53146c08beeba47726fd7c84b09dec139c8930c52f1a85c04ce2c9',
  blockNumber: 8181,
  address: '0x6Da7226Fe5b6Cd9DFe7e7a2f5981450397297F8A',
  type: 'mined',
  id: 'log_79a6291f',
  returnValues:
   Result {
     '0': '2',
     '1': '0xf17f52151EbEF6C7334FAD080c5704D77216b732',
     '2': 'ABC0123',
     '3': '1633271696',
     index: '2',
     airline: '0xf17f52151EbEF6C7334FAD080c5704D77216b732',
     flight: 'ABC0123',
     timestamp: '1633271696' },
  event: 'OracleRequest',
  signature: '0x3ed01f2c3fc24c6b329d931e35b03e390d23497d22b3f90e15b600343e93df11',
  raw:
   { data: '0x0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000f17f52151ebef6c7334fad080c5704d77216b7320000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000006159bf90000000000000000000000000000000000000000000000000000000000000000741424330313233',
     topics:
      [ '0x3ed01f2c3fc24c6b329d931e35b03e390d23497d22b3f90e15b600343e93df11' ] } }
 */
flightSuretyApp.events.OracleRequest(
  {
    fromBlock: 0,
  },
  function (error, event) {
    if (error) {
      console.log('flightSuretyApp.events.OracleRequest >> error=', error);
      return;
    }

    console.log('flightSuretyApp.events.OracleRequest >> event=', event);
    let index = event.returnValues.index;
    let airline = event.returnValues.airline;
    let flight = event.returnValues.flight;
    let timestamp = event.returnValues.timestamp;

    // random status code
    let statusCode =
      STATUS_CODES[Math.floor(Math.random() * STATUS_CODES.length)];

    for (let i = 0; i < oracles.length; i++) {
      const oracle = oracles[i];
      if (oracle.indexes.includes(index)) {
        flightSuretyApp.methods
          .submitOracleResponse(index, airline, flight, timestamp, statusCode)
          .send({ from: oracle.address }, (error, result) => {
            if (error) {
              console.log(
                'flightSuretyApp.events.OracleRequest >> submit resposne failed',
                error
              );
              return;
            }
            const oracleJsonStr = JSON.stringify(oracle);
            console.log(
              `flightSuretyApp.events.OracleRequest >> oracle ${oracleJsonStr} submit response success for statusCode=${statusCode} into flight ${flight}`
            );
          });
      }
    }
  }
);

const app = express();
app.get('/api', (req, res) => {
  res.send({
    message: 'An API for use with your Dapp!',
  });
});

export default app;
