import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

const contract = new Contract('localhost');
window.contract = contract;

async function initializeContract() {
  try {
    await contract.initialize();
  } catch (error) {
    console.log('contract.initialize error=', error);
  }
}

async function displayAppDataSet() {
  const viewId = 'display-wrapper-app-data-set';
  const title = 'App data set';
  const description = 'Display data set in App';
  try {
    const result = [{ label: 'Owner', value: contract.owner }];

    // show owner airline operational
    const isOwnerAirlineOperational = await contract.isAirlineOperational(
      contract.owner
    );
    result.push({
      label: 'Owner Airline Operational',
      value: isOwnerAirlineOperational,
    });

    // add airlines to result
    contract.airlines.forEach((airline, index) => {
      result.push({ label: `Airline ${index}`, value: airline });
    });

    // add passengers to result
    contract.passengers.forEach((passenger, index) => {
      result.push({ label: `Passenger ${index}`, value: passenger });
    });

    // add flights to result
    contract.flights.forEach((flight, index) => {
      result.push({
        label: `Owner Flight ${index}`,
        value: JSON.stringify(flight, null, 2),
      });
    });

    display(viewId, title, description, result);
  } catch (error) {
    display(viewId, title, description, [{ label: title, error: error }]);
  }
}

async function displayOperationalStatus() {
  const viewId = 'display-wrapper-fetch-flight-status';
  const title = 'Operational Status';
  const description = 'Check if contract is operational';
  try {
    const result = await contract.isOperational();
    display(viewId, title, description, [{ label: title, value: result }]);
  } catch (error) {
    display(viewId, title, description, [{ label: title, error: error }]);
  }
}

function setupFundOwnerAirlineButton() {
  const viewId = 'display-wrapper-app-data-set';
  const title = 'Owner Airline Operational Status';
  DOM.elid('fund-owner-airline').addEventListener('click', () => {
    contract
      .fundAirline(contract.owner)
      .then((_) => contract.isAirlineOperational(contract.owner))
      .then((isAirlineOperational) => {
        display(viewId, title, '', [
          { label: title, value: isAirlineOperational },
        ]);
      })
      .catch((e) => {
        display(viewId, title, '', [{ label: title, error: e }]);
      });
  });
}

function setupFetchFlightStatusButton() {
  const viewId = 'display-wrapper-fetch-flight-status';
  const title = 'Oracles';
  const description = 'Trigger oracles';
  const resultLabel = 'Fetch Flight Status';
  DOM.elid('submit-oracle').addEventListener('click', () => {
    let flight = DOM.elid('flight-number').value;
    contract
      .fetchFlightStatus(flight)
      .then((result) => {
        display(viewId, title, description, [
          {
            label: resultLabel,
            value: result.flight + ' ' + result.timestamp,
          },
        ]);
      })
      .catch((error) => {
        display(viewId, title, description, [
          {
            label: resultLabel,
            error: error,
          },
        ]);
      });
  });
}

function setupBuyInsuranceButton() {
  const viewId = 'display-wrapper-fetch-flight-status';
  const title = 'Buy Insurance Result';
  const description = '';
  const resultLabel = 'Is Insured';
  DOM.elid('buy-insurance').addEventListener('click', () => {
    let flight = DOM.elid('flight-number').value;
    contract
      .buyInsurance(flight)
      .then((_) => {
        display(viewId, title, description, [
          {
            label: resultLabel,
            value: 'success for flight ' + flight,
          },
        ]);
      })
      .catch((error) => {
        display(viewId, title, description, [
          {
            label: resultLabel,
            error: error,
          },
        ]);
      });
  });
}

(async () => {
  let result = null;

  await initializeContract();
  await displayAppDataSet();
  await displayOperationalStatus();

  setupFundOwnerAirlineButton();
  setupFetchFlightStatusButton();
  setupBuyInsuranceButton();
})();

// display('display-wrapper-fetch-flight-status', 'test title', 'test description', [{label: 'test label', value: 'test value'}]);
// display('display-wrapper-fetch-flight-status', 'test title 2', 'test description 2', [{label: 'test label 2', value: 'test value 2'}]);

function display(viewId, title, description, results) {
  let displayDiv = DOM.elid(viewId);
  let section = DOM.section();
  section.appendChild(DOM.h2(title));
  section.appendChild(DOM.h5(description));
  results.map((result) => {
    let row = section.appendChild(DOM.div({ className: 'row' }));
    row.appendChild(DOM.div({ className: 'col-sm-4 field' }, result.label));
    row.appendChild(
      DOM.div(
        { className: 'col-sm-8 field-value' },
        result.error ? String(result.error) : String(result.value)
      )
    );
    section.appendChild(row);
  });
  displayDiv.append(section);
}
