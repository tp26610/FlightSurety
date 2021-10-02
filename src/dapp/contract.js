import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
  constructor(network) {
    let config = Config[network];
    this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
    this.flightSuretyApp = new this.web3.eth.Contract(
      FlightSuretyApp.abi,
      config.appAddress
    );
    this.owner = null;
    this.airlines = [];
    this.passengers = [];
  }

  async initialize() {
    const accts = await this.web3.eth.getAccounts();

    console.log('Contract.initialize >> accts=', accts);
    console.log('Contract.initialize >> accts.length=', accts.length);
    this.owner = accts[0];

    let counter = 1;

    while (this.airlines.length < 5) {
      this.airlines.push(accts[counter++]);
    }
    console.log('Contract.initialize >> airlines=', this.airlines);
    console.log(
      'Contract.initialize >> airlines.length=',
      this.airlines.length
    );

    while (this.passengers.length < 5) {
      this.passengers.push(accts[counter++]);
    }
    console.log('Contract.initialize >> passengers=', this.passengers);
    console.log(
      'Contract.initialize >> passengers.length=',
      this.passengers.length
    );
  }

  async isOperational() {
    let self = this;
    return await self.flightSuretyApp.methods
      .isOperational()
      .call({ from: self.owner });
  }

  async fetchFlightStatus(flight) {
    let self = this;
    let payload = {
      airline: self.airlines[0],
      flight: flight,
      timestamp: Math.floor(Date.now() / 1000),
    };
    return await self.flightSuretyApp.methods
      .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
      .send({ from: self.owner });
  }
}
