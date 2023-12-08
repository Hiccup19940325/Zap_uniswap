import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/dist/src/signer-with-address'
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers, network } from "hardhat";

import {
  Zap
} from '../typechain-types';

import {
  ether,
  gWei,
  wei,
  usdc,
  deployZap
} from '../helper'

describe("Zap", function () {
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  let zap: Zap;

  const usdcToken = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const weth = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  const factory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
  const wethTousdc = "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc";
  const daiTousdc = "0xAE461cA67B15dc8dc81CE7615e0320dA1A9aB8D5";

  before(async () => {
    const signers: SignerWithAddress[] = await ethers.getSigners();

    //usdc token holder
    const account = "0x5B541d54e79052B34188db9A43F7b00ea8E2C4B1";

    //fork the mainnet
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [account]
    });

    alice = await ethers.getSigner(account);
    bob = signers[1];

    await signers[0].sendTransaction({
      to: alice.address,
      value: ethers.parseEther("20.0")
    })

    zap = await deployZap(factory, router, weth);

    await signers[0].sendTransaction({
      to: zap.getAddress(),
      value: ethers.parseEther("20.0")
    })
  })

  describe("#ZapInToken", function () {
    it("Failed - Invalid pair or token", async function () {
      await expect(zap.zapInToken(daiTousdc, usdcToken, usdc(20))).to.be.revertedWith("Invalid pair or token")
    });

    it("Failed - amount should be more than 0", async function () {
      await expect(zap.zapInToken(wethTousdc, usdcToken, usdc(0))).to.be.revertedWith("amount should be more than 0")
    });

    it("Success - confirm the LP token increase and return amount", async function () {

      const LPcontacts = await ethers.getContractAt('IERC20', wethTousdc);
      const LPbalance0 = await LPcontacts.balanceOf(alice.address); //old LP token balance

      const UsdcContract = await ethers.getContractAt('IERC20', usdcToken);
      const wethContract = await ethers.getContractAt('IERC20', weth);

      await UsdcContract.connect(alice).approve(zap.getAddress(), usdc(20000));

      const usdcBalance0 = await UsdcContract.balanceOf(alice.address); //old usdc token balance
      const wethBalance0 = await wethContract.balanceOf(alice.address); //old weth token balance

      await zap.connect(alice).zapInToken(wethTousdc, usdcToken, usdc(20000));

      const LPbalance1 = await LPcontacts.balanceOf(alice.address); //new LP token balance
      const usdcBalance1 = await UsdcContract.balanceOf(alice.address); //new usdc token balance
      const wethBalance1 = await wethContract.balanceOf(alice.address); //new weth token balance

      const usdcIncrease = usdcBalance1 - usdcBalance0 + usdc(20000); //returned usdc token
      const wethIncrease = wethBalance1 - wethBalance0; //returned weth token
      const LPIncrease = LPbalance1 - LPbalance0; //LP token increase

      expect(LPIncrease).to.gt(0);
      expect(usdcIncrease > 0 || wethIncrease > 0).to.equal(true);
    });
  });

  describe("#ZapInEth", function () {
    it("Failed - Invalid pair or token", async function () {
      await expect(zap.zapInEth(daiTousdc)).to.be.revertedWith("Invalid pair address")
    });

    it("Failed - ether should be more than 0", async function () {
      await expect(zap.connect(bob).zapInEth(wethTousdc, { value: ether(0) })).to.be.revertedWith("ether should be more than 0")
    });

    it("Success - confirm the LP token increase", async function () {

      const LPcontacts = await ethers.getContractAt('IERC20', wethTousdc);
      const UsdcContract = await ethers.getContractAt('IERC20', usdcToken);

      const LPbalance0 = await LPcontacts.balanceOf(bob.address); //old LP token balance
      const UsdcBalance0 = await UsdcContract.balanceOf(bob.address); //old usdc token balance
      const etherBalance0 = await ethers.provider.getBalance(bob); //old ether balance

      await zap.connect(bob).zapInEth(wethTousdc, { value: ether(10) });

      const LPbalance1 = await LPcontacts.balanceOf(bob.address); //new LP token balance
      const UsdcBalance1 = await UsdcContract.balanceOf(bob.address); //new usdc token balance
      const etherBalance1 = await ethers.provider.getBalance(bob); //new ether balance

      const usdcIncrease = UsdcBalance1 - UsdcBalance0; // returned usdc token
      const etherIncrease = etherBalance1 - etherBalance0 + ether(10); // returned ether 
      const LPIncrease = LPbalance1 - LPbalance0; // LP token increase

      expect(LPIncrease).to.gt(0);
      expect(usdcIncrease > 0 || etherIncrease > 0).to.equal(true);
    });
  });
});
