import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

const contract = new Contract('localhost');

function initializeContract() {
  try {
    contract.initialize();
  } catch (error) {
    console.log('contract.initialize error=', error);
  }
}

async function displayOperationalStatus() {
  try {
    const result = await contract.isOperational();
    display(
      'display-wrapper-fetch-flight-status',
      'Operational Status',
      'Check if contract is operational',
      [{ label: 'Operational Status', value: result }]
    );
  } catch (error) {
    console.log('contract.isOperational error=', error);
    display(
      'display-wrapper-fetch-flight-status',
      'Operational Status',
      'Check if contract is operational',
      [{ label: 'Operational Status', error: error }]
    );
  }
}

function setupFetchFlightStatusButton() {
  DOM.elid('submit-oracle').addEventListener('click', () => {
    let flight = DOM.elid('flight-number').value;
    contract
      .fetchFlightStatus(flight)
      .then((result) => {
        display(
          'display-wrapper-fetch-flight-status',
          'Oracles',
          'Trigger oracles',
          [
            {
              label: 'Fetch Flight Status',
              value: result.flight + ' ' + result.timestamp,
            },
          ]
        );
      })
      .catch((error) => {
        display(
          'display-wrapper-fetch-flight-status',
          'Oracles',
          'Trigger oracles',
          [
            {
              label: 'Fetch Flight Status',
              error: error,
            },
          ]
        );
      });
  });
}

(async () => {
  let result = null;

  initializeContract();
  displayOperationalStatus(); // async
  setupFetchFlightStatusButton();
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
