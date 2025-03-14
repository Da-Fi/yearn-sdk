/* eslint-disable @typescript-eslint/no-explicit-any */
import { Contract } from "@ethersproject/contracts";
import { JsonRpcSigner } from "@ethersproject/providers";

import { ChainId, SdkError } from "..";
import { Context } from "../context";
import { PartnerService } from "../services/partner";
import { SimulationExecutor } from "../simulationExecutor";
import {
  createMockAssetStaticVaultV2,
  createMockToken,
  createMockTransactionOutcome,
  createMockZappableVault,
} from "../test-utils/factories";
import { ZapProtocol } from "../types";
import { PriceFetchingError, ZapError } from "../types/custom/simulation";
import { Yearn } from "../yearn";
import { SimulationInterface } from "./simulation";

const tokenMock = jest.fn(() => Promise.resolve("0x0000000000000000000000000000000000000001"));
const decimalsMock = jest.fn(() => Promise.resolve(1));
const pricePerShareMock = jest.fn(() => Promise.resolve(1));
const zapInApprovalStateMock = jest.fn(() => Promise.resolve({ amount: "0" }));
const zapInApprovalTransactionMock = jest.fn(() => Promise.resolve({ from: "0x000", to: "0x000", data: "" }));
const zapOutApprovalStateMock = jest.fn(() => Promise.resolve({ amount: "0" }));
const zapOutApprovalTransactionMock = jest.fn(() => Promise.resolve({ from: "0x000", to: "0x000", data: "" }));
const getNormalizedValueUsdcMock = jest.fn(() => Promise.resolve("10"));
const zapInMock = jest.fn(() => Promise.resolve({ from: "0x000", to: "0x0000", data: "encodeDeposit" }));
const zapOutMock = jest.fn(() => Promise.resolve(true));
const getZapProtocolMock = jest.fn();
const partnerEncodeDepositMock = jest.fn().mockReturnValue("encodedInputData");
const partnerIsAllowedMock = jest.fn().mockReturnValue(true);
const vaultsGetMock = jest.fn();
const isUnderlyingTokenMock = jest.fn();
const tokensFindByAddressMock = jest.fn();

jest.mock("../services/partner", () => ({
  PartnerService: jest.fn().mockImplementation(() => ({
    encodeDeposit: partnerEncodeDepositMock,
    isAllowed: partnerIsAllowedMock,
    address: "0x00001",
  })),
}));
jest.mock("@ethersproject/providers");
jest.mock("@ethersproject/contracts");
jest.mock("../vault", () => ({
  PickleJarContract: jest.fn().mockImplementation(() => ({
    token: tokenMock,
    decimals: decimalsMock,
    pricePerShare: pricePerShareMock,
    encodeDeposit: jest.fn().mockReturnValue(Promise.resolve("encodeDeposit")),
  })),
  YearnVaultContract: jest.fn().mockImplementation(() => ({
    token: tokenMock,
    encodeDeposit: jest.fn().mockReturnValue("encodeDeposit"),
  })),
}));

const SignerMock = JsonRpcSigner as jest.Mocked<typeof JsonRpcSigner>;

const buildSignerMock = (balance = 1, transactionCount = 1): any => {
  const getBalanceMock = jest.fn().mockImplementation(() => Promise.resolve(balance));

  const getTransactionCountMock = jest.fn().mockImplementation(() => Promise.resolve(transactionCount));

  const signer = new SignerMock("0x00", "provider" as any) as any;
  signer.getBalance = getBalanceMock;
  signer.getTransactionCount = getTransactionCountMock;
  signer.getSigner = (): any => signer;
  return signer;
};

