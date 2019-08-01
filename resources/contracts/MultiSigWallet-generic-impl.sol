pragma solidity >=0.5.0;


// Usually this contract should be working with ERC20 tokens
// and inherit from ERC20. To simplify I changed to work with ether
// instead and to not inherit from ERC20


contract MultiSigWallet_APIS {

    //@dev Owners can not register more than 50
    uint constant internal MAX_OWNER_COUNT = 50;
    
    mapping (address => bool) internal is_owner ;
    address[] public owners;


    mapping(uint => Withdrawal) internal withdrawals;
    
    mapping(uint => mapping (address => bool)) internal withdrawalConfirmations;
    
    uint internal withdrawalCount;

    uint internal required;

    struct Withdrawal {
        address payable destination;
        uint attoApis;
        bool executed;
    }


    constructor(address[] memory _owners, uint _required)
        public
    {
        for (uint i = 0 ; i < _owners.length ; i++) {
            if (_owners[i] == address(0))
                revert("An owner cannot be null");
            is_owner[_owners[i]] = true;
        }
        owners = _owners;
        required = _required;
    }


    /** @notice precondition is_owner[owner] == false
        @notice precondition owner != address(0)
        @notice precondition owners.length + 1 <= MAX_OWNER_COUNT
        @notice precondition msg.sender == address(this)
        @notice postcondition is_owner[owner] == true
        @notice postcondition owners[owners.length - 1] == owner
        @notice modifies is_owner[owner]
        @notice modifies owners
    */
    function addOwner(address owner) public
    {
        is_owner[owner] = true;
        owners.push(owner);
    }

    /** @notice precondition _required != 0
        @notice precondition _required <= owners.length
        @notice precondition msg.sender == address(this)
        @notice postcondition required == _required
        @notice modifies required
    */
    function changeRequirement(uint _required) public
    {
        required = _required;
    }

    /** @notice precondition is_owner[owner] == true
        @notice precondition owners.length - 1  != 0
        @notice precondition msg.sender == address(this)
        @notice postcondition is_owner[owner] == false
        @notice modifies is_owner[owner]
        @notice modifies owners
    */
    function removeOwner(address owner)
        public
    {
        is_owner[owner] = false;
        for (uint i = 0 ; i < owners.length - 1 ; i++)
            if (owners[i] == owner) {
                owners[i] = owners[owners.length - 1];
                break;
            }
        owners.length -= 1;
        if (required > owners.length)
            changeRequirement(owners.length);
    }

    /** @notice precondition is_owner[owner] == true
        @notice precondition is_owner[newOwner] == false
        @notice precondition msg.sender == address(this)
        @notice postcondition is_owner[owner] == false
        @notice postcondition is_owner[newOwner] == true
        @notice modifies is_owner[owner]
        @notice modifies is_owner[newOwner]
    */
    function replaceOwner(address owner, address newOwner)
        public
    {
        for (uint i = 0 ; i < owners.length ; i++)
            if (owners[i] == owner) {
                owners[i] = newOwner;
                break;
            }
        is_owner[owner] = false;
        is_owner[newOwner] = true;
    }


    function submitTransaction(address payable _destination, uint _val) public returns (uint withdrawalId)
    {
        withdrawalId = withdrawalCount;
        withdrawals[withdrawalId].destination = _destination;
        withdrawals[withdrawalId].attoApis = _val;
        withdrawals[withdrawalId].executed = false;

        confirmTransaction(withdrawalId);

        withdrawalCount ++;
    }


    function confirmTransaction(uint withdrawalId) public
    {
        withdrawalConfirmations[withdrawalId][msg.sender] = true;
        executeTransaction(withdrawalId);
    }


    function revokeTransaction(uint withdrawalId) public
    {
        withdrawalConfirmations[withdrawalId][msg.sender] = false;
    }


    function executeTransaction(uint withdrawalId) public
    {
        if (isConfirmed(withdrawalId)) {
            withdrawals[withdrawalId].executed = true;

            withdrawals[withdrawalId].destination.transfer(withdrawals[withdrawalId].attoApis);
        }

    }

    function isConfirmed(uint withdrawalId)
        internal
        view
        returns (bool)
    {
        uint count = 0;
        for (uint i = 0; i < owners.length; i++) {
            if (withdrawalConfirmations[withdrawalId][owners[i]])
                count += 1;
            if (count == required)
                return true;
        }
    }


    function getOwners()
        public
        view
        returns (address[] memory)
    {
        return owners;
    }


}