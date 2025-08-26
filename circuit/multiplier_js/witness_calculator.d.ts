declare module '../circuit/multiplier_js/witness_calculator.cjs' {
  interface WitnessCalculator {
    calculateWitness(input: any, sanityCheck?: boolean): Promise<bigint[]>;
    calculateBinWitness(input: any, sanityCheck?: boolean): Promise<Uint8Array>;
    calculateWTNSBin(input: any, sanityCheck?: boolean): Promise<Uint8Array>;
    circom_version(): number;
  }

  function builder(
    code: Buffer,
    options?: { sanityCheck?: boolean }
  ): Promise<WitnessCalculator>;

  export = builder;
}