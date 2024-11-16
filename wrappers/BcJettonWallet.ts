import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type JettonWalletConfig = {
    ownerAddress: Address;
    jettonMasterAddress: Address;
    jettonWalletCode: Cell;
};

export const Opcodes = {
    transfer: 0xf8a7ea5,
    transferNotification: 0x7362d09c,
    internalTransfer: 0x178d4519,
    excess: 0xd53276db,
    burn: 0x595f07bc,
    burnNotification: 0x7bdd97de,
    sell: 0x9b9ed07d,
    withdrawTons: 0x6d8e5e3c,
    withdrawJettons: 0x768a50b2,
    provideWalletAddress: 0x2c76b973,
    takeWalletAddress: 0xd1735400,
    unlockWallet: 0xe3b6c66f,
    unlockWalletExcess: 0x92f9fa95,
};

export function jettonWalletConfigToCell(config: JettonWalletConfig): Cell {
    return beginCell()
        .storeUint(1, 1)
        .storeCoins(0)
        .storeAddress(config.ownerAddress)
        .storeAddress(config.jettonMasterAddress)
        .storeRef(config.jettonWalletCode)
        .endCell();
}

export class BcJettonWallet implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new BcJettonWallet(address);
    }

    static createFromConfig(config: JettonWalletConfig, code: Cell, workchain = 0) {
        const data = jettonWalletConfigToCell(config);
        const init = { code, data };
        return new BcJettonWallet(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendTransfer(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            toAddress: Address;
            queryId: number;
            fwdAmount: bigint;
            jettonAmount: bigint;
            fwdPayload: Cell;
        },
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.transfer, 32)
                .storeUint(opts.queryId, 64)
                .storeCoins(opts.jettonAmount)
                .storeAddress(opts.toAddress)
                .storeAddress(via.address)
                .storeUint(0, 1)
                .storeCoins(opts.fwdAmount)
                .storeUint(0, 1)
                .storeRef(opts.fwdPayload)
                .endCell(),
        });
    }

    async sendBurn(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            queryId: number;
            jettonAmount: bigint;
        },
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.burn, 32)
                .storeUint(opts.queryId, 64)
                .storeCoins(opts.jettonAmount)
                .storeAddress(via.address)
                .storeUint(0, 1)
                .endCell(),
        });
    }

    async sendSell(
        provider: ContractProvider,
        via: Sender,
        opts: { value: bigint; jettonAmount: bigint; minReceiveAmount: bigint },
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.sell, 32)
                .storeUint(0, 64)
                .storeCoins(opts.jettonAmount)
                // .storeCoins(opts.minReceiveAmount)
                .endCell(),
        });
    }

    async getBalance(provider: ContractProvider) {
        try {
            const result = await provider.get('get_wallet_data', []);
            return result.stack.readBigNumber();
        } catch (e) {
            return BigInt(0);
        }
    }
}
