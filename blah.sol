pragma solidity ^0.5.0;
import "resources/HelloWorld.sol";
import "resources/HelloAfrica.sol";
contract Examples is HelloWorld, HelloAfrica {
    function positiveExample0() public {
        
    }
    function negativeExample1() public {
        
    }
    function negativeExample2() public {
        HelloWorld.inc(0);
    }
    function negativeExample3() public {
        HelloWorld.inc(1);
    }
    function negativeExample4() public {
        HelloWorld.inc(2);
    }
    function negativeExample5() public {
        HelloWorld.dec(0);
    }
    function negativeExample6() public {
        HelloWorld.dec(1);
    }
    function negativeExample7() public {
        HelloAfrica.inc();
    }
    function negativeExample8() public {
        HelloWorld.inc(0);
        HelloAfrica.inc();
    }
    function negativeExample9() public {
        HelloWorld.inc(1);
        HelloAfrica.inc();
    }
    function negativeExample10() public {
        HelloWorld.inc(2);
        HelloAfrica.inc();
    }
    function negativeExample11() public {
        HelloWorld.dec(0);
        HelloAfrica.inc();
    }
    function negativeExample12() public {
        HelloWorld.dec(1);
        HelloAfrica.inc();
    }
    function negativeExample13() public {
        HelloAfrica.dec();
    }
    function negativeExample14() public {
        HelloWorld.inc(0);
        HelloAfrica.dec();
    }
    function negativeExample15() public {
        HelloWorld.inc(1);
        HelloAfrica.dec();
    }
    function negativeExample16() public {
        HelloWorld.inc(2);
        HelloAfrica.dec();
    }
    function negativeExample17() public {
        HelloWorld.dec(0);
        HelloAfrica.dec();
    }
    function negativeExample18() public {
        HelloWorld.dec(1);
        HelloAfrica.dec();
    }
    function negativeExample19() public {
        HelloAfrica.inc();
        HelloAfrica.inc();
    }
    function negativeExample20() public {
        HelloWorld.inc(0);
        HelloAfrica.inc();
        HelloAfrica.inc();
    }
    function negativeExample21() public {
        HelloWorld.inc(1);
        HelloAfrica.inc();
        HelloAfrica.inc();
    }
    function negativeExample22() public {
        HelloWorld.inc(2);
        HelloAfrica.inc();
        HelloAfrica.inc();
    }
    function negativeExample23() public {
        HelloWorld.dec(0);
        HelloAfrica.inc();
        HelloAfrica.inc();
    }
    function negativeExample24() public {
        HelloWorld.dec(1);
        HelloAfrica.inc();
        HelloAfrica.inc();
    }
    function negativeExample25() public {
        HelloAfrica.inc();
        HelloAfrica.dec();
    }
    function negativeExample26() public {
        HelloWorld.inc(0);
        HelloAfrica.inc();
        HelloAfrica.dec();
    }
    function negativeExample27() public {
        HelloWorld.inc(1);
        HelloAfrica.inc();
        HelloAfrica.dec();
    }
    function negativeExample28() public {
        HelloWorld.inc(2);
        HelloAfrica.inc();
        HelloAfrica.dec();
    }
    function negativeExample29() public {
        HelloWorld.dec(0);
        HelloAfrica.inc();
        HelloAfrica.dec();
    }
    function negativeExample30() public {
        HelloWorld.dec(1);
        HelloAfrica.inc();
        HelloAfrica.dec();
    }
    function negativeExample31() public {
        HelloAfrica.dec();
        HelloAfrica.inc();
    }
    function negativeExample32() public {
        HelloWorld.inc(0);
        HelloAfrica.dec();
        HelloAfrica.inc();
    }
    function negativeExample33() public {
        HelloWorld.inc(1);
        HelloAfrica.dec();
        HelloAfrica.inc();
    }
    function negativeExample34() public {
        HelloWorld.inc(2);
        HelloAfrica.dec();
        HelloAfrica.inc();
    }
    function negativeExample35() public {
        HelloWorld.dec(0);
        HelloAfrica.dec();
        HelloAfrica.inc();
    }
    function negativeExample36() public {
        HelloWorld.dec(1);
        HelloAfrica.dec();
        HelloAfrica.inc();
    }
}