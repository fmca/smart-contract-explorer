pragma solidity >=0.5.0;


contract Escrow {

    mapping(address=>uint) internal deposits ;
    address internal owner ;


   constructor(address _owner) public {
        owner = _owner;
    }


  /** 	@notice precondition payee != address(0)
      	@notice precondition  msg.value > 0
	    @notice precondition  address(this) != msg.sender
	    @notice precondition  deposits[payee] + msg.value > deposits[payee]
	    @notice precondition  address(this).balance + msg.value > address(this).balance
     	@notice postcondition deposits[payee] == __verifier_old_uint(deposits[payee]) + msg.value
	    @notice postcondition address(this).balance == __verifier_old_uint(address(this).balance) + msg.value */

    function deposit(address payee) public payable {
    	require(payee != address(0));
	    deposits[payee] = deposits[payee] + msg.value;

    }


    /** @notice precondition payee != address(0)
        @notice precondition  deposits[payee] > 0
	    @notice precondition  address(this).balance >= deposits[payee]
	    @notice precondition  address(this) != payee
        @notice postcondition deposits[payee] == 0
	    @notice postcondition address(this).balance == __verifier_old_uint(address(this).balance) - __verifier_old_uint(deposits[payee]) */

    function withdraw(address payable payee) public {
    	require(payee != address(0));
	    payee.transfer(deposits[payee]);
	    deposits[payee] = 0;

    }

	/** @notice precondition payee != address(0)
	*/
	function depositsOf(address payee) public view returns(uint) {
        return deposits[payee];
    }


}