pragma solidity ^0.5.0;

contract a {
    function f(address[] memory x) internal;

    function g() public {
        f(address$ary$2([uint160(42), 73]));
    }

    function address$ary$2(uint160[2] memory ary) internal pure returns (address[] memory) {
        address[] memory ret = new address[](2);
        for (uint i=0; i < 2; i++)
            ret[i] = address(ary[i]);
        return ret;
    }
}
