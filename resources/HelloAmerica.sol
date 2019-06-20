pragma solidity ^0.5.9;

contract HelloAmerica {

	int counter;

	function increment() public {
		counter ++;
	}

	function getCount() public view returns(int) {
		return counter;
	}
}
