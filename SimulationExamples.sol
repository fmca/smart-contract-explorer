pragma solidity ^0.5.0;

import "/Users/mje/Code/smart-contract-explorer/HelloWorld2.exemplified.sol";
import "/Users/mje/Code/smart-contract-explorer/HelloAfrica2.exemplified.sol";

contract SimulationExamples is HelloWorld, HelloAfrica {
    
    function positiveExample0() public {
        HelloWorld.();
        HelloAfrica.();
    }
    
    function positiveExample1() public {
        HelloWorld.();
        HelloWorld.inc([object Object]);
        HelloAfrica.();
        HelloAfrica.inc([object Object]);
    }
    
    function positiveExample2() public {
        HelloWorld.();
        HelloWorld.inc([object Object]);
        HelloAfrica.();
        HelloAfrica.inc([object Object]);
    }
    
    function positiveExample3() public {
        HelloWorld.();
        HelloWorld.inc([object Object]);
        HelloAfrica.();
        HelloAfrica.inc([object Object]);
    }
    
    function positiveExample4() public {
        HelloWorld.();
        HelloWorld.inc([object Object]);
        HelloWorld.inc([object Object]);
        HelloAfrica.();
        HelloAfrica.inc([object Object]);
        HelloAfrica.inc([object Object]);
    }
    
    function positiveExample5() public {
        HelloWorld.();
        HelloWorld.inc([object Object]);
        HelloWorld.inc([object Object]);
        HelloAfrica.();
        HelloAfrica.inc([object Object]);
        HelloAfrica.inc([object Object]);
    }
    
    function HelloWorld$total() public view returns (int) {
        return HelloWorld.total;
    }
    
    function HelloWorld$counters() public view returns (bytes32) {
        return keccak256(abi.encode(HelloWorld.counters[[object Object]], HelloWorld.counters[[object Object]], HelloWorld.counters[[object Object]]));
    }
    
    function HelloAfrica$counter() public view returns (int) {
        return HelloAfrica.counter;
    }
    
    function HelloAfrica$total() public view returns (int) {
        return HelloAfrica.total;
    }
}