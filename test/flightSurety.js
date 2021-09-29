var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  beforeEach('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(
      config.flightSuretyApp.address
    );
  });

  async function givenFourAirlinesFunded(owner, secondToFourthAirlines) {
    const tenEtherInWei = web3.utils.toWei('10', 'ether');

    // console.log('>> fundAirline owner airline');

    // Given: 4 funded airlines
    await config.flightSuretyApp.fundAirline(owner, {
      from: owner,
      value: tenEtherInWei,
    });

    // console.log('>> owner airline funded');

    for (let i = 0; i < secondToFourthAirlines.length; i++) {
      const airline = secondToFourthAirlines[i];
      // console.log(`>> airline ${airline} registering`);
      await config.flightSuretyApp.registerAirline(airline, {
        from: owner,
      });
      // console.log(`>> airline ${airline} registered`);
      await config.flightSuretyApp.fundAirline(airline, {
        from: owner,
        value: tenEtherInWei,
      });
      // console.log(`>> airline ${airline} funded`);
    }

    // console.log('>> 3 airlines funded');
  }

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {
    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, 'Incorrect initial operating status value');
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
    // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false, {
        from: config.testAddresses[2],
      });
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, true, 'Access not restricted to Contract Owner');
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
    // Ensure that access is allowed for Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false);
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(
      accessDenied,
      false,
      'Access not restricted to Contract Owner'
    );
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
    await config.flightSuretyData.setOperatingStatus(false);

    let reverted = false;
    try {
      await config.flightSurety.setTestingMode(true);
    } catch (e) {
      reverted = true;
    }
    assert.equal(reverted, true, 'Access not blocked for requireIsOperational');

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true);
  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(newAirline, {
        from: config.firstAirline,
      });
    } catch (e) {}
    let result = await config.flightSuretyData.isAirline.call(newAirline);

    // ASSERT
    assert.equal(
      result,
      false,
      "Airline should not be able to register another airline if it hasn't provided funding"
    );
  });

  it('(airline) should be registered while contract deployed', async () => {
    let result = await config.flightSuretyData.isAirline.call(config.owner);
    assert.equal(result, true, 'Deployed owner address should be airline');
  });

  it('(airline) should be registered by existing airline while there is one airline', async () => {
    // GIVEN
    const existingAirline = config.owner;
    const newAirline = accounts[2];

    // given the default airline is funded
    const tenEtherInWei = web3.utils.toWei('10', 'ether');
    await config.flightSuretyApp.fundAirline(existingAirline, {
      from: existingAirline,
      value: tenEtherInWei,
    });

    // WHEN
    await config.flightSuretyApp.registerAirline(newAirline, {
      from: existingAirline,
    });

    // THEN
    const result = await config.flightSuretyData.isAirline.call(newAirline);
    assert.equal(result, true, 'New airline is not registered.');
  });

  it('(airline) should register failed while the caller is existing airline', async () => {
    // GIVEN
    const existingAirline = config.owner;
    let isReverted = false;

    // given the default airline is funded
    const tenEtherInWei = web3.utils.toWei('10', 'ether');
    await config.flightSuretyApp.fundAirline(existingAirline, {
      from: existingAirline,
      value: tenEtherInWei,
    });

    // WHEN
    try {
      await config.flightSuretyApp.registerAirline(existingAirline, {
        from: existingAirline,
      });
    } catch (e) {
      // console.log(e);
      isReverted = true;
    }

    // ASSERT
    assert.equal(isReverted, true, 'the contract is not reverted');
  });

  it('(airline) should not be registered while not reaching consensus of 50% of registered airlines', async () => {
    // Given 4 funded airlines
    const owner = config.owner;
    const secondToFourthAirlines = accounts.slice(1, 4);
    await givenFourAirlinesFunded(owner, secondToFourthAirlines);

    // Given fifth airline
    const fifthAirline = accounts[4];

    // When fifth airline is registering
    await config.flightSuretyApp.registerAirline(fifthAirline, {
      from: owner,
    });

    // console.log('>> fifth airline registered');

    // Then fifth airline is airline
    const isAirline = await config.flightSuretyData.isAirline(fifthAirline);
    assert.equal(isAirline, true, 'The fifth airline is not added');

    // Then fifth airline is not registered
    const isRegistered = await config.flightSuretyData.isAirlineRegistered.call(
      fifthAirline
    );
    assert.equal(
      isRegistered,
      false,
      'The fifth airline should not be registered'
    );
  });

  it('(airline) should be registered while reaching consensus of 50% of registered airlines', async () => {
    // Given 4 funded airlines
    const owner = config.owner;
    const secondToFourthAirlines = accounts.slice(1, 4);
    await givenFourAirlinesFunded(owner, secondToFourthAirlines);

    // Given fifth airline
    const fifthAirline = accounts[4];

    // When fifth airline is registering by airline 1
    await config.flightSuretyApp.registerAirline(fifthAirline, {
      from: owner,
    });
    // When fifth airline is registering by airline 2
    const airline2 = secondToFourthAirlines[1];
    await config.flightSuretyApp.registerAirline(fifthAirline, {
      from: airline2,
    });

    // Then fifth airline is registered
    const isRegistered = await config.flightSuretyData.isAirlineRegistered.call(
      fifthAirline
    );
    assert.equal(isRegistered, true, 'The fifth airline should be registered');
  });

  xit('(insurance) can be paid for purchasing by user with 0.9 ether', () => {});
  xit('(insurance) cannot be paid for purchasing by user with 1.9 ether', () => {});
  xit('(insurance) cannot be paid for purchasing if the airline is not operational', () => {});
});
