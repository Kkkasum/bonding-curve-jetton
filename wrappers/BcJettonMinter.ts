import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    toNano,
    TupleItemSlice,
} from '@ton/core';

export type JettonMinterContent = {
    type: 0 | 1;
    uri: string;
};

export type BcJettonMinterConfig = {
    totalSupply: bigint;
    adminAddress: Address;
    content: Cell;
    jettonWalletCode: Cell;
    tonCollected: bigint;
    maxTon: bigint;
    bcSupply: bigint;
    liqSupply: bigint;
    authorAddress: Address;
    feeAddress: Address;
    tradeFeeNumerator: number;
    tradeFeeDenominator: number;
    tradingEnabled: number;
    routerAddress: Address;
    routerPtonWalletAddress: Address;
};

export function jettonContentToCell(content: JettonMinterContent) {
    return beginCell().storeUint(content.type, 8).storeStringTail(content.uri).endCell();
}

export function bcJettonMinterConfigToCell(config: BcJettonMinterConfig): Cell {
    return beginCell()
        .storeCoins(config.totalSupply)
        .storeAddress(config.adminAddress)
        .storeRef(config.content)
        .storeRef(config.jettonWalletCode)
        .storeCoins(config.tonCollected)
        .storeCoins(config.maxTon)
        .storeRef(
            beginCell()
                .storeCoins(config.bcSupply)
                .storeCoins(config.liqSupply)
                .storeAddress(config.authorAddress)
                .storeAddress(config.feeAddress)
                .storeUint(config.tradeFeeNumerator, 16)
                .storeUint(config.tradeFeeDenominator, 16)
                .storeBit(config.tradingEnabled)
                .storeRef(
                    beginCell()
                        .storeAddress(config.routerAddress)
                        .storeAddress(config.routerPtonWalletAddress)
                        .endCell(),
                )
                .endCell(),
        )
        .endCell();
}

