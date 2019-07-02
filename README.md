# Smart Contract Explorer

Exploring behaviors of Solidity smart contracts.

## Requirements

* [Node.js](https://nodejs.org/en/) < 12.0.0

## Setup

```bash
$ npm link
```

## Usage

### Generating simulation-checking contracts

```bash
$ sc-product --help && sc-product --source resources/HelloWorld.sol --target resources/HelloAfrica.sol && cat SimulationCheck.sol
```
```
usage: sc-product --source <filename> --target <filename>

Options:
  --version  Show version number                                       [boolean]
  --source   source smart contract                           [string] [required]
  --target   target smart contract                           [string] [required]
  --check    attempt to verify the simulation contract                 [boolean]
  --help     Show help                                                 [boolean]
```
```solidity
pragma solidity ^0.5.0;

import "/Users/mje/Code/smart-contract-explorer/dist/resources/HelloWorld.sol";
import "/Users/mje/Code/smart-contract-explorer/dist/resources/HelloAfrica.sol";

/**
 * @notice invariant HelloWorld.total == HelloAfrica.counter
 * @notice invariant HelloWorld.counter == HelloAfrica.counter
 */
contract SimulationCheck is HelloWorld, HelloAfrica {

    /**
     * @notice modifies HelloWorld.total
     * @notice modifies HelloWorld.counter
     * @notice modifies HelloAfrica.counter
     * @notice postcondition HelloAfrica.counter == __verifier_old_int(HelloAfrica.counter) + i
     */
    function inc(int256 i) public {
        HelloWorld.inc(i);
        HelloAfrica.inc(i);
    }

    /**
     * @notice postcondition value == HelloAfrica.counter
     */
    function get() public view returns (int256 value) {
        int256 HelloWorld_value = HelloWorld.get();
        int256 HelloAfrica_value = HelloAfrica.get();
        require(HelloWorld_value == HelloAfrica_value);
        return (HelloWorld_value);
    }

    /**
     * @notice modifies HelloWorld.total
     * @notice modifies HelloWorld.counter
     * @notice modifies HelloAfrica.counter
     * @notice postcondition HelloAfrica.counter == __verifier_old_int(HelloAfrica.counter) - 1
     */
    function dec() public {
        HelloWorld.dec();
        HelloAfrica.dec();
    }
}
```

### Generating examples for simulation invariants

```bash
$ sc-examples --help && sc-examples --source resources/HelloWorld.sol --target resources/HelloAfrica.sol && cat positive-examples.txt && cat negative-examples.txt && cat fields.txt && cat seed-features.txt && cat SimulationExamples.sol
```
```
usage: sc-examples --source <filename> --target <filename>

Options:
  --version  Show version number                                       [boolean]
  --source   source smart contract                           [string] [required]
  --target   target smart contract                           [string] [required]
  --help     Show help                                                 [boolean]
```
```json
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"positiveExample0"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"positiveExample1"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"positiveExample2"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"positiveExample3"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"positiveExample4"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"positiveExample5"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample6"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample7"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample8"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample9"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample10"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample11"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample12"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample13"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample14"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample15"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample16"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample17"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample18"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample19"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample20"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample21"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample22"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample23"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample24"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample25"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample26"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample27"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample28"}}
{"id":{"contract":"/Users/mje/Code/smart-contract-explorer/dist/SimulationExamples.sol","method":"negativeExample29"}}
```
```
HelloWorld.total: Int
HelloWorld.counter: Int
HelloAfrica.counter: Int
```
```
(= counter counter)
```
```solidity
pragma solidity ^0.5.0;

import "/Users/mje/Code/smart-contract-explorer/dist/resources/HelloWorld.sol";
import "/Users/mje/Code/smart-contract-explorer/dist/resources/HelloAfrica.sol";

contract SimulationExamples is HelloWorld, HelloAfrica {

    function positiveExample0() public {
    }

    function positiveExample1() public {
        HelloWorld.inc(0);
        HelloAfrica.inc(0);
    }

    function positiveExample2() public {
        HelloWorld.inc(1);
        HelloAfrica.inc(1);
    }

    function positiveExample3() public {
        HelloWorld.inc(2);
        HelloAfrica.inc(2);
    }

    function positiveExample4() public {
        HelloWorld.dec();
        HelloAfrica.dec();
    }

    function positiveExample5() public {
        HelloWorld.inc(0);
        HelloWorld.inc(0);
        HelloAfrica.inc(0);
        HelloAfrica.inc(0);
    }

    function negativeExample6() public {
        HelloWorld.inc(1);
    }

    function negativeExample7() public {
        HelloWorld.inc(2);
    }

    function negativeExample8() public {
        HelloWorld.dec();
    }

    function negativeExample9() public {
        HelloWorld.inc(1);
        HelloAfrica.inc(0);
    }

    function negativeExample10() public {
        HelloWorld.inc(2);
        HelloAfrica.inc(0);
    }

    function negativeExample11() public {
        HelloWorld.dec();
        HelloAfrica.inc(0);
    }

    function negativeExample12() public {
        HelloAfrica.inc(1);
    }

    function negativeExample13() public {
        HelloWorld.inc(0);
        HelloAfrica.inc(1);
    }

    function negativeExample14() public {
        HelloWorld.inc(0);
        HelloWorld.inc(0);
        HelloAfrica.inc(1);
    }

    function negativeExample15() public {
        HelloWorld.inc(2);
        HelloAfrica.inc(1);
    }

    function negativeExample16() public {
        HelloWorld.dec();
        HelloAfrica.inc(1);
    }

    function negativeExample17() public {
        HelloAfrica.inc(2);
    }

    function negativeExample18() public {
        HelloWorld.inc(0);
        HelloAfrica.inc(2);
    }

    function negativeExample19() public {
        HelloWorld.inc(0);
        HelloWorld.inc(0);
        HelloAfrica.inc(2);
    }

    function negativeExample20() public {
        HelloWorld.inc(1);
        HelloAfrica.inc(2);
    }

    function negativeExample21() public {
        HelloWorld.dec();
        HelloAfrica.inc(2);
    }

    function negativeExample22() public {
        HelloAfrica.dec();
    }

    function negativeExample23() public {
        HelloWorld.inc(0);
        HelloAfrica.dec();
    }

    function negativeExample24() public {
        HelloWorld.inc(0);
        HelloWorld.inc(0);
        HelloAfrica.dec();
    }

    function negativeExample25() public {
        HelloWorld.inc(1);
        HelloAfrica.dec();
    }

    function negativeExample26() public {
        HelloWorld.inc(2);
        HelloAfrica.dec();
    }

    function negativeExample27() public {
        HelloWorld.inc(1);
        HelloAfrica.inc(0);
        HelloAfrica.inc(0);
    }

    function negativeExample28() public {
        HelloWorld.inc(2);
        HelloAfrica.inc(0);
        HelloAfrica.inc(0);
    }

    function negativeExample29() public {
        HelloWorld.dec();
        HelloAfrica.inc(0);
        HelloAfrica.inc(0);
    }
}

```
