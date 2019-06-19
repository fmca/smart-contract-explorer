pragma solidity ^0.5.9;

contract HelloAfrica {

	/** @notice blah */
	int counter;
	mapping (address => int) counter3;

	/**
	  @notice precondition counter3 == counter + 1 
	*/
	function inc() public {
		counter ++;
	}

	/**
	  @notice precondition counter == counter - 1 
	*/
	function dec() public {
		counter --;
	}

    /**
	  @notice postcondition I am here 
	  @notice postcondition second commnet 
	  @notice precondition third comment 
	 */
	function get() public view returns(int) {
		return counter;
	}

	/**
	  notice postcondition I am here
	 */
	function getCount2() private view returns(int) {
		return counter;
	}
}
