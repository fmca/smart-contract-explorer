pragma solidity ^0.5.9;

contract HelloWorld {

	int counter;

	function inc() public {
		counter ++;
	}

	function dec() public {
		counter ++;
	}

	function get() public view returns(int) {
		return counter;
	}
}
