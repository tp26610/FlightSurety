import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

(async () => {
  let result = null;

  let contract = new Contract('localhost', () => {
    // Read transaction
    contract.isOperational((error, result) => {
      console.log(error, result);
      display(
        'display-wrapper-fetch-flight-status',
        'Operational Status',
        'Check if contract is operational',
        [{ label: 'Operational Status', error: error, value: result }]
      );
    });

    // User-submitted transaction
    DOM.elid('submit-oracle').addEventListener('click', () => {
      let flight = DOM.elid('flight-number').value;
      // Write transaction
      contract.fetchFlightStatus(flight, (error, result) => {
        display(
          'display-wrapper-fetch-flight-status',
          'Oracles',
          'Trigger oracles',
          [
            {
              label: 'Fetch Flight Status',
              error: error,
              value: result.flight + ' ' + result.timestamp,
            },
          ]
        );
      });
    });
  });
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