jest.mock("../yearn", () => ({
  Yearn: jest.fn().mockImplementation(() => ({
    services: {
      telegram: jest.fn(),
      oracle: {
        getNormalizedValueUsdc: getNormalizedValueUsdcMock,
      },
      pickle: {
        getPriceUsdc: getNormalizedValueUsdcMock,
      },
      zapper: {
        zapInApprovalState: zapInApprovalStateMock,
        zapInApprovalTransaction: zapInApprovalTransactionMock,
        zapOutApprovalState: zapOutApprovalStateMock,
        zapOutApprovalTransaction: zapOutApprovalTransactionMock,
        zapIn: zapInMock,
        zapOut: zapOutMock,
        getZapProtocol: getZapProtocolMock,
      },
      portals: {
        zapInApprovalState: zapInApprovalStateMock,
        zapInApprovalTransaction: zapInApprovalTransactionMock,
        zapOutApprovalState: zapOutApprovalStateMock,
        zapOutApprovalTransaction: zapOutApprovalTransactionMock,
        zapIn: zapInMock,
        zapOut: zapOutMock,
        getZapProtocol: getZapProtocolMock,
      },
    },
    tokens: {
      findByAddress: tokensFindByAddressMock,
    },
    vaults: {
      get: vaultsGetMock,
      isUnderlyingToken: isUnderlyingTokenMock,
    },
  })),
}));

jest.mock("../context", () => ({
  Context: jest.fn().mockImplementation(() => ({
    provider: {
      write: buildSignerMock(),
    },
  })),
}));

