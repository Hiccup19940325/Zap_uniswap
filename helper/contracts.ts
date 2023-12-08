import { ethers } from 'hardhat';
import { BaseContract } from 'ethers';

import {
    Zap
} from '../typechain-types'

export const deployContract = async<ContractType extends BaseContract>(
    contractName: string,
    args: any[],
    library?: {}
) => {
    const signers = await ethers.getSigners();
    const contract = await (await ethers.getContractFactory(contractName, signers[0], {
        libraries: {
            ...library
        }
    })).deploy(...args) as ContractType;
    return contract;
}

export const deployZap = async (
    _factory: any,
    _router: any,
    _weth: any
) => {
    return await deployContract<Zap>('Zap', [_router, _weth, _factory]);
}