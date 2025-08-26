import VerifierModule from "../ignition/modules/VerifierModule.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import * as snarkjs from "snarkjs";
import { readFile } from 'fs/promises';
import * as path from "path";
import { join } from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Verifier with Ignition", async function () {
    it("should verify a valid proof", async function () {
        const { ignition } = await network.connect();
        const { verifier } = await ignition.deploy(VerifierModule);        

        // Load Inputs
        const inputs = {"a": 4, "b": 10}

        // Generate Witness 
        const witnessCalculator = (await import('../circuit/multiplier_js/witness_calculator.cjs')).default;
        const wasmPath = join(__dirname, '../circuit/multiplier_js/multiplier.wasm');
        const wasmBuffer = await readFile(wasmPath);
        const wc = await witnessCalculator(wasmBuffer, { sanityCheck: true });
        const witnessBin = await wc.calculateWTNSBin(inputs, true);
        console.log("wc", wc);
        console.log("witness", witnessBin);
        
        // Generate Proof
        const zkeyPath = join(__dirname, '../circuit/multiplier_js/multiplier_0001.zkey');
        const { proof, publicSignals } = await snarkjs.groth16.prove(zkeyPath, witnessBin);
        console.log("proof", proof);
        console.log("publicSignals", publicSignals);
        
        // Format calldata for Solidity Verifier
        const calldataString = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
        const argv = JSON.parse("[" + calldataString + "]");
        console.log("argv", argv);
        const a = argv[0]; // parts of proof
        const b = argv[1];
        const c = argv[2];
        const n = argv[3]; // public signals of circuit

        // Verify Proof
        const result = await verifier.read.verifyProof(argv);
        console.log("verifier result: ", result);
        assert.equal(result, true);
    });
});
