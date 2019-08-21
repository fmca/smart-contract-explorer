pragma solidity >=0.5.0;

// just for testing tools, to be removed


contract BasicToken_spec {

    mapping(address => uint256) balances;
    mapping (address => mapping (address => uint256)) allowances ;

    /** @notice precondition balances[msg.sender] >= _value
        @notice postcondition balances[msg.sender] == __verifier_old_uint(balances[msg.sender]) - _value
        @notice postcondition balances[_to] == __verifier_old_uint(balances[_to]) + _value
        @notice modifies balances[msg.sender]
        @notice modifies balances[_to]
    */
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
