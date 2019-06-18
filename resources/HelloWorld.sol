pragma solidity ^0.5.9;

contract HelloWorld {

	mapping (int => int) counters;

	function inc(int i) public {
		counters[i] ++;
	}

	function dec(int i) public {
		counters[i] --;
	}

	function get(int i) public view returns(int) {
		return counters[i];
	}
}
