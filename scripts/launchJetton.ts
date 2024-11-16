import { compile, NetworkProvider } from '@ton/blueprint';
import { Address, Cell, toNano } from '@ton/core';
import { Launch } from '../wrappers/Launch';

export async function run(provider: NetworkProvider) {
    const adminAddress = Address.parse('EQB_MpZaOhVMdN4Q6NsRCGYpHsOYqxiEuqIGsyUhweQnaehv');
    const authorAddress = Address.parse('EQB_MpZaOhVMdN4Q6NsRCGYpHsOYqxiEuqIGsyUhweQnaehv');
    const feeAddress = Address.parse('0QA42cXENEQIFdyGn0LvkMATaTXVGKspTHalqReI9VKZPAPY');

    //EQD76IdOpu1-NK-x3mCcxZDjHYYdLBSn768a4cQ2FLtFpJSf

    const launch = provider.open(
        Launch.createFromConfig(
            {
                adminAddress: adminAddress,
                launchFee: toNano('3'), // комиссия для запуска токена
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
        value: toNano('4'), // должно купить приблизительно на два тона
        content: Cell.EMPTY,
        authorAddress: authorAddress,
    });

    // run methods on `bcJettonMinter`
}
