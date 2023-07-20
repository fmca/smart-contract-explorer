pragma solidity >=0.5.0;

contract Test22 {

    struct Container {
        uint a;
        uint b;
    }
    
    mapping(uint => Container) public containers;
  
    function store(uint i, uint v, uint v2) public {
        containers[i] = Container(v, v2);
    }


    function value(uint val) public view returns (uint ret) {
        return containers[val].a + containers[val].b;
    }
}