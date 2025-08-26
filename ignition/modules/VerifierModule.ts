import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("VerifierModule", (m) => {
  const verifier = m.contract("Groth16Verifier");
  return { verifier };
});
