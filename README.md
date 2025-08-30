# ZK-PROTOTYPE

This repository was created to help learn how to implement circuits for Zero Knowledge Proofs (Groth16 zk-SNARK protocol) and generating Verifiers on Solidity. The Solidity Verifier is deployed via Hardhat and a Hardhat test file was created (`test/Verifier.test.ts`) that implements the deployment and test of such Verifier. 

Goal of the test is to prove that we can provide two integers $a,b$ such that:

$$
a + b = N
$$

At a high level, the test takes care of the following.
```
* Define Inputs
* Generate Witness
    - import witness_calculator.js that was generated when compiling our circuit. 
    - calculate witness in binary format
* Generate Proof
    - use `.zkey` generated using Powers of Tau and Phase 2 ceremonies to ensure trusted set up for Groth16.
* Using the `witness` and `.zkey` generate Proof and Public signals used to call the solidity verifier. 
```


*Below are the finer details and steps that were used to set up the circuit and create the Solidity verifier using Circom. This assumes you have installed Circom, Hardat, Node dependencies*

*The original outputs of all below steps are included in project as is.*

Circuit Compilation
---
Generate the following files with compilation

`--r1cs`: circuit.r1cs contains the rank 1 constraint system in a binary format.

`--wasm`: generates a directory circuit_js that contains `circuit.wasm` and other files that are needed to generate the witness.

`--sym`: circuit.sym is a file that is userful for debugging or for printing the contraint system in an annotated mode. 

`-o`: set path directory of outputs

```
circom ./circuit/multiplier.circom --r1cs --wasm --sym -o ./circuit
```


Computing Witness
---
The witness is the secret inofrmation that proves that the statement is true, we don't want to reveal that information directly to the verifier. 

>ZK Proofs: Public Inputs (viewable) and private inputs (witness)

The prover will compute all intermediate steps in circuit using both public and private inputs. The complete assigment of values that makes all the circuit's contraits true is the Witness. Think about it as a passthough of the circuit with all the public/private inputs.

Goal: generate `multipler.wtns` in a format that is accepted by `snarkjs`.

Compute the Witness with WebAssembly

```
node ./circuit/multiplier_js/generate_witness.js ./circuit/multiplier_js/multiplier.wasm ./circuit/multiplier_js/input.json ./circuit/multiplier_js/witness.wtns
```

Proving Circuits
---
Use `snarkjs` to generate and validate a proof for our input. 

Generate a trusted setup for Groth16:

why? need to introduce randomness to create proving/verifying keys. The randomness is called a Structured Reference String (SRS). If the randomness is ever leaked or manipulated the entire system can be compromised (forge proofs). 

how? powers of tau ceremony. We can generate randomness securely by contributing to this ceremony. Imagine we are baking a cake with 100 chefs. Each chef contributes an arbitrary ingredient and each chef throws their ingredient away. As long as one chef really destroyed their secret then the final spice mix is safe and random. Power of Tau essentially is using this process to create a SRS used in a Groth16 trusted setup.

### Powers of Tau

Start new "powers of tau" ceremony:
```
snarkjs powersoftau new bn128 12 ./circuit/multiplier_js/pot12_0000.ptau -v 
```

Then contribute to the ceremony (e.g add ingredient to ensure randomness).

```
snarkjs powersoftau contribute ./circuit/multiplier_js/pot12_0000.ptau ./circuit/multiplier_js/pot12_0001.ptau --name="First contribution" -v
```

In this process we generated randomness needed to Circuit set up which is not circuit-specific but more of a universal setup. Phase two is a circuit-specific setup that takes the power of tau and "specializes" it to our specific circuit. (e.g apply universal randomness to our circuits contraints)

### Phase 2

Using powers of tau in previous step we now apply it to our specific circuit and will provide us the proving and verification keys for our circuit. We are essentially assembling the blueprint and toolkate for building exactly what we want. 


Start Phase 2:
```
snarkjs powersoftau prepare phase2 ./circuit/multiplier_js/pot12_0001.ptau ./circuit/multiplier_js/pot12_final.ptau -v
```

Generate `.zkey` file that contains both th eproving and verification keys together with the phase 2 contributions. 

```
snarkjs groth16 setup ./circuit/multiplier.r1cs ./circuit/multiplier_js/pot12_final.ptau ./circuit/multiplier_js/multiplier_0000.zkey
```

Contribute to Phase2:
```
snarkjs zkey contribute ./circuit/multiplier_js/multiplier_0000.zkey ./circuit/multiplier_js/multiplier_0001.zkey --name="1st Contributor Name" -v
```

Export Verification Key:
```
snarkjs zkey export verificationkey ./circuit/multiplier_js/multiplier_0001.zkey ./circuit/multiplier_js/verification_key.json
```

### Generate Proof:
```
snarkjs groth16 prove ./circuit/multiplier_js/multiplier_0001.zkey ./circuit/multiplier_js/witness.wtns ./circuit/multiplier_js/proof.json ./circuit/multiplier_js/public.json
```

`proof.json`: the zk-proof associated to the circuit and wtiness.

`public.json`: contains the values of the public inputs and outputs

Verify Proof:
```
snarkjs groth16 verify ./circuit/multiplier_js/verification_key.json ./circuit/multiplier_js/public.json ./circuit/multiplier_js/proof.json
```
A valid proof will not only proves that we know a set of signals that satisfy the circuit, but also that the public inputs and outputs that we use match the ones described in the `public.json` file. 

Output:
`[INFO]  snarkJS: OK!`

In the real world, when we want to prove something, we only have to re-generate a witness and proof. The powers of tau and phase 2 process of generating verification keys is a one-time process. This doesn't have to be executed everytime, only the witness and proof generation will happen on new proofs. 

Verify from Smart Contract
---
We can generate the solidity code to generate a verifier that allows verifying proofs on Ethereum

```
snarkjs zkey export solidityverifier ./circuit/multiplier_js/multiplier_0001.zkey ./contracts/verifier.sol
```

Output:
```
[INFO]  snarkJS: EXPORT VERIFICATION KEY STARTED
[INFO]  snarkJS: > Detected protocol: groth16
[INFO]  snarkJS: EXPORT VERIFICATION KEY FINISHED
```

Deploy Smart Contract locally with Hardhat
---


Compile and start local ethereum node.
```
npx hardhat compile
npx hardhat node 
```

Use Hardhat Ignition system to deploy the smart contract on the localhost.
```
npx hardhat ignition deploy ignition/modules/VerifierModule.ts --network localhost
```

Test Smart Contract Verifier with Hardhat
---

Run Tests in root of project with following command:

`npx hardhat test` 

```
verifier result:  true
  Groth16 Verifier
    ✔ should verify a valid proof (1044ms)
```

Deploy Contract to Sepolia Network
---
Verifier Contract was deployed and verfied and can be viewed below

https://sepolia.etherscan.io/address/0xEEAa66d09bE70e9d1F44f31440C9ac1CF1E80B23#code 