export class BcJettonMinter implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new BcJettonMinter(address);
    }

    static createFromConfig(config: BcJettonMinterConfig, code: Cell, workchain = 0) {
        const data = bcJettonMinterConfigToCell(config);
        const init = { code, data };
        return new BcJettonMinter(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendPurchase(provider: ContractProvider, via: Sender, opts: { value: bigint; minReceiveAmount: bigint }) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0x6117d13b, 32).storeUint(0, 64).endCell(),
        });
    }

    async sendSell(provider: ContractProvider, via: Sender, opts: { value: bigint }) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0x9b9ed07d, 32).storeUint(0, 64).endCell(),
        });
    }

    async sendMint(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            toAddress: Address;
            jettonAmount: bigint;
            forwardTonAmount: bigint;
            totalTonAmount: bigint;
        },
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x1674b0a0, 32)
                .storeUint(0, 64)
                .storeAddress(opts.toAddress)
                .storeCoins(opts.jettonAmount)
                .storeCoins(opts.forwardTonAmount)
                .storeCoins(opts.totalTonAmount)
                .endCell(),
        });
    }

    async sendProvideWalletAddress(
        provider: ContractProvider,
        via: Sender,
        opts: { owner: Address; includeAddress: boolean },
    ) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x2c76b973, 32)
                .storeUint(0, 64)
                .storeAddress(opts.owner)
                .storeBit(opts.includeAddress)
                .endCell(),
        });
    }

    async sendChangeAdmin(provider: ContractProvider, via: Sender, opts: { adminAddress: Address }) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0x4840664f, 32).storeUint(0, 64).storeAddress(opts.adminAddress).endCell(),
        });
    }

    async sendChangeContent(provider: ContractProvider, via: Sender, opts: { content: JettonMinterContent }) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x5773d1f5, 32)
                .storeUint(0, 64)
                .storeRef(jettonContentToCell(opts.content))
                .endCell(),
        });
    }

    async sendChangeAuthor(provider: ContractProvider, via: Sender, opts: { authorAddress: Address }) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0xb59e3558, 32).storeUint(0, 64).storeAddress(opts.authorAddress).endCell(),
        });
    }

    async sendChangeFees(
        provider: ContractProvider,
        via: Sender,
        opts: { feeAddress: Address; tradeFeeNumerator: number; tradeFeeDenominator: number },
    ) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0xc34488d7, 32)
                .storeUint(0, 64)
                .storeAddress(opts.feeAddress)
                .storeUint(opts.tradeFeeNumerator, 16)
                .storeUint(opts.tradeFeeDenominator, 16)
                .endCell(),
        });
    }

    async getJettonData(
        provider: ContractProvider,
    ): Promise<{ totalSupply: bigint; mintable: boolean; adminAddress: Address; content: Cell; walletCode: Cell }> {
        const res = await provider.get('get_jetton_data', []);
        const totalSupply = res.stack.readBigNumber();
        const mintable = res.stack.readBoolean();
        const adminAddress = res.stack.readAddress();
        const content = res.stack.readCell();
        const walletCode = res.stack.readCell();
        return {
            totalSupply,
            mintable,
            adminAddress,
            content,
            walletCode,
        };
    }

    async getTotalSupply(provider: ContractProvider): Promise<bigint> {
        const res = await this.getJettonData(provider);
        return res.totalSupply;
    }

    async getAdminAddress(provider: ContractProvider): Promise<Address> {
        const res = await this.getJettonData(provider);
        return res.adminAddress;
    }

    async getContent(provider: ContractProvider): Promise<Cell> {
        const res = await this.getJettonData(provider);
        return res.content;
    }

    async getWalletAddress(provider: ContractProvider, owner: Address): Promise<Address> {
        const res = await provider.get('get_wallet_address', [
            {
                type: 'slice',
                cell: beginCell().storeAddress(owner).endCell(),
            } as TupleItemSlice,
        ]);
        return res.stack.readAddress();
    }

    async getCoinPrice(provider: ContractProvider): Promise<bigint> {
        const res = await provider.get('get_coin_price', []);
        return res.stack.readBigNumber();
    }

    async getCoinsForTons(provider: ContractProvider, tons: bigint): Promise<{ fees: bigint; coins: bigint }> {
        const res = await provider.get('get_coins_for_tons', [{ type: 'int', value: tons }]);
        const fees = res.stack.readBigNumber();
        const coins = res.stack.readBigNumber();
        return { fees, coins };
    }

    async getTonsForCoins(provider: ContractProvider, coins: bigint): Promise<{ fees: bigint; tons: bigint }> {
        const res = await provider.get('get_tons_for_coins', [{ type: 'int', value: coins }]);
        const fees = res.stack.readBigNumber();
        const tons = res.stack.readBigNumber();
        return { fees, tons };
    }

    async getBcData(provider: ContractProvider) {
        const res = await provider.get('get_bc_data', []);
        const totalSupply = res.stack.readBigNumber();
        const adminAddress = res.stack.readAddress();
        const content = res.stack.readCell();
        const jettonWalletCode = res.stack.readCell();
        const tonCollected = res.stack.readBigNumber();
        const maxTon = res.stack.readBigNumber();
        const bcSupply = res.stack.readBigNumber();
        const liqSupply = res.stack.readBigNumber();
        const authorAddress = res.stack.readAddress();
        const feeAddress = res.stack.readAddress();
        const tradeFeeNumerator = res.stack.readNumber();
        const tradeFeeDenominator = res.stack.readNumber();
        const tradingEnabled = res.stack.readBoolean();
        const fullPriceTonFees = res.stack.readNumber();
        const fullPriceTonNeed = res.stack.readNumber();

        return {
            totalSupply,
            adminAddress,
            content,
            jettonWalletCode,
            tonCollected,
            maxTon,
            bcSupply,
            liqSupply,
            authorAddress,
            feeAddress,
            tradeFeeNumerator,
            tradeFeeDenominator,
            tradingEnabled,
            fullPriceTonFees,
            fullPriceTonNeed,
        };
    }

    async getAuthorAddress(provider: ContractProvider): Promise<Address> {
        const res = await this.getBcData(provider);
        return res.authorAddress;
    }

    async getFeeAddress(provider: ContractProvider): Promise<Address> {
        const res = await this.getBcData(provider);
        return res.feeAddress;
    }

    async getTradeFeeNumerator(provider: ContractProvider): Promise<number> {
        const res = await this.getBcData(provider);
        return res.tradeFeeNumerator;
    }

    async getTradeFeeDenominator(provider: ContractProvider): Promise<number> {
        const res = await this.getBcData(provider);
        return res.tradeFeeDenominator;
    }
}
