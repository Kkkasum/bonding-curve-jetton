import { compile, NetworkProvider } from '@ton/blueprint';
import { Address, Cell, toNano } from '@ton/core';
import { BcJettonMinter } from '../wrappers/BcJettonMinter';

export async function run(provider: NetworkProvider) {
    const adminAddress = Address.parse('EQB_MpZaOhVMdN4Q6NsRCGYpHsOYqxiEuqIGsyUhweQnaehv');
    const jettonWalletCode = await compile('BcJettonWallet');
    const authorAddress = Address.parse('EQB_MpZaOhVMdN4Q6NsRCGYpHsOYqxiEuqIGsyUhweQnaehv');
    const feeAddress = Address.parse('EQB_MpZaOhVMdN4Q6NsRCGYpHsOYqxiEuqIGsyUhweQnaehv');

    const bcJettonMinter = provider.open(
        BcJettonMinter.createFromConfig(
            {
                totalSupply: toNano(0),
                adminAddress: adminAddress,
                content: Cell.EMPTY,
                jettonWalletCode: jettonWalletCode,
                tonCollected: toNano(0),
                maxTon: toNano(1500),
                bcSupply: toNano(800000000),
                liqSupply: toNano(200000000),
                authorAddress: authorAddress,
                feeAddress: feeAddress,
                tradeFeeNumerator: 1,
                tradeFeeDenominator: 100,
                tradingEnabled: 1,
                routerAddress: Address.parse('EQDx--jUU9PUtHltPYZX7wdzIi0SPY3KZ8nvOs0iZvQJd6Ql'),
                routerPtonWalletAddress: Address.parse('EQDwOyDlewGw8MkeXgZ_oOmPTIhJIlaJwhJmf4ffIPKv-294'),
            },
            await compile('BcJettonMinter'),
        ),
    );
    await bcJettonMinter.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(bcJettonMinter.address);

    // run methods on `bcJettonMinter`
}
