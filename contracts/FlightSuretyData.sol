pragma solidity ^0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    struct Airline {
        address addr;
        bool isRegistered;
        bool isOperational;
        address[] voters;
    }
    mapping(address => Airline) private airlines;

    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false
    mapping(address => uint256) private authorizedCallers;
    mapping(address => uint256) private funds;
    address[] airlineAddrs;

    // Flights
    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
        string flight;
        string from;
        string to;
    }
    mapping(bytes32 => Flight) private flights;

    // Insurances
    struct Insurance {
        address passenger;
        uint256 amount; // Passenger insurance payment
        bool isCredited;
    }
    mapping(bytes32 => Insurance[]) insurancesPerFlight;
    mapping(address => uint256) public pendingPayments;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor() public {
        contractOwner = msg.sender;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireCallerAuthorized() {
        require(authorizedCallers[msg.sender] == 1, "Caller is not authorized");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */
    function isOperational() public view returns (bool) {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerAirline(address account) external requireIsOperational {
        airlines[account] = Airline({
            addr: account,
            isRegistered: true,
            isOperational: false,
            voters: new address[](0)
        });
        airlineAddrs.push(account);
    }

    function isAirlineRegistered(address account) external view returns (bool) {
        return airlines[account].isRegistered;
    }

    function isAirlineOperational(address account)
        external
        view
        returns (bool)
    {
        return airlines[account].isOperational;
    }

    function getOperationalArilineCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < airlineAddrs.length; i++) {
            address airlineAddr = airlineAddrs[i];
            if (airlines[airlineAddr].isOperational) {
                count = count.add(1);
            }
        }
        return count;
    }

    function voteAirline(address voter, address airlineAddr) external {
        Airline storage airline = airlines[airlineAddr];
        if (airline.addr == address(0)) {
            airlines[airlineAddr] = Airline({
                addr: airlineAddr,
                isRegistered: false,
                isOperational: false,
                voters: new address[](0)
            });
            airline = airlines[airlineAddr];
        }

        address[] memory voters = airline.voters;

        bool isVoted = false;
        for (uint256 i = 0; i < voters.length; i++) {
            address votedAddr = voters[i];
            if (votedAddr == airlineAddr) {
                isVoted = true;
                break;
            }
        }
        require(isVoted == false, "The voter is voted");

        airline.voters.push(voter);
    }

    function getAirlineVoteCount(address airlineAddr)
        external
        view
        returns (uint256)
    {
        Airline memory airline = airlines[airlineAddr];
        address[] memory voters = airline.voters;
        return voters.length;
    }

    function isInsured(
        address passenger,
        address airline,
        string flight,
        uint256 timestamp
    ) external view returns (bool) {
        Insurance[] memory insuredPassengers = insurancesPerFlight[
            getFlightKey(airline, flight, timestamp)
        ];
        for (uint256 i = 0; i < insuredPassengers.length; i++) {
            if (insuredPassengers[i].passenger == passenger) {
                return true;
            }
        }
        return false;
    }

    function registerFlight(
        address airline,
        string flight,
        string from,
        string to,
        uint256 timestamp
    ) external {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        require(!flights[flightKey].isRegistered, "Flight already registered");

        flights[flightKey] = Flight({
            isRegistered: true,
            statusCode: 0,
            updatedTimestamp: timestamp,
            airline: airline,
            flight: flight,
            from: from,
            to: to
        });
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy(
        address airline,
        string flight,
        uint256 timestamp,
        address passenger,
        uint256 amount
    ) external payable {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        require(flights[flightKey].isRegistered, "Flight is not registered");

        insurancesPerFlight[flightKey].push(
            Insurance({
                passenger: passenger,
                amount: amount,
                isCredited: false
            })
        );
    }

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees() external pure {}

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay() external pure {}

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund(address account) external payable {
        funds[account] = funds[account] + msg.value;
        if (funds[account] >= 10 ether) {
            airlines[account].isOperational = true;
        }
    }

    function getAirlineFund(address account) external view returns (uint256) {
        return funds[account];
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    function authorizeCaller(address caller) external requireContractOwner {
        authorizedCallers[caller] = 1;
    }

    function deauthorizeCaller(address caller) external requireContractOwner {
        delete authorizedCallers[caller];
    }

    function isAirline(address account) external view returns (bool) {
        return airlines[account].addr != address(0);
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    /*
    function()
                            external
                            payable
    {
        fund();
    }
    */
}
