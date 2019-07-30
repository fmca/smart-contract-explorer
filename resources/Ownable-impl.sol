pragma solidity >=0.5.0;

// Link to contract source code:
// https://github.com/sirin-labs/crowdsale-smart-contract/blob/master/contracts/ownership/Ownable.sol

contract Ownable_sirin_labs {
  address private owner;


  constructor() public {
    owner = msg.sender;
  }


  function transferOwnership(address newOwner) public  {
    owner = newOwner;
  }


  function getOwner() public view returns (address) {
        return owner;
    }

}