describe("Simulation interface", () => {
  let simulationInterface: SimulationInterface<1>;
  const MockedYearnClass = Yearn as jest.Mock<Yearn<1>>;
  let executeSimulationWithReSimulationOnFailureSpy: jest.SpyInstance;
  let simulateVaultInteractionSpy: jest.SpyInstance;

  beforeEach(() => {
    const mockedYearn = new MockedYearnClass();
    simulationInterface = new SimulationInterface(mockedYearn, 1, new Context({}));
    jest.spyOn(SimulationExecutor.prototype, "makeSimulationRequest").mockReturnValueOnce(
      Promise.resolve({
        transaction: {
          transaction_info: {
            call_trace: { output: "1", calls: null },
            logs: [],
          },
        },
        simulation: {
          id: "id",
        },
      })
    );
    jest.spyOn(SimulationExecutor.prototype, "createFork").mockReturnValue(Promise.resolve("1"));
    simulateVaultInteractionSpy = jest
      .spyOn(SimulationExecutor.prototype, "simulateVaultInteraction")
      .mockReturnValue(Promise.resolve("1"));
    executeSimulationWithReSimulationOnFailureSpy = jest.spyOn(
      SimulationExecutor.prototype,
      "executeSimulationWithReSimulationOnFailure"
    );
    jest.spyOn(console, "error").mockImplementation();

    (Contract as any).prototype.allowance = jest.fn().mockReturnValue(Promise.resolve("100000000000"));
    getZapProtocolMock.mockReturnValue(ZapProtocol.YEARN);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("deposit", () => {
    beforeEach(() => {
      const ZapInSupportedToken = createMockToken({ supported: { portalsZapIn: true } });
      tokensFindByAddressMock.mockResolvedValue(ZapInSupportedToken);

      const vaultMock = createMockAssetStaticVaultV2();
      const ZapInVaultMetadata = {
        ...vaultMock,
        metadata: { ...vaultMock.metadata, allowZapIn: true, zapInWith: "portalsZapIn" },
      };
      vaultsGetMock.mockResolvedValue([ZapInVaultMetadata]);
    });

    it("should fail with SdkError when there is no vault token", async () => {
      vaultsGetMock.mockReturnValueOnce(Promise.reject(new Error("something bad happened")));

      return expect(simulationInterface.deposit("0x000", "0x000", "1", "0x000")).rejects.toThrowError(
        "something bad happened"
      );
    });

    it("should fail with SdkError when there is no token", async () => {
      tokensFindByAddressMock.mockReturnValueOnce(Promise.reject(new Error("Token not found!")));

      return expect(simulationInterface.deposit("0x000", "0x000", "1", "0x000")).rejects.toThrowError(
        "Token not found!"
      );
    });

    it("should fail with SDK no slippage error if none was passed", async () => {
      expect.assertions(2);
      tokenMock.mockReturnValueOnce(Promise.resolve("0x001"));
      try {
        await simulationInterface.deposit("0x000", "0x000", "1", "0x000");
      } catch (error) {
        expect(error).toBeInstanceOf(SdkError);
        expect(error).toHaveProperty("error_code", SdkError.NO_SLIPPAGE);
      }
    });

    it("should fail with ZapError zap in approval state error", async () => {
      expect.assertions(2);
      tokenMock.mockReturnValueOnce(Promise.resolve("0x001"));
      zapInApprovalStateMock.mockReturnValueOnce(Promise.reject(new Error("something bad happened")));
      try {
        await simulationInterface.deposit("0x000", "0x000", "1", "0x000", { slippage: 1 });
      } catch (error) {
        expect(error).toBeInstanceOf(ZapError);
        expect(error).toHaveProperty("error_code", ZapError.ZAP_IN_APPROVAL_STATE);
      }
    });

    it("should fail with ZapError zap in", async () => {
      expect.assertions(2);
      tokenMock.mockReturnValueOnce(Promise.resolve("0x001"));
      zapInMock.mockReturnValueOnce(Promise.reject(new Error("something bad happened")));
      try {
        await simulationInterface.deposit("0x000", "0x000", "1", "0x000", { slippage: 1 });
      } catch (error) {
        expect(error).toBeInstanceOf(ZapError);
        expect(error).toHaveProperty("error_code", ZapError.ZAP_IN);
      }
    });

    it("should fail with No decimals error", async () => {
      expect.assertions(2);
      tokenMock.mockReturnValueOnce(Promise.resolve("0x001"));
      const vaultMock = createMockAssetStaticVaultV2();
      const zapInVaultWithoutDecimals = {
        ...vaultMock,
        decimals: undefined,
        metadata: { ...vaultMock.metadata, allowZapIn: true, zapInWith: "portalsZapIn" },
      };
      vaultsGetMock.mockResolvedValue([zapInVaultWithoutDecimals]);

      await expect(simulationInterface.deposit("0x000", "0x000", "1", "0x000", { slippage: 1 })).rejects.toThrowError(
        "Decimals missing for vault 0x001"
      );
      expect(console.error).toHaveBeenCalledWith(new Error("Decimals missing for vault 0x001"));
    });

    it("should fail with No price per share error", async () => {
      expect.assertions(2);
      const vaultMock = createMockAssetStaticVaultV2();
      tokenMock.mockReturnValueOnce(Promise.resolve("0x001"));
      const zapInVaultWithoutPricePerShare = {
        ...vaultMock,
        decimals: "18",
        metadata: { ...vaultMock.metadata, allowZapIn: true, zapInWith: "portalsZapIn", pricePerShare: undefined },
      };
      vaultsGetMock.mockResolvedValue([zapInVaultWithoutPricePerShare]);

      await expect(simulationInterface.deposit("0x000", "0x000", "1", "0x000", { slippage: 1 })).rejects.toThrowError(
        "Price per share missing in vault 0x001 metadata"
      );
      expect(console.error).toHaveBeenCalledWith(new Error("Price per share missing in vault 0x001 metadata"));
    });

    it("should fail with PriceFetchingError while fetching the oracle price", async () => {
      expect.assertions(2);
      tokenMock.mockReturnValueOnce(Promise.resolve("0x001"));
      getNormalizedValueUsdcMock.mockReturnValueOnce(Promise.reject(new Error("something bad happened")));
      try {
        await simulationInterface.deposit("0x000", "0x000", "1", "0x000", { slippage: 1 });
      } catch (error) {
        expect(error).toBeInstanceOf(PriceFetchingError);
        expect(error).toHaveProperty("error_code", PriceFetchingError.FETCHING_PRICE_ORACLE);
      }
    });

    it("should fail with PriceFetchingError while fetching the pickle price", async () => {
      expect.assertions(2);
      getZapProtocolMock.mockReturnValue(ZapProtocol.PICKLE);
      tokenMock.mockReturnValueOnce(Promise.resolve("0x001"));
      getNormalizedValueUsdcMock.mockReturnValueOnce(Promise.reject(new Error("something bad happened")));
      try {
        await simulationInterface.deposit("0x000", "0x000", "1", "0xCeD67a187b923F0E5ebcc77C7f2F7da20099e378", {
          slippage: 1,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(PriceFetchingError);
        expect(error).toHaveProperty("error_code", PriceFetchingError.FETCHING_PRICE_PICKLE);
      }
    });

    it("should fail with PriceFetchingError while fetching the oracle price", async () => {
      expect.assertions(2);
      tokenMock.mockReturnValueOnce(Promise.resolve("0x001"));
      getNormalizedValueUsdcMock.mockReturnValueOnce(Promise.reject(new Error("something bad happened")));
      try {
        await simulationInterface.deposit("0x000", "0x001", "1", "0x0000", { slippage: 1 });
      } catch (error) {
        expect(error).toBeInstanceOf(PriceFetchingError);
        expect(error).toHaveProperty("error_code", PriceFetchingError.FETCHING_PRICE_ORACLE);
      }
    });

    describe("when it does not have the partner service", () => {
      it("should call the partner service deposit", async () => {
        tokenMock.mockReturnValueOnce(Promise.resolve("0x001"));
        executeSimulationWithReSimulationOnFailureSpy.mockImplementationOnce((fn) => fn());

        await simulationInterface.deposit("0x000", "0x001", "1", "0x0000", { slippage: 1 });
        expect(executeSimulationWithReSimulationOnFailureSpy).toHaveBeenCalledTimes(1);
        expect(partnerEncodeDepositMock).toHaveBeenCalledTimes(0);
        expect(simulateVaultInteractionSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe("when it has the partner service", () => {
      beforeEach(() => {
        const nativeToken = createMockToken();
        tokensFindByAddressMock.mockResolvedValue(nativeToken);

        const vaultMock = createMockAssetStaticVaultV2();
        const zapInVaultMetadata = {
          ...vaultMock,
          metadata: { ...vaultMock.metadata, allowZapIn: true, zapInWith: "portalsZapIn" },
        };
        vaultsGetMock.mockResolvedValue([zapInVaultMetadata]);
        isUnderlyingTokenMock.mockResolvedValueOnce(true);
      });

      it("should call the partner contract", async () => {
        const mockedYearn = new MockedYearnClass();
        mockedYearn.services.partner = new (PartnerService as unknown as jest.Mock<PartnerService<ChainId>>)();
        simulationInterface = new SimulationInterface(mockedYearn, 1, new Context({}));
        tokenMock.mockReturnValueOnce(Promise.resolve("0x001"));
        executeSimulationWithReSimulationOnFailureSpy.mockImplementationOnce((fn) => fn());

        await simulationInterface.deposit("0x000", "0x001", "1", "0x0000", { slippage: 1 });
        expect(executeSimulationWithReSimulationOnFailureSpy).toHaveBeenCalledTimes(1);
        expect(partnerEncodeDepositMock).toHaveBeenCalledTimes(1);
        expect(simulateVaultInteractionSpy).toHaveBeenCalledTimes(1);
        expect(simulateVaultInteractionSpy).toHaveBeenCalledWith("0x000", "0x00001", "encodedInputData", "0x0000", {
          forkId: undefined,
          root: undefined,
          save: undefined,
          slippage: 1,
        });
      });
    });

    it("should fail if deposit of token to vault is not supported", async () => {
      expect.assertions(1);
      tokenMock.mockReturnValueOnce(Promise.resolve("0x001"));
      const depositableVaultMock = createMockZappableVault();
      vaultsGetMock.mockResolvedValue([
        { ...depositableVaultMock, metadata: { ...depositableVaultMock.metadata, zapInWith: undefined } },
      ]);

      await expect(simulationInterface.deposit("0x000", "0x000", "1", "0x000", { slippage: 1 })).rejects.toThrowError(
        "Deposit of 0x001 to 0x000 is not supported"
      );
    });
  });

  describe("withdraw", () => {
    beforeEach(() => {
      const zapOutSupportedToken = createMockToken({ supported: { portalsZapOut: true } });
      tokensFindByAddressMock.mockResolvedValue(zapOutSupportedToken);

      const vaultMock = createMockAssetStaticVaultV2();
      const zapOutVaultMetadata = {
        ...vaultMock,
        metadata: { ...vaultMock.metadata, allowZapOut: true, zapOutWith: "portalsZapOut" },
      };
      vaultsGetMock.mockResolvedValue([zapOutVaultMetadata]);
    });

    it("should fail when the vault is not found", async () => {
      vaultsGetMock.mockResolvedValueOnce([]);

      return expect(simulationInterface.withdraw("0xWallet", "0xVault", "1", "0xToken")).rejects.toThrowError(
        new SdkError("Could not get vault: 0xVault")
      );
    });

    it("should fail when the token is not found", async () => {
      tokensFindByAddressMock.mockResolvedValueOnce(undefined);

      return expect(simulationInterface.withdraw("0xWallet", "0xVault", "1", "0xToken")).rejects.toThrowError(
        new SdkError("Could not find the token by address: 0xToken")
      );
    });

    it("should fail with SDK no slippage error if none was passed", async () => {
      return expect(
        simulationInterface.withdraw("0x000", "0x000", "1", "0x0000000000000000000000000000000000000001")
      ).rejects.toThrowError(new SdkError("slippage needs to be specified for a zap", SdkError.NO_SLIPPAGE));
    });

    it("should fail with ZapError zap out approval state error", async () => {
      expect.assertions(2);
      tokenMock.mockReturnValueOnce(Promise.resolve("0x001"));
      zapOutApprovalStateMock.mockReturnValueOnce(Promise.reject(new Error("something bad happened")));
      try {
        await simulationInterface.withdraw("0x000", "0x000", "1", "0x0000000000000000000000000000000000000001", {
          slippage: 1,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ZapError);
        expect(error).toHaveProperty("error_code", ZapError.ZAP_OUT_APPROVAL_STATE);
      }
    });

    it("should fail with ZapError zap out approval", async () => {
      expect.assertions(2);
      tokenMock.mockReturnValueOnce(Promise.resolve("0x001"));
      zapOutApprovalStateMock.mockReturnValueOnce(Promise.resolve({ amount: "0" }));
      zapOutApprovalTransactionMock.mockReturnValueOnce(Promise.reject(new Error("something bad happened")));
      try {
        await simulationInterface.withdraw("0x000", "0x000", "1", "0x0000000000000000000000000000000000000001", {
          slippage: 1,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ZapError);
        expect(error).toHaveProperty("error_code", ZapError.ZAP_OUT_APPROVAL);
      }
    });

    it("should throw when withdraw is not supported", async () => {
      isUnderlyingTokenMock.mockResolvedValue(false);

      const unsupportedToken = createMockToken({ supported: {} });
      tokensFindByAddressMock.mockResolvedValue(unsupportedToken);

      const zappableVaultMock = createMockZappableVault();
      vaultsGetMock.mockResolvedValue([
        { ...zappableVaultMock, metadata: { ...zappableVaultMock.metadata, zapOutWith: undefined } },
      ]);

      return expect(
        simulationInterface.withdraw("0x000", "0x000", "1", "0x0000000000000000000000000000000000000001")
      ).rejects.toThrowError("Withdraw from 0x000 to 0x0000000000000000000000000000000000000001 is not supported");
    });

    it("should call the directWithdraw with the correct arguments when withdrawing the underlying token", async () => {
      isUnderlyingTokenMock.mockResolvedValue(true);
      const transactionOutcomeMock = createMockTransactionOutcome();
      const directWithdrawMock = jest.fn().mockResolvedValueOnce(transactionOutcomeMock);
      (SimulationInterface as any).prototype.directWithdraw = directWithdrawMock;

      await simulationInterface.withdraw("0xWallet", "0xVault", "1", "0xToken", {
        slippage: 1,
      });

      expect(directWithdrawMock).toHaveBeenCalledWith({
        amount: "1",
        from: "0xWallet",
        fromVault: "0xVault",
        options: {
          save: false,
          slippage: 1,
        },
        toToken: "0xToken",
        vaultContract: {
          encodeDeposit: expect.any(Function),
          token: expect.any(Function),
        },
      });
      expect(executeSimulationWithReSimulationOnFailureSpy).toHaveBeenCalledTimes(1);
    });
  });
});
