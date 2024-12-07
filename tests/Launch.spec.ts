import { compile } from '@ton/blueprint';
import { Address, Cell, toNano } from '@ton/core';
import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import '@ton/test-utils';
import { BcJettonMinter, jettonContentToCell } from '../wrappers/BcJettonMinter';
import { Launch } from '../wrappers/Launch';

describe('BcJettonMinter', () => {
    let code: Cell;
    let bcJettonMinterCode: Cell;
    let bcJettonWalletCode: Cell;

    beforeAll(async () => {
        code = await compile('Launch');
        bcJettonMinterCode = await compile('BcJettonMinter');
        bcJettonWalletCode = await compile('BcJettonWallet');
    });

    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let fee: SandboxContract<TreasuryContract>;
    let launch: SandboxContract<Launch>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        fee = await blockchain.treasury('fee');

        launch = blockchain.openContract(
            Launch.createFromConfig(
                {
                    adminAddress: admin.address,
                    launchFee: toNano('1'),
                    bcJettonMinterCode: await compile('BcJettonMinter'),
                    bcJettonWalletCode: await compile('BcJettonWallet'),
                    feeAddress: fee.address,
                    routerAddress: Address.parse('EQDx--jUU9PUtHltPYZX7wdzIi0SPY3KZ8nvOs0iZvQJd6Ql'),
                    routerPtonWalletAddress: Address.parse('EQDwOyDlewGw8MkeXgZ_oOmPTIhJIlaJwhJmf4ffIPKv-294'),
                },
                code,
            ),
        );

        const deployLaunchResult = await launch.sendDeploy(admin.getSender(), toNano('0.1'));
        expect(deployLaunchResult.transactions).toHaveTransaction({
            from: admin.address,
            to: launch.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and bcJettonMinter are ready to use
    });

    it('should launch jetton', async () => {
        const sender = await blockchain.treasury('sender');
        const jettonContentCell = jettonContentToCell({ type: 1, uri: 'asd' });

        const bcJettonMinter = blockchain.openContract(
            BcJettonMinter.createFromConfig(
                {
                    totalSupply: toNano(0),
                    adminAddress: admin.address,
                    content: jettonContentCell,
                    jettonWalletCode: bcJettonWalletCode,
                    tonCollected: toNano(0),
                    maxTon: toNano(1500000000000000000n),
                    bcSupply: toNano(800000000),
                    liqSupply: toNano(200000000),
                    authorAddress: sender.address,
                    feeAddress: fee.address,
                    tradeFeeNumerator: 1,
                    tradeFeeDenominator: 100,
                    tradingEnabled: 1,
                    routerAddress: Address.parse('EQDx--jUU9PUtHltPYZX7wdzIi0SPY3KZ8nvOs0iZvQJd6Ql'),
                    routerPtonWalletAddress: Address.parse('EQDwOyDlewGw8MkeXgZ_oOmPTIhJIlaJwhJmf4ffIPKv-294'),
                },
                bcJettonMinterCode,
            ),
        );

        const jettonMinterAddress = await launch.getMinterAddress(jettonContentCell, sender.address);
        expect(bcJettonMinter.address).toEqualAddress(jettonMinterAddress);

        const launchJettonResult = await launch.sendLaunch(sender.getSender(), {
            value: toNano('2'),
            content: jettonContentCell,
            authorAddress: sender.address,
        });
        expect(launchJettonResult.transactions).toHaveTransaction({
            from: sender.address,
            to: launch.address,
            success: true,
        });
        expect(launchJettonResult.transactions).toHaveTransaction({
            from: launch.address,
            to: bcJettonMinter.address,
            op: 0x6117d13b,
            success: true,
        });

        const senderJettonWalletAddress = await bcJettonMinter.getWalletAddress(sender.address);
        expect(launchJettonResult.transactions).toHaveTransaction({
            from: bcJettonMinter.address,
            to: senderJettonWalletAddress,
            op: 0x178d4519,
            success: true,
        });
    });
});
