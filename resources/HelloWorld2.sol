pragma solidity ^0.5.0;

contract HelloWorld {

	int total;
	mapping (int => int) counters;

	function inc(int i) public {
		counters[i] ++;
		total ++;
	}

	function dec(int i) public {
		counters[i] --;
		total --;
	}

	function get(int i) public view returns(int) {
		return counters[i];
	}
}
