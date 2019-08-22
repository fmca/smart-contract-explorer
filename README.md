# Smart Contract Explorer

Exploring behaviors of Solidity smart contracts.

## Requirements

* [Node.js](https://nodejs.org/en/)
* [Ocaml](https://ocaml.org)
* [OCaml Package Manager](https://opam.ocaml.org)

There are available from various package managers, e.g., from [Homebrew](https://brew.sh):
```bash
brew install node opam
```

## Setup

```bash
$ git clone git@github.com:SRI-CSL/smart-contract-explorer.git
$ git submodule init
$ git submodule update
$ npm link
```

## Usage

```bash
$ sc-simulation --help
```
```
usage: sc-simulation --source <filename> --target <filename>

Options:
  --version     Show version number                                    [boolean]
  --verbose     output verbosity                      [boolean] [default: false]
  --output      output directory     [string] [default: ".sc-simulation.ignore"]
  --source      source smart contract                        [string] [required]
  --target      target smart contract                        [string] [required]
  --states      number of states to explore                [number] [default: 5]
  --relation    append to the simulation relation                       [string]
  --examples    generate examples for synthesis        [boolean] [default: true]
  --synthesize  synthesize the simulation relation     [boolean] [default: true]
  --verify      verify the simulation contract         [boolean] [default: true]
  --help        Show help                                              [boolean]
```

### Generating examples for synthesis

```bash
$ sc-simulation --source resources/contracts/Token/ERC20-molochventures/ERC20.impl.sol  --target resources/contracts/Token/ERC20-openzeppelin/ERC20.spec.sol --no-synthesize --no-verify && cat .sc-simulation.ignore/SimulationExamples.sol
```
```
sc-simulation version 0.0.1

---
Generating examples
---
Warning: did not generate accessor for mapping: _allowed
Warning: did not generate accessor for mapping: allowances
```
```solidity
pragma solidity ^0.5.0;

import "/Users/mje/Code/smart-contract-explorer/.sc-simulation.ignore/ERC20.impl.exemplified.sol";
import "/Users/mje/Code/smart-contract-explorer/.sc-simulation.ignore/ERC20.spec.exemplified.sol";

contract SimulationExamples {
    Token impl;
    ERC20 spec;

    function positiveExample0() public {
        impl = (new Token)();
        spec = (new ERC20)();
    }

    function positiveExample1() public {
        impl = (new Token)();
        impl.transfer(0xab7A7Cb3E460a4ec0B73e07dA54F4173d9bB0c09, 0);
        spec = (new ERC20)();
        spec.transfer(0xab7A7Cb3E460a4ec0B73e07dA54F4173d9bB0c09, 0);
    }

    function positiveExample2() public {
        impl = (new Token)();
        impl.transfer(0x6999c8a988a86C52297D9351235644e5768c28e6, 0);
        spec = (new ERC20)();
        spec.transfer(0x6999c8a988a86C52297D9351235644e5768c28e6, 0);
    }

    function negativeExample0() public {
        impl = (new Token)();
        spec = (new ERC20)();
        spec.transfer(0x6999c8a988a86C52297D9351235644e5768c28e6, 1);
    }

    function negativeExample1() public {
        impl = (new Token)();
        impl.transfer(0xab7A7Cb3E460a4ec0B73e07dA54F4173d9bB0c09, 0);
        spec = (new ERC20)();
        spec.transfer(0x6999c8a988a86C52297D9351235644e5768c28e6, 1);
    }

    function negativeExample2() public {
        impl = (new Token)();
        impl.transfer(0xab7A7Cb3E460a4ec0B73e07dA54F4173d9bB0c09, 1);
        spec = (new ERC20)();
        spec.transfer(0x6999c8a988a86C52297D9351235644e5768c28e6, 1);
    }

    function negativeExample3() public {
        impl = (new Token)();
        impl.transfer(0xab7A7Cb3E460a4ec0B73e07dA54F4173d9bB0c09, 2);
        spec = (new ERC20)();
        spec.transfer(0x6999c8a988a86C52297D9351235644e5768c28e6, 1);
    }

    function negativeExample4() public {
        impl = (new Token)();
        impl.transfer(0x6999c8a988a86C52297D9351235644e5768c28e6, 0);
        spec = (new ERC20)();
        spec.transfer(0x6999c8a988a86C52297D9351235644e5768c28e6, 1);
    }

    function negativeExample5() public {
        impl = (new Token)();
        impl.transfer(0x6999c8a988a86C52297D9351235644e5768c28e6, 1);
        spec = (new ERC20)();
        spec.transfer(0x6999c8a988a86C52297D9351235644e5768c28e6, 1);
    }

    function impl$_balances() public view returns (bytes32) {
        return keccak256(abi.encode(
            impl._balances(0xab7A7Cb3E460a4ec0B73e07dA54F4173d9bB0c09),
            impl._balances(0x6999c8a988a86C52297D9351235644e5768c28e6)
        ));
    }

    function impl$_allowed() public view returns (bytes32) {
        return keccak256(abi.encode(
            impl._allowed(0xab7A7Cb3E460a4ec0B73e07dA54F4173d9bB0c09, 0xab7A7Cb3E460a4ec0B73e07dA54F4173d9bB0c09),
            impl._allowed(0xab7A7Cb3E460a4ec0B73e07dA54F4173d9bB0c09, 0x6999c8a988a86C52297D9351235644e5768c28e6),
            impl._allowed(0x6999c8a988a86C52297D9351235644e5768c28e6, 0xab7A7Cb3E460a4ec0B73e07dA54F4173d9bB0c09),
            impl._allowed(0x6999c8a988a86C52297D9351235644e5768c28e6, 0x6999c8a988a86C52297D9351235644e5768c28e6)
        ));
    }

    function impl$_totalSupply() public view returns (uint) {
        impl._totalSupply();
    }

    function spec$balances() public view returns (bytes32) {
        return keccak256(abi.encode(
            spec.balances(0xab7A7Cb3E460a4ec0B73e07dA54F4173d9bB0c09),
            spec.balances(0x6999c8a988a86C52297D9351235644e5768c28e6)
        ));
    }

    function spec$allowances() public view returns (bytes32) {
        return keccak256(abi.encode(
            spec.allowances(0xab7A7Cb3E460a4ec0B73e07dA54F4173d9bB0c09, 0xab7A7Cb3E460a4ec0B73e07dA54F4173d9bB0c09),
            spec.allowances(0xab7A7Cb3E460a4ec0B73e07dA54F4173d9bB0c09, 0x6999c8a988a86C52297D9351235644e5768c28e6),
            spec.allowances(0x6999c8a988a86C52297D9351235644e5768c28e6, 0xab7A7Cb3E460a4ec0B73e07dA54F4173d9bB0c09),
            spec.allowances(0x6999c8a988a86C52297D9351235644e5768c28e6, 0x6999c8a988a86C52297D9351235644e5768c28e6)
        ));
    }

    function spec$minters() public view returns (bytes32) {
        return keccak256(abi.encode(
            spec.minters(0xab7A7Cb3E460a4ec0B73e07dA54F4173d9bB0c09),
            spec.minters(0x6999c8a988a86C52297D9351235644e5768c28e6)
        ));
    }

    function spec$burners() public view returns (bytes32) {
        return keccak256(abi.encode(
            spec.burners(0xab7A7Cb3E460a4ec0B73e07dA54F4173d9bB0c09),
            spec.burners(0x6999c8a988a86C52297D9351235644e5768c28e6)
        ));
    }
}
```

### Synthesizing simulation relations

```bash
$ sc-simulation --source resources/contracts/Token/BasicToken-impl/BasicToken.impl.sol  --target resources/contracts/Token/BasicToken-spec/BasicToken.spec.sol --no-verify
```
```
sc-simulation version 0.0.1

---
Generating examples
---
Warning: did not generate accessor for mapping: allowances
Warning: did not generate accessor for mapping: allowances

---
Synthesizing simulation relation
---

---
Computed simulation relation:

   spec$balances == impl$balances

---
```

### Verifying simulation relations

```bash
$ DEBUG=*:evaluate sc-simulation --source resources/contracts/Token/ERC20-molochventures/ERC20.impl.sol  --target resources/contracts/Token/ERC20-openzeppelin/ERC20.spec.sol --no-synthesize && cat .sc-simulation.ignore/SimulationCheck.sol
```
```
Keccak bindings are not compiled. Pure JS implementation will be used.

sc-simulation version 0.0.1

---
Generating examples
---
Warning: did not generate accessor for mapping: _allowed
Warning: did not generate accessor for mapping: allowances

---
Checking simulation relation
---

---
Verified simulation relation
---
```
```solidity
pragma solidity ^0.5.0;

import "/Users/mje/Code/smart-contract-explorer/.sc-simulation.ignore/ERC20.impl.internalized.sol";
import "/Users/mje/Code/smart-contract-explorer/.sc-simulation.ignore/ERC20.spec.internalized.sol";

/**
 * @notice invariant __verifier_eq(Token._balances, ERC20.balances)
 * @notice invariant __verifier_eq(Token._allowed, ERC20.allowances)
 */
contract SimulationCheck is Token, ERC20 {

    /**
     * @notice postcondition impl_ret_0 == spec_ret_0
     */
    function check$balance(address account) public view returns (uint256 impl_ret_0, uint256 spec_ret_0) {
        impl_ret_0 = Token.balance(account);
        spec_ret_0 = ERC20.balance(account);
        return (impl_ret_0, spec_ret_0);
    }

    /**
     * @notice postcondition impl_ret_0 == spec_ret_0
     */
    function check$allowance(address owner, address beneficiary) public view returns (uint256 impl_ret_0, uint256 spec_ret_0) {
        impl_ret_0 = Token.allowance(owner, beneficiary);
        spec_ret_0 = ERC20.allowance(owner, beneficiary);
        return (impl_ret_0, spec_ret_0);
    }

    /**
     * @notice modifies Token._balances[msg.sender]
     * @notice modifies Token._balances[to]
     * @notice modifies ERC20.balances[msg.sender]
     * @notice modifies ERC20.balances[to]
     * @notice precondition to != address(0)
     * @notice precondition to != msg.sender
     * @notice precondition ERC20.balances[to] + val >= ERC20.balances[to]
     * @notice precondition ERC20.balances[msg.sender] - val >= 0
     */
    function check$transfer(address to, uint256 val) public {
        Token.transfer(to, val);
        ERC20.transfer(to, val);
    }

    /**
     * @notice modifies Token._allowed[msg.sender]
     * @notice modifies ERC20.allowances[msg.sender]
     * @notice precondition to != address(0)
     */
    function check$approve(address to, uint256 val) public {
        Token.approve(to, val);
        ERC20.approve(to, val);
    }

    /**
     * @notice modifies Token._balances[to]
     * @notice modifies Token._balances[from]
     * @notice modifies Token._allowed[from]
     * @notice modifies ERC20.balances[to]
     * @notice modifies ERC20.balances[from]
     * @notice modifies ERC20.allowances[from]
     * @notice precondition to != address(0)
     * @notice precondition to != from
     * @notice precondition ERC20.allowances[from][msg.sender] - val >= 0
     * @notice precondition ERC20.balances[to] + val >= ERC20.balances[to]
     * @notice precondition ERC20.balances[from] - val >= 0
     */
    function check$transferFrom(address from, address to, uint256 val) public {
        Token.transferFrom(from, to, val);
        ERC20.transferFrom(from, to, val);
    }

    /**
     * @notice modifies Token._allowed[msg.sender]
     * @notice modifies ERC20.allowances[msg.sender]
     * @notice precondition spender != address(0)
     * @notice precondition ERC20.allowances[msg.sender][spender] + val >= ERC20.allowances[msg.sender][spender]
     */
    function check$increaseAllowance(address spender, uint256 val) public {
        Token.increaseAllowance(spender, val);
        ERC20.increaseAllowance(spender, val);
    }

    /**
     * @notice modifies Token._allowed[msg.sender]
     * @notice modifies ERC20.allowances[msg.sender]
     * @notice precondition spender != address(0)
     * @notice precondition ERC20.allowances[msg.sender][spender] - val >= 0
     */
    function check$decreaseAllowance(address spender, uint256 val) public {
        Token.decreaseAllowance(spender, val);
        ERC20.decreaseAllowance(spender, val);
    }

    /**
     * @notice modifies Token._balances[to]
     * @notice modifies Token._totalSupply
     * @notice modifies ERC20.balances[to]
     * @notice precondition to != address(0)
     * @notice precondition ERC20.minters[msg.sender]
     * @notice precondition ERC20.balances[to] + val >= ERC20.balances[to]
     */
    function check$mint(address to, uint256 val) public {
        Token.mint(to, val);
        ERC20.mint(to, val);
    }

    /**
     * @notice modifies Token._balances[from]
     * @notice modifies Token._totalSupply
     * @notice modifies ERC20.balances[from]
     * @notice precondition from != address(0)
     * @notice precondition ERC20.burners[msg.sender]
     * @notice precondition ERC20.balances[from] - val >= 0
     */
    function check$burn(address from, uint256 val) public {
        Token.burn(from, val);
        ERC20.burn(from, val);
    }
}
```
