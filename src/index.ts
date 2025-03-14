/**
 * Welcome to the Yearn SDK documentation.
 *
 * ## Yearn namespace
 *
 * [[Yearn]] is a wrapper for all the services and interfaces of the SDK.
 *
 * ### Interfaces
 *
 * - [[VaultInterface]] asset aggregation for yearn's v1 & v2 vaults.
 * - [[TokenInterface]] utility function for ERC20 and balances.
 * - [[EarningsInterface]] historical earnings.
 * - [[FeesInterface]] historical fees collected by yearn.
 *
 * ### Services
 *
 * SDK is divided in services representing the different data sources for
 * yearn products and the access method used to read / write from them.
 *
 * - [[LensService]]: provides access to yearn's assets and user position.
 * -→ [[RegistryV2Adapter]]: adapter of V2 vaults.
 * - [[OracleService]]: pricing engine used for calculations.
 * - [[ZapperService]]: interaction with zapper public API.
 * - [[VisionService]]: interaction with yearn's product stats aggregator.
 * - [[SubgraphService]]: interaction with yearn's subgraph.
 * - [[SimulationService]]: allows simulation of ethereum transactions.
 * - [[TelegramService]]: allows sending telegram messages.
 * - [[AssetService]]: fetching icons of assets supported by yearn.
 *
 * ### Peer dependencies
 *
 * SDK requires several dependencies from the ethers.js project.
 *
 * @module
 */

// global fetch polyfill
import "cross-fetch/polyfill";

export { ChainId } from "./chain";
export { Context, ContextValue } from "./context";
export { EarningsInterface } from "./interfaces/earnings";
export { FeesInterface } from "./interfaces/fees";
export { SimulationInterface } from "./interfaces/simulation";
export { StrategyInterface } from "./interfaces/strategy";
export { TokenInterface } from "./interfaces/token";
export { VaultInterface } from "./interfaces/vault";
export { RegistryV2Adapter } from "./services/adapters/registry";
export { AssetService } from "./services/assets";
export { LensService } from "./services/lens";
export { OracleService } from "./services/oracle";
export { PropertiesAggregatorService } from "./services/propertiesAggregator";
export { SubgraphService } from "./services/subgraph";
export { TelegramService } from "./services/telegram";
export { VisionService } from "./services/vision";
export { ZapperService } from "./services/zapper";
export * from "./types";
export { Yearn } from "./yearn";
export * from "./zap";
