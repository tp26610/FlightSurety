import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

function getDateTimeInSeconds(dateString) {
  return Math.floor(Date.parse(dateString) / 1000);
}

export default class Contract {
  flights = [
    {
      flight: 'ABC0123',
      from: 'TPE',
      to: 'TYO',
      timestamp: getDateTimeInSeconds('2012/09/28 23:34:43'),
    },
    {
      flight: 'DEF4567',
      from: 'SIN',
      to: 'MTN',
      timestamp: getDateTimeInSeconds('2012/09/29 23:34:43'),
    },
    {
      flight: 'GHI8901',
      from: 'KUL',
      to: 'HNL',
      timestamp: getDateTimeInSeconds('2012/09/30 23:34:43'),
    },
    {
      flight: 'LMN2345',
      from: 'PEN',
      to: 'YVR',
      timestamp: getDateTimeInSeconds('2012/10/01 23:34:43'),
    },
    {
      flight: 'OPE6789',
      from: 'IPH',
      to: 'YYZ',
      timestamp: getDateTimeInSeconds('2012/10/02 23:34:43'),
    },
  ];

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

    await this._registerFlightsToOwnerAirline();
  }

  async _registerFlightsToOwnerAirline() {
    for (let i = 0; i < this.flights.length; i++) {
      const flight = this.flights[i];
      try {
        await this.flightSuretyApp.methods
          .registerFlight(
            flight.flight,
            flight.from,
            flight.to,
            flight.timestamp
          )
          .send({
            from: this.owner,
            gas: 6721975, // cause a contract reverted if gas not provided. Maybe the default gas is too low
          });
        console.log(
          `_registerFlightsToOwnerAirline >> success i=${i} flightNumber=${flight.flight}`
        );
      } catch (error) {
        console.log(
          `_registerFlightsToOwnerAirline >> failed i=${i} flightNumber=${flight.flight} error=`,
          error
        );
      }
    }
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

  async isAirlineOperational(account) {
    console.log(
      'isAirlineOperational >> account=',
      account,
      ' owner=',
      this.owner
    );
    const result = await this.flightSuretyApp.methods
      .isAirlineOperational(account)
      .call({ from: this.owner });
    console.log('isAirlineOperational >> result=', result);
    return result;
  }

  async fundAirline(airline) {
    console.log('fundAirline >> airline=', airline);
    const tenEtherInWei = this.web3.utils.toWei('10', 'ether');
    const result = await this.flightSuretyApp.methods
      .fundAirline(airline)
      .send({ from: airline, value: tenEtherInWei });
    return result;
  }
}
