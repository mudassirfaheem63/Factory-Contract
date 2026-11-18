
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TokenNFTFactoryModule = buildModule(
  "TokenNFTFactoryModule",
  (m) => {
    const factory = m.contract("TokenNFTFactory");

    return { factory };
  }
);

export default TokenNFTFactoryModule;
