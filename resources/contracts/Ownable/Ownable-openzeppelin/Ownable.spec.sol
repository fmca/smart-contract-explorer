pragma solidity >=0.5.0;

// Link to contract source code:
// https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/ownership/Ownable.sol


contract Ownable {
    address internal  _owner;

    /**       @notice modifies _owner
   */
    constructor () public {
        _owner = msg.sender;
    }


    function getOwner() public view returns (address) {
        return _owner;
    }


    function isOwner() public view returns (bool) {
        return msg.sender == _owner;
    }

    /**
        @notice precondition _owner == msg.sender
        @notice postcondition _owner == address(0)
        @notice modifies _owner
    */
    function renounceOwnership() public {
        _owner = address(0);
    }


    /** @notice precondition newOwner != address(0)
        @notice precondition _owner == msg.sender
        @notice postcondition _owner == newOwner
        @notice modifies _owner
    */
    function transferOwnership(address newOwner) public {
        _owner = newOwner;
    }
}