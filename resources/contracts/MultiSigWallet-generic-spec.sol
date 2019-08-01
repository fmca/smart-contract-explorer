pragma solidity >=0.5.0;


contract MultiSigWallet {

    uint constant public MAX_OWNER_COUNT = 50;

   struct Transaction {
       address destination ;
       uint value;
       bytes data;
       bool executed;
   }

    mapping (address => bool) internal is_owner ;
    address[] internal owners;

    mapping (uint => mapping (address => bool)) internal confirmations ;

    mapping (uint => Transaction) internal transactions ;

    uint internal required;

    uint internal transactionCount;


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



    /** @notice precondition is_owner[msg.sender]
        @notice precondition transactions[transactionCount].destination == address(0)
        @notice precondition _destination != address(0)
        @notice postcondition transactions[transactionCount].destination == _destination
        @notice postcondition transactions[transactionCount].value == _val
        @notice postcondition transactions[transactionCount].data == _data
        @notice postcondition transactions[transactionCount].executed == false
        @notice postcondition confirmations[transactionCount][msg.sender] == true
        @notice postcondition transactionCount == transactionCount + 1
        @notice modifies confirmations[transactionCount][msg.sender]
        @notice modifies transactions[transactionCount]
        @notice modifies transactionCount
    */
    function submitTransaction(address _destination, uint _val, bytes memory _data) public returns (uint transactionId)
    {
        transactionId = transactionCount;
    
        transactions[transactionId].destination = _destination;
        transactions[transactionId].value = _val;
        transactions[transactionId].data = _data;
        transactions[transactionId].executed = false;

        confirmTransaction(transactionId);

        transactionCount ++;
    }



    /**
        @notice precondition transactions[transactionId].executed == false
        @notice modifies transactions[transactionId].executed
     */
    function executeTransaction(uint transactionId) public
    {
        if (isConfirmed(transactionId)) {
            transactions[transactionId].executed = true;
        }

    }


    /** @notice precondition is_owner[msg.sender]
        @notice precondition confirmations[transactionId][msg.sender] == true
        @notice precondition transactions[transactionId].executed == false
        @notice modifies confirmations[transactionId][msg.sender]
    */
    function revokeTransaction(uint transactionId) public
    {
        confirmations[transactionId][msg.sender] = false;
    }



    /** @notice precondition is_owner[msg.sender]
        @notice precondition confirmations[transactionId][msg.sender] == false
        @notice precondition transactions[transactionId].destination != address(0)
        @notice postcondition confirmations[transactionId][msg.sender] == true
        @notice modifies confirmations[transactionId][msg.sender]
    */
    function confirmTransaction(uint transactionId) public
    {
        confirmations[transactionId][msg.sender] = true;
        executeTransaction(transactionId);
    }


    /** @notice precondition transactions[transactionId].executed == false
        @notice precondition transactions[transactionId].destination != address(0)
    */
   function isConfirmed(uint transactionId)
        public
        view
        returns (bool)
    {
        uint count = 0;
        for (uint i = 0 ; i < owners.length ; i++) {
            if (confirmations[transactionId][owners[i]])
                count += 1;
            if (count == required)
                return true;
        }
    }


    /** @notice precondition transactions[transactionId].executed == false
        @notice precondition transactions[transactionId].destination != address(0)
        @dev Returns total number of owners that confirmed transaction transactionId.
    */
    function getConfirmationCount(uint transactionId)
        public
        view
        returns (uint count)
    {
        for (uint i = 0 ; i < owners.length ; i++)
            if (confirmations[transactionId][owners[i]])
                count += 1;
    }

    /// @dev Returns total number of transactions after filers are applied.
    /// @param pending Include pending transactions.
    /// @param executed Include executed transactions.
    /// @return Total number of transactions after filters are applied.
    function getTransactionCount(bool pending, bool executed)
        public
        view
        returns (uint count)
    {
        for (uint i = 0 ; i < transactionCount ; i++)
            if (   pending && !transactions[i].executed
                || executed && transactions[i].executed)
                count += 1;
    }

    /// @dev Returns list of owners.
    /// @return List of owner addresses.
    function getOwners()
        public
        view
        returns (address[] memory)
    {
        return owners;
    }

    /// @dev Returns array with owner addresses, which confirmed transaction.
    /// @param transactionId Transaction ID.
    /// @return Returns array of owner addresses.
    function getConfirmations(uint transactionId)
        public
        view
        returns (address[] memory _confirmations)
    {
        address[] memory confirmationsTemp = new address[](owners.length);
        uint count = 0;
        uint i;
        for (i = 0 ; i < owners.length ; i++)
            if (confirmations[transactionId][owners[i]]) {
                confirmationsTemp[count] = owners[i];
                count += 1;
            }
        _confirmations = new address[](count);
        for (i = 0 ; i < count ; i++)
            _confirmations[i] = confirmationsTemp[i];
    }

    /// @dev Returns list of transaction IDs in defined range.
    /// @param from Index start position of transaction array.
    /// @param to Index end position of transaction array.
    /// @param pending Include pending transactions.
    /// @param executed Include executed transactions.
    /// @return Returns array of transaction IDs.
    function getTransactionIds(uint from, uint to, bool pending, bool executed)
        public
        view
        returns (uint[] memory _transactionIds)
    {
        uint[] memory transactionIdsTemp = new uint[](transactionCount);
        uint count = 0;
        uint i;
        for (i = 0 ; i < transactionCount ; i++)
            if (   pending && !transactions[i].executed
                || executed && transactions[i].executed)
            {
                transactionIdsTemp[count] = i;
                count += 1;
            }
        _transactionIds = new uint[](to - from);
        for (i = from ; i < to ; i++)
            _transactionIds[i - from] = transactionIdsTemp[i];
    }
}