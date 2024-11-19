import { compile } from '@ton/blueprint';
import { Address, Cell, toNano } from '@ton/core';
import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import '@ton/test-utils';
import { BcJettonMinter, jettonContentToCell } from '../wrappers/BcJettonMinter';
import { BcJettonWallet } from '../wrappers/BcJettonWallet';
[];
describe('BcJettonMinter', () => {
    let code: Cell;
    let jettonWalletCode: Cell;

    beforeAll(async () => {
        code = await compile('BcJettonMinter');
        jettonWalletCode = await compile('BcJettonWallet');
    });

    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let author: SandboxContract<TreasuryContract>;
    let commonSender: SandboxContract<TreasuryContract>;
    let feeAddress: SandboxContract<TreasuryContract>;
    let bcJettonMinter: SandboxContract<BcJettonMinter>;
    let adminJettonWallet: SandboxContract<BcJettonWallet>;
    let commonSenderJettonWallet: SandboxContract<BcJettonWallet>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        author = await blockchain.treasury('author');
        commonSender = await blockchain.treasury('commonSender');
        feeAddress = await blockchain.treasury('feeAddress');

        bcJettonMinter = blockchain.openContract(
            BcJettonMinter.createFromConfig(
                {
                    totalSupply: toNano(1000),
                    adminAddress: admin.address,
                    content: Cell.EMPTY,
                    jettonWalletCode: jettonWalletCode,
                    tonCollected: toNano(0),
                    maxTon: toNano(1500000000000000000),
                    bcSupply: toNano(800000000),
                    liqSupply: toNano(200000000),
                    authorAddress: author.address,
                    feeAddress: feeAddress.address,
                    tradeFeeNumerator: 1,
                    tradeFeeDenominator: 100,
                    tradingEnabled: 1,
                    routerAddress: Address.parse('EQDx--jUU9PUtHltPYZX7wdzIi0SPY3KZ8nvOs0iZvQJd6Ql'),
                    routerPtonWalletAddress: Address.parse('EQDwOyDlewGw8MkeXgZ_oOmPTIhJIlaJwhJmf4ffIPKv-294'),
                },
                code,
            ),
        );

        const deployBcJettonMinterResult = await bcJettonMinter.sendDeploy(admin.getSender(), toNano('1'));
        expect(deployBcJettonMinterResult.transactions).toHaveTransaction({
            from: admin.address,
            to: bcJettonMinter.address,
            deploy: true,
            success: true,
        });

        adminJettonWallet = blockchain.openContract(
            BcJettonWallet.createFromAddress(await bcJettonMinter.getWalletAddress(admin.address)),
        );
        commonSenderJettonWallet = blockchain.openContract(
            BcJettonWallet.createFromAddress(await bcJettonMinter.getWalletAddress(commonSender.address)),
        );
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and bcJettonMinter are ready to use
    });

    it('should purchase', async () => {
        const tonAmount = toNano('10');
        let coinsForTons = await bcJettonMinter.getCoinsForTons(tonAmount);

        const slippage = 0.1;
        const slippageAmount = (Number(coinsForTons.coins) / 10 ** 9) * slippage;
        const minReceiveAmount = coinsForTons.coins - toNano(slippageAmount);

        const purchaseResult = await bcJettonMinter.sendPurchase(commonSender.getSender(), {
            value: tonAmount,
            minReceiveAmount: minReceiveAmount,
        });
        expect(purchaseResult.transactions).toHaveTransaction({
            from: commonSender.address,
            to: bcJettonMinter.address,
            success: true,
        });
        expect(purchaseResult.transactions).toHaveTransaction({
            from: bcJettonMinter.address,
            to: commonSenderJettonWallet.address,
            op: 0x178d4519,
            success: true,
        });

        const jettonWalletBalance = await commonSenderJettonWallet.getBalance();
        expect(jettonWalletBalance).toBeGreaterThanOrEqual(minReceiveAmount);
    });

    it('should not purchase when slippage', async () => {});

    it('should sell', async () => {
        const tonAmount = toNano('10');
        const coinsForTons = await bcJettonMinter.getCoinsForTons(tonAmount);
        const slippage = 0.1;
        const slippageAmount = (Number(coinsForTons.coins) / 10 ** 9) * slippage;
        const minReceiveAmount = coinsForTons.coins - toNano(slippageAmount);

        await bcJettonMinter.sendPurchase(commonSender.getSender(), {
            value: tonAmount,
            minReceiveAmount: minReceiveAmount,
        });

        const coinsToSell = await commonSenderJettonWallet.getBalance();

        const balanceBeforeSell = await commonSender.getBalance();
        const sellResult = await commonSenderJettonWallet.sendSell(commonSender.getSender(), {
            value: toNano('0.1'),
            jettonAmount: coinsToSell,
            minReceiveAmount: coinsToSell,
        });
        expect(sellResult.transactions).toHaveTransaction({
            from: commonSender.address,
            to: commonSenderJettonWallet.address,
            success: true,
        });
        expect(sellResult.transactions).toHaveTransaction({
            from: commonSenderJettonWallet.address,
            to: bcJettonMinter.address,
            op: 0x9b9ed07d,
            success: true,
        });
        expect(sellResult.transactions).toHaveTransaction({
            from: bcJettonMinter.address,
            to: commonSender.address,
            op: 0xd53276db,
            success: true,
        });

        const balanceAfterSell = await commonSender.getBalance();
        expect(balanceBeforeSell).toBeLessThan(balanceAfterSell);
    });

    it('should mint jettons for admin', async () => {
        const initialJettonSupply = await bcJettonMinter.getTotalSupply();
        const mintJettonAmount = toNano('5');
        const mintResult = await bcJettonMinter.sendMint(admin.getSender(), {
            value: toNano('0.1'),
            toAddress: admin.address,
            jettonAmount: mintJettonAmount,
            forwardTonAmount: toNano('0.05'),
            totalTonAmount: toNano('0.15'),
        });
        expect(mintResult.transactions).toHaveTransaction({
            from: admin.address,
            to: bcJettonMinter.address,
            success: true,
        });
        expect(mintResult.transactions).toHaveTransaction({
            from: bcJettonMinter.address,
            to: adminJettonWallet.address,
            deploy: true,
        });
        expect(await bcJettonMinter.getTotalSupply()).toEqual(initialJettonSupply + mintJettonAmount);
        expect(await adminJettonWallet.getBalance()).toEqual(mintJettonAmount);
    });

    it('should not mint jettons for common sender', async () => {
        const initialJettonSupply = await bcJettonMinter.getTotalSupply();
        const mintJettonAmount = toNano('5');
        const mintResult = await bcJettonMinter.sendMint(commonSender.getSender(), {
            value: toNano('0.1'),
            toAddress: commonSender.address,
            jettonAmount: mintJettonAmount,
            forwardTonAmount: toNano('0.05'),
            totalTonAmount: toNano('0.1'),
        });
        expect(mintResult.transactions).toHaveTransaction({
            from: commonSender.address,
            to: bcJettonMinter.address,
            aborted: true,
            exitCode: 73,
        });
        expect(await bcJettonMinter.getTotalSupply()).toEqual(initialJettonSupply);
        expect(await commonSenderJettonWallet.getBalance()).toEqual(toNano(0));
    });

    it('should provide wallet address', async () => {
        const provideWalletAddressResult = await bcJettonMinter.sendProvideWalletAddress(commonSender.getSender(), {
            owner: commonSender.address,
            includeAddress: false,
        });
        expect(provideWalletAddressResult.transactions).toHaveTransaction({
            from: commonSender.address,
            to: bcJettonMinter.address,
            success: true,
        });
        expect(provideWalletAddressResult.transactions).toHaveTransaction({
            from: bcJettonMinter.address,
            to: commonSender.address,
            op: 0xd1735400,
            success: true,
        });
    });

    it('should change admin', async () => {
        const newAdmin = await blockchain.treasury('newAdmin');
        const changeAdminResult = await bcJettonMinter.sendChangeAdmin(admin.getSender(), {
            adminAddress: newAdmin.address,
        });
        expect(changeAdminResult.transactions).toHaveTransaction({
            from: admin.address,
            to: bcJettonMinter.address,
            success: true,
        });

        const adminAddress = await bcJettonMinter.getAdminAddress();
        expect(adminAddress).toEqualAddress(newAdmin.address);
    });

    it('should not change admin from common sender', async () => {
        const changeAdminResult = await bcJettonMinter.sendChangeAdmin(commonSender.getSender(), {
            adminAddress: commonSender.address,
        });
        expect(changeAdminResult.transactions).toHaveTransaction({
            from: commonSender.address,
            to: bcJettonMinter.address,
            aborted: true,
        });
    });

    it('should change content', async () => {
        const changeContentResult = await bcJettonMinter.sendChangeContent(admin.getSender(), {
            content: { type: 1, uri: 'random.com' },
        });
        expect(changeContentResult.transactions).toHaveTransaction({
            from: admin.address,
            to: bcJettonMinter.address,
            success: true,
        });

        const content = await bcJettonMinter.getContent();
        expect(content).toEqualCell(jettonContentToCell({ type: 1, uri: 'random.com' }));
    });

    it('should not change content from common sender', async () => {
        const changeContentResult = await bcJettonMinter.sendChangeContent(commonSender.getSender(), {
            content: { type: 1, uri: 'random.com' },
        });
        expect(changeContentResult.transactions).toHaveTransaction({
            from: commonSender.address,
            to: bcJettonMinter.address,
            aborted: true,
        });
    });

    it('should change author from author', async () => {
        const newAuthor = await blockchain.treasury('newAuthor');
        const changeAuthorResult = await bcJettonMinter.sendChangeAuthor(author.getSender(), {
            authorAddress: newAuthor.address,
        });
        expect(changeAuthorResult.transactions).toHaveTransaction({
            from: author.address,
            to: bcJettonMinter.address,
            success: true,
        });

        const authorAddress = await bcJettonMinter.getAuthorAddress();
        expect(authorAddress).toEqualAddress(newAuthor.address);
    });

    it('should not change author from admin', async () => {
        const changeAuthorResult = await bcJettonMinter.sendChangeAuthor(admin.getSender(), {
            authorAddress: admin.address,
        });
        expect(changeAuthorResult.transactions).toHaveTransaction({
            from: admin.address,
            to: bcJettonMinter.address,
            aborted: true,
        });
    });

    it('should not change author from common sender', async () => {
        const changeAuthorResult = await bcJettonMinter.sendChangeAuthor(commonSender.getSender(), {
            authorAddress: commonSender.address,
        });
        expect(changeAuthorResult.transactions).toHaveTransaction({
            from: commonSender.address,
            to: bcJettonMinter.address,
            aborted: true,
        });
    });

    it('should change fees', async () => {
        const newFeeAddress = await blockchain.treasury('newFeeAddress');
        const newTradeFeeNumerator = 5;
        const newTradeFeeDenominator = 100;

        const changeFeesResult = await bcJettonMinter.sendChangeFees(admin.getSender(), {
            feeAddress: newFeeAddress.address,
            tradeFeeNumerator: newTradeFeeNumerator,
            tradeFeeDenominator: newTradeFeeDenominator,
        });
        expect(changeFeesResult.transactions).toHaveTransaction({
            from: admin.address,
            to: bcJettonMinter.address,
            success: true,
        });

        const feeAddress = await bcJettonMinter.getFeeAddress();
        const tradeFeeNumerator = await bcJettonMinter.getTradeFeeNumerator();
        const tradeFeeDenominator = await bcJettonMinter.getTradeFeeDenominator();

        expect(feeAddress).toEqualAddress(newFeeAddress.address);
        expect(tradeFeeNumerator).toEqual(newTradeFeeNumerator);
        expect(tradeFeeDenominator).toEqual(newTradeFeeDenominator);
    });

    it('should not change fees from common sender', async () => {
        const newFeeAddress = await blockchain.treasury('newFeeAddress');
        const newTradeFeeNumerator = 5;
        const newTradeFeeDenominator = 100;

        const changeFeesResult = await bcJettonMinter.sendChangeFees(commonSender.getSender(), {
            feeAddress: newFeeAddress.address,
            tradeFeeNumerator: newTradeFeeNumerator,
            tradeFeeDenominator: newTradeFeeDenominator,
        });
        expect(changeFeesResult.transactions).toHaveTransaction({
            from: commonSender.address,
            to: bcJettonMinter.address,
            aborted: true,
        });
    });
});
