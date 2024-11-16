import { compile, NetworkProvider } from '@ton/blueprint';
import { Address, toNano } from '@ton/core';
import { Launch } from '../wrappers/Launch';

export async function run(provider: NetworkProvider) {
    const adminAddress = Address.parse('EQB_MpZaOhVMdN4Q6NsRCGYpHsOYqxiEuqIGsyUhweQnaehv');
    const feeAddress = Address.parse('');

    //EQD76IdOpu1-NK-x3mCcxZDjHYYdLBSn768a4cQ2FLtFpJSf

    const launch = provider.open(
        Launch.createFromConfig(
            {
                adminAddress: adminAddress,
                launchFee: toNano('1'),
                bcJettonMinterCode: await compile('BcJettonMinter'),
                bcJettonWalletCode: await compile('BcJettonWallet'),
                feeAddress: feeAddress,
                routerAddress: Address.parse('EQDx--jUU9PUtHltPYZX7wdzIi0SPY3KZ8nvOs0iZvQJd6Ql'),
                routerPtonWalletAddress: Address.parse('EQDwOyDlewGw8MkeXgZ_oOmPTIhJIlaJwhJmf4ffIPKv-294'),
            },
            await compile('Launch'),
        ),
    );

    await launch.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(launch.address);
}
