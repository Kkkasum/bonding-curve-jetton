import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type LaunchConfig = {
    adminAddress: Address;
    launchFee: bigint;
    bcJettonMinterCode: Cell;
    bcJettonWalletCode: Cell;
    feeAddress: Address;
    routerAddress: Address;
    routerPtonWalletAddress: Address;
};

export function launchConfigToCell(config: LaunchConfig): Cell {
    return beginCell()
        .storeAddress(config.adminAddress)
        .storeCoins(config.launchFee)
        .storeRef(config.bcJettonMinterCode)
        .storeRef(config.bcJettonWalletCode)
        .storeAddress(config.feeAddress)
        .storeRef(beginCell().storeAddress(config.routerAddress).storeAddress(config.routerPtonWalletAddress).endCell())
        .endCell();
}

export class Launch implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new Launch(address);
    }

    static createFromConfig(config: LaunchConfig, code: Cell, workchain = 0) {
        const data = launchConfigToCell(config);
        const init = { code, data };
        return new Launch(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendLaunch(
        provider: ContractProvider,
        via: Sender,
        opts: { value: bigint; content: Cell; authorAddress: Address },
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x79b757f5, 32)
                .storeUint(0, 64)
                .storeRef(opts.content)
                .storeAddress(opts.authorAddress)
                .endCell(),
        });
    }

    async getLaunchData(provider: ContractProvider): Promise<{
        adminAddress: Address;
        launchFee: bigint;
        bcJettonMinterCode: Cell;
        bcJettonWalletCode: Cell;
        routerAddress: Address;
        routerPtonWalletAddress: Address;
    }> {
        const res = await provider.get('get_launch_data', []);
        const adminAddress = res.stack.readAddress();
        const launchFee = res.stack.readBigNumber();
        const bcJettonMinterCode = res.stack.readCell();
        const bcJettonWalletCode = res.stack.readCell();
        const routerAddress = res.stack.readAddress();
        const routerPtonWalletAddress = res.stack.readAddress();

        return {
            adminAddress,
            launchFee,
            bcJettonMinterCode,
            bcJettonWalletCode,
            routerAddress,
            routerPtonWalletAddress,
        };
    }
}
