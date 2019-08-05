pragma solidity >=0.5.0;

// Link to contract source code:
// https://github.com/sirin-labs/crowdsale-smart-contract/blob/master/contracts/ownership/Ownable.sol

/**
  @notice simulation Ownable_sirin_labs.owner == Ownable._owner
 */
contract Ownable_sirin_labs {
  address internal owner;


  /**       @notice modifies owner
  */
  constructor() public {
    owner = msg.sender;
  }


  /**       @notice modifies owner
  */
  function transferOwnership(address newOwner) public  {
    owner = newOwner;
  }


  function getOwner() public view returns (address) {
        return owner;
    }

}