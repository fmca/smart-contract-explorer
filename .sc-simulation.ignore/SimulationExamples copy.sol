pragma solidity ^0.5.0;

import "./1.exemplified.sol";
import "./2.exemplified.sol";

contract SimulationExamples {
    Test11 impl;
    Test22 spec;

    function positiveExample0() public {
        impl = (new Test11)();
        spec = (new Test22)();
    }

    function positiveExample1() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 0));
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 0));
    }

    function positiveExample2() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 1));
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 1));
    }

    function positiveExample3() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 2));
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 2));
    }

    function positiveExample4() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 1, 0));
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 1, 0));
    }

    function positiveExample5() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 1, 1));
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 1, 1));
    }

    function negativeExample0() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 1));
        spec = (new Test22)();
    }

    function negativeExample1() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 2));
        spec = (new Test22)();
    }

    function negativeExample2() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 1, 0));
        spec = (new Test22)();
    }

    function negativeExample3() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 1, 1));
        spec = (new Test22)();
    }

    function negativeExample4() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 1));
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 0));
    }

    function negativeExample5() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 2));
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 0));
    }

    function negativeExample6() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 1, 0));
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 0));
    }

    function negativeExample7() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 1, 1));
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 0));
    }

    function negativeExample8() public {
        impl = (new Test11)();
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 1));
    }

    function negativeExample9() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 0));
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 1));
    }

    function negativeExample10() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 2));
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 1));
    }

    function negativeExample11() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 1, 1));
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 1));
    }

    function negativeExample12() public {
        impl = (new Test11)();
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 2));
    }

    function negativeExample13() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 0));
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 2));
    }

    function negativeExample14() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 1));
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 2));
    }

    function negativeExample15() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 1, 0));
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 2));
    }

    function negativeExample16() public {
        impl = (new Test11)();
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 1, 0));
    }

    function negativeExample17() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 0));
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 1, 0));
    }

    function negativeExample18() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 2));
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 1, 0));
    }

    function negativeExample19() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 1, 1));
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 1, 0));
    }

    function negativeExample20() public {
        impl = (new Test11)();
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 1, 1));
    }

    function negativeExample21() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 0));
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 1, 1));
    }

    function negativeExample22() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 0, 1));
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 1, 1));
    }

    function negativeExample23() public {
        impl = (new Test11)();
        address(impl).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 1, 0));
        spec = (new Test22)();
        address(spec).call(abi.encodeWithSignature("store(uint256,uint256,uint256)", 0, 1, 1));
    }

    function Test11$valueA() public view returns (bytes32) {
        return keccak256(abi.encode(
            impl.valueA(0),
            impl.valueA(1),
            impl.valueA(2)
        ));
    }

    function Test11$valueB() public view returns (bytes32) {
        return keccak256(abi.encode(
            impl.valueB(0),
            impl.valueB(1),
            impl.valueB(2)
        ));
    }

    function sum$Test11$valueA$uint() public view returns (uint) {
        return     impl.valueA(0) +
            impl.valueA(1) +
            impl.valueA(2);
    }

    function sum$Test11$valueB$uint() public view returns (uint) {
        return     impl.valueB(0) +
            impl.valueB(1) +
            impl.valueB(2);
    }

    function Test22$containers() public view returns (bytes32) {
        return keccak256(abi.encode(
            spec.containers(0),
            spec.containers(1),
            spec.containers(2)
        ));
    }

    function sum$Test22$containers$uint$a() public view returns (uint) {
        return     spec.containers(0).a +
            spec.containers(1).a +
            spec.containers(2).a;
    }

    function sum$Test22$containers$uint$b() public view returns (uint) {
        return     spec.containers(0).b +
            spec.containers(1).b +
            spec.containers(2).b;
    }
}