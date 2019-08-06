pragma solidity >=0.5.0;

// Link to contract source code:
// https://github.com/sirin-labs/crowdsale-smart-contract/blob/master/contracts/token/BasicToken.sol


contract BasicToken {

    mapping(address => uint256) balances;
    mapping (address => mapping (address => uint256)) allowances ;

    function transfer(address _to, uint256 _value) public returns (bool)
    {
        balances[msg.sender] = balances[msg.sender] - _value;
        balances[_to] = balances[_to] + _value;
        return true;
    }

    function balance(address _owner) public view returns (uint256 bal)
    {
        return balances[_owner];
    }

    function allowance(address _owner, address spender) public view returns (uint256)
    {
        return allowances[_owner][spender];
    }


}