pragma solidity >=0.5.0;

contract Test11 {
    mapping (uint => uint) valueA;
    mapping (uint => uint) valueB;

    function store(uint i, uint v, uint v2) public {
        valueA[i] = v;
        valueB[i] = v2;
    }

    /** 
        @notice postcondition ret == valueA[val] + valueB[val]
    */
    function value(uint val) public view returns (uint ret) {
        return valueA[val] + valueB[val];
    }
}