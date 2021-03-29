[@yfi/sdk](README.md) / Exports

# @yfi/sdk

Welcome to the Yearn SDK documentation.

## Modules

SDK is divided in modules representing the different services offered by
yearn and the access method used to read / write from them.

- [LensProvider](classes/lensprovider.md) provides access to yearn's assets and user position.
- [OracleProvider](classes/oracleprovider.md) is the main pricing engine used for all calculations.

## Peer dependencies

SDK requires several dependencies from the ethers.js project.

## Table of contents

### Classes

- [LensProvider](classes/lensprovider.md)
- [OracleProvider](classes/oracleprovider.md)
- [VaultReader](classes/vaultreader.md)
- [Yearn](classes/yearn.md)

### Interfaces

- [Allowance](interfaces/allowance.md)
- [Position](interfaces/position.md)
- [Token](interfaces/token.md)
- [TokenPosition](interfaces/tokenposition.md)

### Type aliases

- [Asset](modules.md#asset)
- [ChainId](modules.md#chainid)
- [Metadata](modules.md#metadata)
- [SpecificAsset](modules.md#specificasset)

## Type aliases

### Asset

Ƭ **Asset**: [*SpecificAsset*](modules.md#specificasset)<*VAULT_V1*\> \| [*SpecificAsset*](modules.md#specificasset)<*VAULT_V2*\>

Defined in: [asset.ts:61](https://github.com/yearn/yearn-sdk/blob/b50bc5d/src/asset.ts#L61)

___

### ChainId

Ƭ **ChainId**: keyof *typeof* Chains

Defined in: [chain.ts:12](https://github.com/yearn/yearn-sdk/blob/b50bc5d/src/chain.ts#L12)

___

### Metadata

Ƭ **Metadata**: *object*

#### Type declaration:

Name | Type |
:------ | :------ |
`VAULT_V1` | *object* |
`VAULT_V1.controller` | Address |
`VAULT_V1.pricePerShare` | BigNumber |
`VAULT_V1.totalAssets` | BigNumber |
`VAULT_V1.totalSupply` | BigNumber |
`VAULT_V2` | *object* |
`VAULT_V2.depositLimit` | BigNumber |
`VAULT_V2.emergencyShutdown` | *boolean* |
`VAULT_V2.latestVaultAddress` | Address |
`VAULT_V2.migrationAvailable` | *boolean* |
`VAULT_V2.pricePerShare` | BigNumber |
`VAULT_V2.symbol` | *string* |

Defined in: [asset.ts:5](https://github.com/yearn/yearn-sdk/blob/b50bc5d/src/asset.ts#L5)

___

### SpecificAsset

Ƭ **SpecificAsset**<T\>: *object*

#### Type parameters:

Name | Type |
:------ | :------ |
`T` | keyof [*Metadata*](modules.md#metadata) |

#### Type declaration:

Name | Type |
:------ | :------ |
`balance` | BigNumber |
`balanceUsdc` | BigNumber |
`id` | Address |
`metadata` | [*Metadata*](modules.md#metadata)[T] |
`name` | *string* |
`token` | [*Token*](interfaces/token.md) |
`type` | T |
`typeId` | *string* |
`version` | *string* |

Defined in: [asset.ts:42](https://github.com/yearn/yearn-sdk/blob/b50bc5d/src/asset.ts#L42)
