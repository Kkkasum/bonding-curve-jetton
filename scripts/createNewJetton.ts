import { compile, NetworkProvider } from '@ton/blueprint';
import { Address, toNano } from '@ton/core';
import { jettonContentToCell } from '../wrappers/BcJettonMinter';
import { Launch } from '../wrappers/Launch';

export async function run(provider: NetworkProvider) {
    const adminAddress = Address.parse('0QB_MpZaOhVMdN4Q6NsRCGYpHsOYqxiEuqIGsyUhweQnaQ4g');
    const feeAddress = Address.parse('0QB_MpZaOhVMdN4Q6NsRCGYpHsOYqxiEuqIGsyUhweQnaQ4g');

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

    await launch.sendLaunch(provider.sender(), {
        value: toNano('1.5'),
        content: jettonContentToCell({ type: 1, uri: 'asd' }),
        authorAddress: adminAddress,
    });
}
